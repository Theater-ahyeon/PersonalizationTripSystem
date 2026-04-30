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

class RecommendService {
public:
    void run(DataManager& data) {
        std::cout << "???????? ??/??/???????: ";
        std::string pref;
        std::getline(std::cin, pref);
        MinHeap<ScoreItem, ScoreCmp> heap;
        for (const auto& s : data.spots) {
            double tagMatch = pref.empty() ? 0.5 :
                ((s.tags.find(pref) != std::string::npos || s.category.find(pref) != std::string::npos) ? 1.0 : 0.0);
            double score = 0.4 * s.rating + 0.4 * (s.heat / 1000.0) + 0.2 * tagMatch;
            if (heap.size() < 10) heap.push({score, s.id});
            else if (score > heap.top().score) {
                heap.pop();
                heap.push({score, s.id});
            }
        }
        auto items = heap.values();
        std::sort(items.begin(), items.end(), [](const auto& a, const auto& b) { return a.score > b.score; });
        std::cout << "\nTop-10 ????:\n";
        for (const auto& item : items) {
            Spot* s = data.findSpot(item.id);
            if (s) std::cout << s->id << ". " << s->name << " score=" << std::fixed << std::setprecision(2) << item.score << "\n";
        }
        int id = readInt("???????? id?0 ???: ");
        if (Spot* s = data.findSpot(id)) {
            ++s->heat;
            std::cout << s->name << " heat ???? " << s->heat << "\n";
        }
    }
};

class PathPlanner {
public:
    void run(DataManager& data) {
        std::cout << "1 ???????\n2 ??? OSM ????\n???: ";
        std::string c;
        std::getline(std::cin, c);
        if (c == "2") planOsmPath(data);
        else planSpotPath(data);
    }

private:
    void planSpotPath(DataManager& data) {
        listSpots(data);
        int start = readInt("?? id: ");
        int goal = readInt("?? id: ");
        std::cout << "???? walk/bike: ";
        std::string mode;
        std::getline(std::cin, mode);
        bool bike = trim(mode) == "bike";

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
        if (!total) {
            std::cout << "??????\n";
            return;
        }
        std::vector<int> path;
        for (int x = goal; x != start;) {
            path.push_back(x);
            int* p = prev.get(x);
            if (!p) break;
            x = *p;
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());

        std::cout << "????????=" << *total << ": ";
        for (size_t i = 0; i < path.size(); ++i) {
            Spot* s = data.findSpot(path[i]);
            if (s) {
                ++s->heat;
                std::cout << s->name;
            } else {
                std::cout << path[i];
            }
            if (i + 1 < path.size()) std::cout << " -> ";
        }
        std::cout << "\n";
    }

    void planOsmPath(DataManager& data) {
        if (data.osmNodes.empty() || data.osmEdges.empty()) {
            std::cout << "??? OSM ???????? cpp/data/osm_nodes.json ? osm_edges.json?\n";
            return;
        }
        std::cout << "OSM ????:\n";
        for (const auto& n : data.osmNodes) {
            std::cout << n.id << ". " << n.name << " [" << n.type << "] "
                      << n.lat << "," << n.lon << "\n";
        }
        int start = readInt("?? OSM node id: ");
        int goal = readInt("?? OSM node id: ");
        std::cout << "???? walk/bike: ";
        std::string mode;
        std::getline(std::cin, mode);
        mode = trim(mode);
        if (mode != "bike") mode = "walk";

        OsmNode* startNode = data.findOsmNode(start);
        OsmNode* goalNode = data.findOsmNode(goal);
        if (!startNode || !goalNode) {
            std::cout << "?????????\n";
            return;
        }

        HashMap<int, double> dist;
        HashMap<int, int> prev;
        HashMap<int, std::string> prevRoad;
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
                    prevRoad.insert(e.to, e.roadName);
                    heap.push({e.to, nd, nd + haversine(*next, *goalNode)});
                }
            }
        }

        double* total = dist.get(goal);
        if (!total) {
            std::cout << "??? OSM ???\n";
            return;
        }

        std::vector<int> path;
        for (int x = goal; x != start;) {
            path.push_back(x);
            int* p = prev.get(x);
            if (!p) break;
            x = *p;
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());

        std::cout << "OSM A* ??????=" << std::fixed << std::setprecision(1) << *total << " ?:\n";
        for (size_t i = 0; i < path.size(); ++i) {
            OsmNode* n = data.findOsmNode(path[i]);
            if (n) std::cout << "  " << n->id << " " << n->name;
            else std::cout << "  " << path[i];
            if (i > 0) {
                std::string* road = prevRoad.get(path[i]);
                if (road) std::cout << " via " << *road;
            }
            std::cout << "\n";
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

class SearchService {
public:
    void run(DataManager& data) {
        std::cout << "????????: ";
        std::string q;
        std::getline(std::cin, q);
        std::cout << "Trie ????:\n";
        for (const auto& word : data.trie.autocomplete(q, 10)) std::cout << "  " << word << "\n";

        HashMap<std::string, std::string> seen;
        std::vector<std::string> results;
        auto add = [&](const std::string& type, const std::string& name) {
            std::string key = type + ":" + name;
            if (!seen.contains(key)) {
                seen.insert(key, key);
                results.push_back(type + " - " + name);
            }
        };
        for (const auto& s : data.spots) {
            if (kmpContains(s.name, q) || kmpContains(s.tags, q) || kmpContains(s.category, q)) add("??", s.name);
        }
        for (const auto& r : data.restaurants) {
            if (kmpContains(r.name, q) || kmpContains(r.cuisine, q)) add("??", r.name);
        }
        std::sort(results.begin(), results.end());
        std::cout << "KMP ????:\n";
        for (const auto& r : results) std::cout << "  " << r << "\n";
    }
};

class DiaryService {
public:
    void run(DataManager& data) {
        std::cout << "1 ???\n2 ????\n3 ????\n???: ";
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
        std::cout << "??: ";
        std::getline(std::cin, d.title);
        if (trim(d.title).empty()) d.title = "?????";
        d.rating = readDouble("????? 4.5?: ", 4.5);
        std::cout << "??????????? Huffman ?????: ";
        std::getline(std::cin, d.content);
        if (d.content.empty()) {
            std::cout << "?????????????\n";
            return;
        }
        d.heat = 0;
        d.createdAt = currentTime();
        data.diaries.push_back(d);
        data.writeDiary(d);
        fs::path jsonPath = data.dataDir() / "diaries" / (std::to_string(d.id) + ".json");
        fs::path binPath = data.dataDir() / "diaries" / (std::to_string(d.id) + ".bin");
        std::cout << "????? Huffman ?????\n";
        std::cout << "???: " << jsonPath.string() << "\n";
        std::cout << "????: " << binPath.string() << "\n";
    }

    void listDiaries(DataManager& data) {
        if (data.diaries.empty()) {
            std::cout << "??????????????\n";
            return;
        }
        std::multimap<double, Diary, std::greater<double>> ordered;
        for (const auto& d : data.diaries) ordered.insert({d.rating, d});
        for (const auto& p : ordered) {
            std::cout << p.second.id << ". " << p.second.title << " rating=" << p.second.rating
                      << " created=" << p.second.createdAt << "\n";
            std::cout << "   " << p.second.content << "\n";
        }
    }

    void searchDiaries(DataManager& data) {
        std::cout << "???: ";
        std::string q;
        std::getline(std::cin, q);
        for (const auto& d : data.diaries) {
            if (kmpContains(d.title, q) || kmpContains(d.content, q)) {
                std::cout << d.id << ". " << d.title << " -> " << d.content << "\n";
            }
        }
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
        int spotId = readInt("???? id: ");
        MinHeap<ScoreItem, ScoreCmp> heap;
        for (const auto& r : data.restaurants) {
            if (r.nearSpotId != spotId) continue;
            double score = 0.4 * r.rating + 0.4 * (r.heat / 1000.0);
            if (heap.size() < 5) heap.push({score, r.id});
            else if (score > heap.top().score) {
                heap.pop();
                heap.push({score, r.id});
            }
        }
        auto items = heap.values();
        std::sort(items.begin(), items.end(), [](const auto& a, const auto& b) { return a.score > b.score; });
        if (items.empty()) {
            std::cout << "??????????\n";
            return;
        }
        for (const auto& item : items) {
            Restaurant* r = data.findRestaurant(item.id);
            if (r) std::cout << r->id << ". " << r->name << " [" << r->cuisine << "] score=" << item.score << "\n";
        }
        int id = readInt("???? id?0 ???: ");
        if (Restaurant* r = data.findRestaurant(id)) {
            ++r->heat;
            std::cout << r->name << " heat ???? " << r->heat << "\n";
        }
    }
};

} // namespace tripsystem
