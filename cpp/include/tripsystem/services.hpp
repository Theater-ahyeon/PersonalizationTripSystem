#pragma once

#include "tripsystem/data_manager.hpp"
#include "tripsystem/structures.hpp"
#include "tripsystem/utils.hpp"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <ctime>
#include <functional>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <sstream>
#include <string>
#include <vector>

namespace tripsystem {

inline int readInt(const std::string& prompt) {
    std::cout << prompt;
    std::string s;
    std::getline(std::cin, s);
    try { return std::stoi(s); } catch (...) { return 0; }
}

inline double readDouble(const std::string& prompt, double def) {
    std::cout << prompt;
    std::string s;
    std::getline(std::cin, s);
    if (trim(s).empty()) return def;
    try { return std::stod(s); } catch (...) { return def; }
}

inline void listSpots(const DataManager& data) {
    for (const auto& s : data.spots) {
        std::cout << s.id << ". " << s.name << " [" << s.category
                  << "] rating=" << s.rating << " heat=" << s.heat << "\n";
    }
}

inline double normalizedHeat(int heat) {
    return std::min(1.0, heat / 1000.0);
}

struct ScoreItem {
    double score = 0;
    int id = 0;
};

struct ScoreCmp {
    bool operator()(const ScoreItem& a, const ScoreItem& b) const {
        return a.score < b.score;
    }
};

struct PathState {
    int node = 0;
    double dist = 0;
    double priority = 0;
};

struct PathCmp {
    bool operator()(const PathState& a, const PathState& b) const {
        return a.priority < b.priority;
    }
};

struct SpotPathResult {
    bool found = false;
    double total = 0;
    std::vector<int> nodes;
};

class RecommendService {
public:
    void run(DataManager& data) {
        std::cout << "请输入偏好标签（如 自然/夜景/亲子，可留空）: ";
        std::string pref;
        std::getline(std::cin, pref);
        pref = trim(pref);

        MinHeap<ScoreItem, ScoreCmp> heap;
        for (const auto& s : data.spots) {
            double tagMatch = tagScore(s, pref);
            double score = 0.4 * s.rating + 0.4 * normalizedHeat(s.heat) + 0.2 * tagMatch;
            if (heap.size() < 10) heap.push({score, s.id});
            else if (score > heap.top().score) {
                heap.pop();
                heap.push({score, s.id});
            }
        }

        auto items = heap.values();
        std::sort(items.begin(), items.end(), [](const auto& a, const auto& b) { return a.score > b.score; });

        std::cout << "\nTop-10 景点推荐（评分0.4 + 热度0.4 + 标签0.2）:\n";
        std::cout << "排名  名称           分类   评分  热度  标签匹配  综合分\n";
        int rank = 1;
        for (const auto& item : items) {
            Spot* s = data.findSpot(item.id);
            if (!s) continue;
            std::cout << std::setw(2) << rank++ << "    "
                      << std::left << std::setw(12) << s->name
                      << std::setw(6) << s->category
                      << std::right << std::fixed << std::setprecision(1) << std::setw(4) << s->rating
                      << "  " << std::setw(4) << s->heat
                      << "  " << std::setw(6) << std::setprecision(2) << tagScore(*s, pref)
                      << "  " << std::setw(6) << item.score << "\n";
        }

        int id = readInt("输入要点击的景点 id（0 跳过）: ");
        if (Spot* s = data.findSpot(id)) {
            ++s->heat;
            std::cout << s->name << " 的 heat 已更新为 " << s->heat << "\n";
        }
    }

private:
    static double tagScore(const Spot& s, const std::string& pref) {
        if (pref.empty()) return 0.5;
        if (s.tags.find(pref) != std::string::npos) return 1.0;
        if (s.category.find(pref) != std::string::npos) return 0.8;
        if (s.name.find(pref) != std::string::npos) return 0.6;
        return 0.0;
    }
};

class PathPlanner {
public:
    void run(DataManager& data) {
        std::cout << "1 景点最短路径 / Spot shortest path\n"
                  << "2 OSM 路径规划 / OSM route\n"
                  << "3 多点游览 / TSP multi-stop\n请选择: ";
        std::string c;
        std::getline(std::cin, c);
        if (c == "1") planSpotPath(data);
        else if (c == "2") planOsmPath(data);
        else if (c == "3") planMultiStopPath(data);
        else std::cout << "无效路径规划选项。\n";
    }

private:
    void planSpotPath(DataManager& data) {
        listSpots(data);
        int start = readInt("起点 id: ");
        int goal = readInt("终点 id: ");
        if (!data.findSpot(start) || !data.findSpot(goal)) {
            std::cout << "起点或终点不存在。\n";
            return;
        }
        bool bike = readBikeMode();

        SpotPathResult path = shortestSpotPath(data, start, goal, bike);
        if (!path.found) {
            std::cout << "未找到路径。\n";
            return;
        }
        printSpotPath(data, path, bike, "Spot shortest path");
        touchSpotHeat(data, path.nodes);
    }

    void planMultiStopPath(DataManager& data) {
        listSpots(data);
        int start = readInt("起点 id: ");
        if (!data.findSpot(start)) {
            std::cout << "起点不存在。\n";
            return;
        }

        std::cout << "目标景点 id 列表（空格分隔，最多 12 个）: ";
        std::string line;
        std::getline(std::cin, line);
        std::vector<int> targets = parseTargetIds(line, start);
        if (targets.empty()) {
            std::cout << "目标景点为空。\n";
            return;
        }
        if (targets.size() > 12) {
            std::cout << "目标景点数量超过 12，TSP 状态压缩 DP 不再计算。\n";
            return;
        }
        for (int id : targets) {
            if (!data.findSpot(id)) {
                std::cout << "目标景点不存在: " << id << "\n";
                return;
            }
        }
        bool bike = readBikeMode();

        std::vector<int> points;
        points.push_back(start);
        points.insert(points.end(), targets.begin(), targets.end());

        const double inf = std::numeric_limits<double>::infinity();
        size_t m = points.size();
        std::vector<std::vector<double>> dist(m, std::vector<double>(m, inf));
        std::vector<std::vector<SpotPathResult>> paths(m, std::vector<SpotPathResult>(m));

        for (size_t i = 0; i < m; ++i) {
            for (size_t j = 0; j < m; ++j) {
                if (i == j) {
                    dist[i][j] = 0;
                    paths[i][j] = {true, 0, {points[i]}};
                    continue;
                }
                paths[i][j] = shortestSpotPath(data, points[i], points[j], bike);
                if (!paths[i][j].found) {
                    std::cout << "存在不可达点对: " << spotName(data, points[i])
                              << " -> " << spotName(data, points[j]) << "\n";
                    return;
                }
                dist[i][j] = paths[i][j].total;
            }
        }

        int n = static_cast<int>(targets.size());
        int fullMask = (1 << n) - 1;
        std::vector<std::vector<double>> dp(1 << n, std::vector<double>(n, inf));
        std::vector<std::vector<int>> parent(1 << n, std::vector<int>(n, -1));

        for (int i = 0; i < n; ++i) dp[1 << i][i] = dist[0][i + 1];
        for (int mask = 1; mask <= fullMask; ++mask) {
            for (int last = 0; last < n; ++last) {
                if (!(mask & (1 << last)) || dp[mask][last] == inf) continue;
                for (int next = 0; next < n; ++next) {
                    if (mask & (1 << next)) continue;
                    int nextMask = mask | (1 << next);
                    double nd = dp[mask][last] + dist[last + 1][next + 1];
                    if (nd < dp[nextMask][next]) {
                        dp[nextMask][next] = nd;
                        parent[nextMask][next] = last;
                    }
                }
            }
        }

        int bestEnd = -1;
        double best = inf;
        for (int i = 0; i < n; ++i) {
            if (dp[fullMask][i] < best) {
                best = dp[fullMask][i];
                bestEnd = i;
            }
        }
        if (bestEnd < 0) {
            std::cout << "多点游览计算失败。\n";
            return;
        }

        std::vector<int> order;
        for (int mask = fullMask, cur = bestEnd; cur >= 0;) {
            order.push_back(cur);
            int prev = parent[mask][cur];
            mask ^= (1 << cur);
            cur = prev;
        }
        std::reverse(order.begin(), order.end());

        std::cout << "TSP multi-stop route (" << modeName(bike) << ")\n";
        std::cout << "Visit order: " << spotName(data, start);
        for (int idx : order) std::cout << " -> " << spotName(data, targets[idx]);
        std::cout << "\n";

        double total = 0;
        int fromIndex = 0;
        int segment = 1;
        for (int targetIndex : order) {
            int toIndex = targetIndex + 1;
            const SpotPathResult& leg = paths[fromIndex][toIndex];
            total += leg.total;
            std::cout << "Segment " << segment++ << ": "
                      << spotName(data, points[fromIndex]) << " -> "
                      << spotName(data, points[toIndex])
                      << ", distance=" << std::fixed << std::setprecision(1)
                      << leg.total << " meters, cumulative=" << total << " meters\n";
            printSpotPath(data, leg, bike, "Spot shortest path segment");
            touchSpotHeat(data, leg.nodes);
            fromIndex = toIndex;
        }
        std::cout << "TSP multi-stop total=" << std::fixed << std::setprecision(1)
                  << total << " meters\n";
    }

    static SpotPathResult shortestSpotPath(DataManager& data, int start, int goal, bool bike) {
        HashMap<int, double> dist;
        HashMap<int, int> prev;
        MinHeap<PathState, PathCmp> heap;
        dist.insert(start, 0);
        heap.push({start, 0, 0});
        while (!heap.empty()) {
            auto cur = heap.pop();
            double* best = dist.get(cur.node);
            if (!best || std::abs(*best - cur.dist) > 1e-9) continue;
            if (cur.node == goal) break;
            for (const auto& e : data.graph.neighbors(cur.node)) {
                double w = bike ? e.distBike : e.distWalk;
                double nd = cur.dist + w;
                double* old = dist.get(e.to);
                if (!old || nd < *old) {
                    dist.insert(e.to, nd);
                    prev.insert(e.to, cur.node);
                    heap.push({e.to, nd, nd});
                }
            }
        }

        double* total = dist.get(goal);
        if (!total) return {};
        std::vector<int> path;
        for (int x = goal; x != start;) {
            path.push_back(x);
            int* p = prev.get(x);
            if (!p) return {};
            x = *p;
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());
        return {true, *total, path};
    }

    void planOsmPath(DataManager& data) {
        if (data.osmNodes.empty() || data.osmEdges.empty()) {
            std::cout << "未找到 OSM 离线数据，请检查 cpp/data/osm_nodes.json 和 osm_edges.json。\n";
            return;
        }
        std::cout << "OSM 节点列表:\n";
        for (const auto& n : data.osmNodes) {
            std::cout << n.id << ". " << n.name << " [" << n.type << "] "
                      << n.lat << "," << n.lon << "\n";
        }
        int start = readInt("起点 OSM node id: ");
        int goal = readInt("终点 OSM node id: ");
        bool bike = readBikeMode();
        std::string mode = modeName(bike);

        OsmNode* startNode = data.findOsmNode(start);
        OsmNode* goalNode = data.findOsmNode(goal);
        if (!startNode || !goalNode) {
            std::cout << "起点或终点不存在。\n";
            return;
        }

        HashMap<int, double> dist;
        HashMap<int, int> prev;
        MinHeap<PathState, PathCmp> heap;
        dist.insert(start, 0);
        heap.push({start, 0, haversine(*startNode, *goalNode)});

        while (!heap.empty()) {
            auto cur = heap.pop();
            double* best = dist.get(cur.node);
            if (!best || std::abs(*best - cur.dist) > 1e-9) continue;
            if (cur.node == goal) break;

            const auto* edges = data.osmNeighbors(cur.node);
            if (!edges) continue;
            for (const auto& e : *edges) {
                if (!edgeSupportsMode(e, mode)) continue;
                OsmNode* next = data.findOsmNode(e.to);
                if (!next) continue;
                double nd = cur.dist + e.distance;
                double* old = dist.get(e.to);
                if (!old || nd < *old) {
                    dist.insert(e.to, nd);
                    prev.insert(e.to, cur.node);
                    heap.push({e.to, nd, nd + haversine(*next, *goalNode)});
                }
            }
        }

        double* total = dist.get(goal);
        if (!total) {
            std::cout << "未找到 OSM 路径。\n";
            return;
        }

        std::vector<int> path;
        for (int x = goal; x != start;) {
            path.push_back(x);
            int* p = prev.get(x);
            if (!p) {
                std::cout << "OSM 路径回溯失败。\n";
                return;
            }
            x = *p;
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());
        printOsmPath(data, path, *total, mode);
    }

    static void printSpotPath(DataManager& data, const SpotPathResult& path, bool bike, const std::string& title) {
        std::cout << title << " (" << modeName(bike) << "), total="
                  << std::fixed << std::setprecision(1) << path.total << " meters:\n";
        if (path.nodes.empty()) return;
        std::cout << "  0. " << spotName(data, path.nodes.front()) << " cumulative=0.0 meters\n";
        double cumulative = 0;
        for (size_t i = 1; i < path.nodes.size(); ++i) {
            int from = path.nodes[i - 1];
            int to = path.nodes[i];
            const Road* road = data.graph.edgeBetween(from, to);
            double segment = road ? (bike ? road->distBike : road->distWalk) : 0;
            cumulative += segment;
            std::cout << "  " << i << ". " << spotName(data, from)
                      << " -> " << spotName(data, to)
                      << " via road#" << from << "-" << to
                      << " mode=" << modeName(bike)
                      << " segment=" << segment
                      << " cumulative=" << cumulative << " meters\n";
        }
    }

    static void touchSpotHeat(DataManager& data, const std::vector<int>& path) {
        for (int id : path) {
            Spot* s = data.findSpot(id);
            if (s) ++s->heat;
        }
    }

    static std::vector<int> parseTargetIds(const std::string& line, int start) {
        std::vector<int> targets;
        std::stringstream ss(line);
        int id = 0;
        while (ss >> id) {
            if (id == start) continue;
            if (std::find(targets.begin(), targets.end(), id) == targets.end()) {
                targets.push_back(id);
            }
        }
        return targets;
    }

    static bool readBikeMode() {
        std::cout << "交通方式 walk/bike: ";
        std::string mode;
        std::getline(std::cin, mode);
        mode = trim(mode);
        return mode == "bike";
    }

    static std::string modeName(bool bike) {
        return bike ? "bike" : "walk";
    }

    static std::string spotName(DataManager& data, int id) {
        Spot* s = data.findSpot(id);
        return s ? s->name : std::to_string(id);
    }

    static const OsmEdge* findOsmEdge(DataManager& data, int from, int to, const std::string& mode) {
        const auto* edges = data.osmNeighbors(from);
        if (!edges) return nullptr;
        for (const auto& e : *edges) {
            if (e.to == to && edgeSupportsMode(e, mode)) return &e;
        }
        return nullptr;
    }

    static void printOsmPath(DataManager& data, const std::vector<int>& path, double total, const std::string& mode) {
        std::cout << "OSM A* path (" << mode << "), total="
                  << std::fixed << std::setprecision(1) << total << " meters:\n";
        double cumulative = 0;
        for (size_t i = 0; i < path.size(); ++i) {
            OsmNode* n = data.findOsmNode(path[i]);
            std::cout << "  " << i << ". ";
            if (i == 0) {
                if (n) std::cout << n->id << " " << n->name;
                else std::cout << path[i];
                std::cout << " cumulative=0.0 meters\n";
                continue;
            }
            const OsmEdge* edge = findOsmEdge(data, path[i - 1], path[i], mode);
            double segment = edge ? edge->distance : 0;
            cumulative += segment;
            OsmNode* prevNode = data.findOsmNode(path[i - 1]);
            std::cout << (prevNode ? prevNode->name : std::to_string(path[i - 1]))
                      << " -> " << (n ? n->name : std::to_string(path[i]))
                      << " via " << (edge ? edge->roadName : "unknown road")
                      << " mode=" << mode
                      << " segment=" << segment
                      << " cumulative=" << cumulative << " meters\n";
        }
    }

    static bool edgeSupportsMode(const OsmEdge& e, const std::string& mode) {
        return e.mode == "both" || e.mode == mode;
    }

    static double haversine(const OsmNode& a, const OsmNode& b) {
        constexpr double earthRadiusMeters = 6371000.0;
        constexpr double pi = 3.14159265358979323846;
        auto rad = [](double deg) { return deg * pi / 180.0; };
        double dLat = rad(b.lat - a.lat);
        double dLon = rad(b.lon - a.lon);
        double lat1 = rad(a.lat);
        double lat2 = rad(b.lat);
        double h = std::sin(dLat / 2) * std::sin(dLat / 2) +
                   std::cos(lat1) * std::cos(lat2) *
                   std::sin(dLon / 2) * std::sin(dLon / 2);
        return 2 * earthRadiusMeters * std::asin(std::min(1.0, std::sqrt(h)));
    }
};

struct SearchResult {
    int priority = 0;
    double rating = 0;
    int heat = 0;
    std::string type;
    std::string name;
    std::string detail;
};

class SearchService {
public:
    void run(DataManager& data) {
        std::cout << "请输入前缀或关键词: ";
        std::string q;
        std::getline(std::cin, q);
        q = trim(q);
        if (q.empty()) {
            std::cout << "关键词为空，请输入景点名、分类、标签、餐厅名或菜系。\n";
            return;
        }

        std::cout << "\nTrie 自动补全建议:\n";
        auto suggestions = data.trie.autocomplete(q, 10);
        if (suggestions.empty()) std::cout << "  无补全建议\n";
        for (const auto& word : suggestions) std::cout << "  " << word << "\n";

        HashMap<std::string, std::string> seen;
        std::vector<SearchResult> results;
        auto add = [&](const SearchResult& result) {
            std::string key = result.type + ":" + result.name;
            if (!seen.contains(key)) {
                seen.insert(key, key);
                results.push_back(result);
            }
        };

        for (const auto& s : data.spots) {
            bool nameHit = kmpContains(s.name, q);
            bool categoryHit = kmpContains(s.category, q);
            bool tagHit = kmpContains(s.tags, q);
            if (nameHit || categoryHit || tagHit) {
                add({nameHit ? 0 : (categoryHit ? 1 : 2), s.rating, s.heat, "景点", s.name,
                     "分类=" + s.category + " 标签=" + s.tags});
            }
        }
        for (const auto& r : data.restaurants) {
            bool nameHit = kmpContains(r.name, q);
            bool cuisineHit = kmpContains(r.cuisine, q);
            if (nameHit || cuisineHit) {
                add({nameHit ? 0 : 3, r.rating, r.heat, "餐厅", r.name,
                     "菜系=" + r.cuisine + " 附近景点id=" + std::to_string(r.nearSpotId)});
            }
        }

        std::sort(results.begin(), results.end(), [](const SearchResult& a, const SearchResult& b) {
            if (a.priority != b.priority) return a.priority < b.priority;
            if (a.rating != b.rating) return a.rating > b.rating;
            if (a.heat != b.heat) return a.heat > b.heat;
            return a.name < b.name;
        });

        std::cout << "\nKMP 搜索结果（按匹配类型、评分、热度排序）:\n";
        if (results.empty()) {
            std::cout << "  未找到匹配结果。\n";
            return;
        }
        int rank = 1;
        for (const auto& r : results) {
            std::cout << rank++ << ". [" << r.type << "] " << r.name
                      << " rating=" << std::fixed << std::setprecision(1) << r.rating
                      << " heat=" << r.heat << " " << r.detail << "\n";
        }
    }
};

class DiaryService {
public:
    void run(DataManager& data) {
        std::cout << "1 写日记\n2 浏览日记\n3 搜索日记\n请选择: ";
        std::string c;
        std::getline(std::cin, c);
        if (c == "1") writeDiary(data);
        else if (c == "2") listDiaries(data);
        else if (c == "3") searchDiaries(data);
    }

private:
    void writeDiary(DataManager& data) {
        Diary d;
        d.id = data.nextDiaryId();
        std::cout << "标题（可留空）: ";
        std::getline(std::cin, d.title);
        if (trim(d.title).empty()) d.title = "未命名日记";
        d.rating = readDouble("评分 0-5（默认 4.5）: ", 4.5);
        if (d.rating < 0) d.rating = 0;
        if (d.rating > 5) d.rating = 5;
        std::cout << "正文（单行输入，将使用 Huffman 编码压缩）: ";
        std::getline(std::cin, d.content);
        if (trim(d.content).empty()) {
            std::cout << "正文为空，本次不写入日记。\n";
            return;
        }
        d.heat = 0;
        d.createdAt = currentTime();
        data.diaries.push_back(d);
        data.writeDiary(d);
        fs::path jsonPath = data.dataDir() / "diaries" / (std::to_string(d.id) + ".json");
        fs::path binPath = data.dataDir() / "diaries" / (std::to_string(d.id) + ".bin");
        std::cout << "日记已完成 Huffman 编码压缩。\n";
        std::cout << "元数据: " << jsonPath.string() << "\n";
        std::cout << "压缩正文: " << binPath.string() << "\n";
    }

    void listDiaries(DataManager& data) {
        if (data.diaries.empty()) {
            std::cout << "暂无日记，请先写入一篇日记。\n";
            return;
        }
        std::multimap<double, Diary, std::greater<double>> ordered;
        for (const auto& d : data.diaries) ordered.insert({d.rating, d});
        std::cout << "日记列表（按评分降序）:\n";
        for (const auto& p : ordered) {
            const Diary& d = p.second;
            std::cout << d.id << ". " << d.title << " rating=" << d.rating
                      << " created=" << d.createdAt;
            if (!d.decodeOk) std::cout << " [" << d.loadMessage << "]";
            std::cout << "\n   " << summary(d.content) << "\n";
        }
    }

    void searchDiaries(DataManager& data) {
        std::cout << "关键词: ";
        std::string q;
        std::getline(std::cin, q);
        q = trim(q);
        if (q.empty()) {
            std::cout << "关键词为空。\n";
            return;
        }
        bool any = false;
        for (const auto& d : data.diaries) {
            if (kmpContains(d.title, q) || kmpContains(d.content, q)) {
                std::cout << d.id << ". " << d.title << " -> " << summary(d.content) << "\n";
                any = true;
            }
        }
        if (!any) std::cout << "未找到匹配日记。\n";
    }

    static std::string summary(const std::string& content) {
        if (content.empty()) return "（无可展示正文）";
        constexpr size_t limit = 72;
        if (content.size() <= limit) return content;
        return content.substr(0, limit) + "...";
    }

    static std::string currentTime() {
        auto now = std::chrono::system_clock::now();
        std::time_t t = std::chrono::system_clock::to_time_t(now);
        std::tm tm{};
#ifdef _WIN32
        localtime_s(&tm, &t);
#else
        localtime_r(&t, &tm);
#endif
        std::ostringstream out;
        out << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
        return out.str();
    }
};

class FoodService {
public:
    void run(DataManager& data) {
        listSpots(data);
        int spotId = readInt("当前景点 id: ");
        std::cout << "菜系偏好（如 小吃/甜品/咖啡，可留空）: ";
        std::string cuisinePref;
        std::getline(std::cin, cuisinePref);
        cuisinePref = trim(cuisinePref);

        MinHeap<ScoreItem, ScoreCmp> heap;
        for (const auto& r : data.restaurants) {
            if (r.nearSpotId != spotId) continue;
            double cuisineMatch = cuisineScore(r, cuisinePref);
            double score = 0.5 * r.rating + 0.3 * normalizedHeat(r.heat) + 0.2 * cuisineMatch;
            if (heap.size() < 5) heap.push({score, r.id});
            else if (score > heap.top().score) {
                heap.pop();
                heap.push({score, r.id});
            }
        }
        auto items = heap.values();
        std::sort(items.begin(), items.end(), [](const auto& a, const auto& b) { return a.score > b.score; });
        if (items.empty()) {
            std::cout << "该景点暂无附近餐厅。\n";
            return;
        }
        std::cout << "Top-5 美食推荐（评分0.5 + 热度0.3 + 菜系0.2）:\n";
        int rank = 1;
        for (const auto& item : items) {
            Restaurant* r = data.findRestaurant(item.id);
            if (!r) continue;
            std::cout << rank++ << ". " << r->name << " [" << r->cuisine << "] rating="
                      << std::fixed << std::setprecision(1) << r->rating
                      << " heat=" << r->heat
                      << " cuisineMatch=" << std::setprecision(2) << cuisineScore(*r, cuisinePref)
                      << " score=" << item.score << "\n";
        }
        int id = readInt("选择餐厅 id（0 跳过）: ");
        if (Restaurant* r = data.findRestaurant(id)) {
            ++r->heat;
            std::cout << r->name << " 的 heat 已更新为 " << r->heat << "\n";
        }
    }

private:
    static double cuisineScore(const Restaurant& r, const std::string& pref) {
        if (pref.empty()) return 0.5;
        if (r.cuisine.find(pref) != std::string::npos) return 1.0;
        if (r.name.find(pref) != std::string::npos) return 0.6;
        return 0.0;
    }
};

} // namespace tripsystem
