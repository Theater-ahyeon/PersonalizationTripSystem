#pragma once
// 个性化旅游系统 - 核心数据结构与业务逻辑
// 包含：数据类型定义、景区管理、路线规划、场所查询、日记管理、美食推荐

#include "core/my_stl.h"
#include "core/trie.h"
#include "core/algorithm.h"
#include <string>
#include <sstream>
#include <ctime>

// ==================== 数据类型定义 ====================

// 景区/校园
struct Area {
    int id;
    std::string name;
    std::string category;   // "景区" 或 "校园"
    double heat;            // 热度
    double rating;          // 评分
    std::string description;
    std::string province;   // 省份

    Area() : id(0), heat(0), rating(0) {}
};

// 建筑物（景点、教学楼等）
struct Building {
    int id;
    int areaId;
    std::string name;
    std::string type;       // 景点、教学楼、办公楼、宿舍楼、博物馆
    int floors;             // 楼层数
    std::string description;
    int nodeId;             // 对应图中的节点ID

    Building() : id(0), areaId(0), floors(1), nodeId(-1) {}
};

// 室内房间
struct Room {
    int id;
    int buildingId;
    int floor;
    std::string name;       // 房间名/功能
    int nodeId;             // 室内图节点

    Room() : id(0), buildingId(0), floor(0), nodeId(-1) {}
};

// 服务设施
struct Facility {
    int id;
    int areaId;
    std::string name;
    std::string category;   // 商店、饭店、洗手间、图书馆、食堂、超市、咖啡馆
    int nodeId;             // 对应图中的节点

    Facility() : id(0), areaId(0), nodeId(-1) {}
};

// 图节点信息
struct GraphNode {
    int id;
    int areaId;
    std::string name;
    std::string type;       // building, facility, intersection
    double x, y;            // 坐标（用于距离计算）

    GraphNode() : id(0), areaId(0), x(0), y(0) {}
};

// 用户
struct User {
    int id;
    std::string username;
    std::string password;
    std::string nickname;
    std::string avatar;

    User() : id(0) {}
};

// 旅游日记
struct Diary {
    int id;
    int userId;
    std::string title;
    std::string content;
    std::string destination;
    int views;              // 浏览量=热度
    double rating;          // 平均评分
    int ratingCount;        // 评分人数
    double ratingSum;       // 评分总和
    bool compressed;        // 是否压缩
    std::string compressedData;
    std::string createTime;

    Diary() : id(0), userId(0), views(0), rating(0), ratingCount(0), ratingSum(0), compressed(false) {}
};

// 美食
struct Food {
    int id;
    int areaId;
    std::string name;
    std::string cuisine;    // 菜系
    std::string restaurant; // 饭店/窗口名
    double heat;
    double rating;
    double distance;        // 距景区中心距离

    Food() : id(0), areaId(0), heat(0), rating(0), distance(0) {}
};

// 室内导航结果
struct IndoorPathResult {
    MyVector<int> path;
    MyVector<std::string> instructions; // 导航指令
    bool found;

    IndoorPathResult() : found(false) {}
};

// ==================== 旅游系统核心类 ====================
class TourismSystem {
private:
    // 数据存储 - 使用自定义数据结构
    MyHashMap<int, Area> areas_;
    MyHashMap<int, Building> buildings_;
    MyHashMap<int, Room> rooms_;
    MyHashMap<int, Facility> facilities_;
    MyHashMap<int, User> users_;
    MyHashMap<int, Diary> diaries_;
    MyHashMap<int, Food> foods_;
    MyHashMap<int, GraphNode> graphNodes_;

    // 每个景区的图结构
    MyHashMap<int, MyGraph> areaGraphs_;

    // 室内导航图（每个建筑一个）
    MyHashMap<int, MyGraph> buildingGraphs_;

    // 索引：景区ID -> 建筑物列表
    MyHashMap<int, MyVector<int>> areaBuildings_;
    // 索引：景区ID -> 设施列表
    MyHashMap<int, MyVector<int>> areaFacilities_;
    // 索引：景区ID -> 美食列表
    MyHashMap<int, MyVector<int>> areaFoods_;
    // 索引：景区ID -> 图节点列表
    MyHashMap<int, MyVector<int>> areaNodes_;
    // 索引：建筑物ID -> 房间列表
    MyHashMap<int, MyVector<int>> buildingRooms_;

    // 日记全文检索Trie
    Trie diaryTrie_;

    // 自增ID
    int nextAreaId_ = 1;
    int nextBuildingId_ = 1;
    int nextRoomId_ = 1;
    int nextFacilityId_ = 1;
    int nextUserId_ = 1;
    int nextDiaryId_ = 1;
    int nextFoodId_ = 1;
    int nextNodeId_ = 1;

public:
    // ==================== 数据访问 ====================

    // 景区操作
    void addArea(const Area& area) {
        int id = area.id ? area.id : nextAreaId_++;
        Area a = area;
        a.id = id;
        areas_.insert(id, a);
        if (id >= nextAreaId_) nextAreaId_ = id + 1;
    }

    Area* getArea(int id) { return areas_.find(id); }
    const Area* getArea(int id) const { return areas_.find(id); }

    MyVector<Area> getAllAreas() const {
        MyVector<Area> result;
        areas_.forEach([&](int, const Area& a) { result.push_back(a); });
        return result;
    }

    // 建筑物操作
    void addBuilding(const Building& b) {
        int id = b.id ? b.id : nextBuildingId_++;
        Building bb = b;
        bb.id = id;
        buildings_.insert(id, bb);
        areaBuildings_[bb.areaId].push_back(id);
        if (id >= nextBuildingId_) nextBuildingId_ = id + 1;
    }

    Building* getBuilding(int id) { return buildings_.find(id); }
    const Building* getBuilding(int id) const { return buildings_.find(id); }

    MyVector<Building> getBuildingsByArea(int areaId) const {
        MyVector<Building> result;
        auto* list = areaBuildings_.find(areaId);
        if (list) {
            for (size_t i = 0; i < list->size(); i++) {
                auto* b = buildings_.find((*list)[i]);
                if (b) result.push_back(*b);
            }
        }
        return result;
    }

    // 房间操作
    void addRoom(const Room& r) {
        int id = r.id ? r.id : nextRoomId_++;
        Room rr = r;
        rr.id = id;
        rooms_.insert(id, rr);
        buildingRooms_[rr.buildingId].push_back(id);
        if (id >= nextRoomId_) nextRoomId_ = id + 1;
    }

    MyVector<Room> getRoomsByBuilding(int buildingId) const {
        MyVector<Room> result;
        auto* list = buildingRooms_.find(buildingId);
        if (list) {
            for (size_t i = 0; i < list->size(); i++) {
                auto* r = rooms_.find((*list)[i]);
                if (r) result.push_back(*r);
            }
        }
        return result;
    }

    // 设施操作
    void addFacility(const Facility& f) {
        int id = f.id ? f.id : nextFacilityId_++;
        Facility ff = f;
        ff.id = id;
        facilities_.insert(id, ff);
        areaFacilities_[ff.areaId].push_back(id);
        if (id >= nextFacilityId_) nextFacilityId_ = id + 1;
    }

    Facility* getFacility(int id) { return facilities_.find(id); }

    MyVector<Facility> getFacilitiesByArea(int areaId) const {
        MyVector<Facility> result;
        auto* list = areaFacilities_.find(areaId);
        if (list) {
            for (size_t i = 0; i < list->size(); i++) {
                auto* f = facilities_.find((*list)[i]);
                if (f) result.push_back(*f);
            }
        }
        return result;
    }

    // 图节点操作
    void addGraphNode(const GraphNode& n) {
        int id = n.id ? n.id : nextNodeId_++;
        GraphNode nn = n;
        nn.id = id;
        graphNodes_.insert(id, nn);
        areaNodes_[nn.areaId].push_back(id);
        if (id >= nextNodeId_) nextNodeId_ = id + 1;
    }

    GraphNode* getGraphNode(int id) { return graphNodes_.find(id); }
    const GraphNode* getGraphNode(int id) const { return graphNodes_.find(id); }

    MyVector<GraphNode> getGraphNodesByArea(int areaId) const {
        MyVector<GraphNode> result;
        auto* list = areaNodes_.find(areaId);
        if (list) {
            for (size_t i = 0; i < list->size(); i++) {
                auto* n = graphNodes_.find((*list)[i]);
                if (n) result.push_back(*n);
            }
        }
        return result;
    }

    // 设置景区图
    void setAreaGraph(int areaId, const MyGraph& graph) {
        areaGraphs_.insert(areaId, graph);
    }

    MyGraph* getAreaGraph(int areaId) { return areaGraphs_.find(areaId); }
    const MyGraph* getAreaGraph(int areaId) const { return areaGraphs_.find(areaId); }

    // 设置建筑室内图
    void setBuildingGraph(int buildingId, const MyGraph& graph) {
        buildingGraphs_.insert(buildingId, graph);
    }

    MyGraph* getBuildingGraph(int buildingId) { return buildingGraphs_.find(buildingId); }

    // 用户操作
    void addUser(const User& u) {
        int id = u.id ? u.id : nextUserId_++;
        User uu = u;
        uu.id = id;
        users_.insert(id, uu);
        if (id >= nextUserId_) nextUserId_ = id + 1;
    }

    User* getUser(int id) { return users_.find(id); }
    const User* getUser(int id) const { return users_.find(id); }

    User* login(const std::string& username, const std::string& password) {
        User* result = nullptr;
        users_.forEach([&](int, User& u) {
            if (u.username == username && u.password == password) result = &u;
        });
        return result;
    }

    // 日记操作
    void addDiary(const Diary& d) {
        int id = d.id ? d.id : nextDiaryId_++;
        Diary dd = d;
        dd.id = id;
        diaries_.insert(id, dd);
        if (id >= nextDiaryId_) nextDiaryId_ = id + 1;

        // 将日记内容分词后插入Trie（按2-gram分词）
        if (!dd.content.empty()) {
            for (size_t i = 0; i < dd.content.size(); i++) {
                if (i + 1 < dd.content.size()) {
                    diaryTrie_.insert(dd.content.substr(i, 2), id);
                }
            }
        }
        if (!dd.title.empty()) {
            for (size_t i = 0; i < dd.title.size(); i++) {
                if (i + 1 < dd.title.size()) {
                    diaryTrie_.insert(dd.title.substr(i, 2), id);
                }
            }
        }
    }

    Diary* getDiary(int id) { return diaries_.find(id); }
    const Diary* getDiary(int id) const { return diaries_.find(id); }

    MyVector<Diary> getAllDiaries() const {
        MyVector<Diary> result;
        diaries_.forEach([&](int, const Diary& d) { result.push_back(d); });
        return result;
    }

    void rateDiary(int id, double score) {
        auto* d = diaries_.find(id);
        if (d) {
            d->ratingSum += score;
            d->ratingCount++;
            d->rating = d->ratingSum / d->ratingCount;
        }
    }

    void viewDiary(int id) {
        auto* d = diaries_.find(id);
        if (d) d->views++;
    }

    void compressDiary(int id) {
        auto* d = diaries_.find(id);
        if (d && !d->compressed) {
            d->compressedData = huffmanCompress(d->content);
            d->compressed = true;
        }
    }

    void decompressDiary(int id) {
        auto* d = diaries_.find(id);
        if (d && d->compressed) {
            d->content = huffmanDecompress(d->compressedData);
            d->compressed = false;
        }
    }

    // 美食操作
    void addFood(const Food& f) {
        int id = f.id ? f.id : nextFoodId_++;
        Food ff = f;
        ff.id = id;
        foods_.insert(id, ff);
        areaFoods_[ff.areaId].push_back(id);
        if (id >= nextFoodId_) nextFoodId_ = id + 1;
    }

    Food* getFood(int id) { return foods_.find(id); }

    MyVector<Food> getFoodsByArea(int areaId) const {
        MyVector<Food> result;
        auto* list = areaFoods_.find(areaId);
        if (list) {
            for (size_t i = 0; i < list->size(); i++) {
                auto* f = foods_.find((*list)[i]);
                if (f) result.push_back(*f);
            }
        }
        return result;
    }

    // ==================== 业务逻辑 ====================

    // 获取景区列表（支持排序、过滤、TopK）
    MyVector<Area> getAreas(const std::string& sort, int topK,
                            const std::string& keyword, const std::string& category) const {
        MyVector<Area> result;
        areas_.forEach([&](int, const Area& a) {
            // 类别过滤
            if (!category.empty() && a.category != category) return;
            // 关键字过滤
            if (!keyword.empty() && a.name.find(keyword) == std::string::npos &&
                a.description.find(keyword) == std::string::npos) return;
            result.push_back(a);
        });

        // 排序
        if (sort == "heat") {
            topKSort(result, topK, [](const Area& a, const Area& b) { return a.heat > b.heat; });
        } else if (sort == "rating") {
            topKSort(result, topK, [](const Area& a, const Area& b) { return a.rating > b.rating; });
        } else {
            // 默认按热度
            topKSort(result, topK, [](const Area& a, const Area& b) { return a.heat > b.heat; });
        }

        return result;
    }

    // 推荐景区
    MyVector<Area> recommendAreas(const std::string& sort, int topK) const {
        return getAreas(sort, topK, "", "");
    }

    // 最短距离路径
    PathResult shortestPath(int areaId, int start, int end) const {
        auto* graph = areaGraphs_.find(areaId);
        if (!graph) return PathResult();
        return graph->shortestPath(start, end);
    }

    // 最短时间路径
    PathResult fastestPath(int areaId, int start, int end) const {
        auto* graph = areaGraphs_.find(areaId);
        if (!graph) return PathResult();
        return graph->fastestPath(start, end);
    }

    // 途经多点路径
    PathResult multipointPath(int areaId, int start, const MyVector<int>& waypoints) const {
        auto* graph = areaGraphs_.find(areaId);
        if (!graph) return PathResult();
        return graph->multipointPath(start, waypoints);
    }

    // 指定交通工具路径
    PathResult transportPath(int areaId, int start, int end, int transport) const {
        auto* graph = areaGraphs_.find(areaId);
        if (!graph) return PathResult();
        return graph->transportPath(start, end, transport);
    }

    // 室内导航
    IndoorPathResult indoorNavigation(int buildingId, int start, int end) const {
        IndoorPathResult result;
        auto* graph = buildingGraphs_.find(buildingId);
        if (!graph) return result;

        auto pr = graph->shortestPath(start, end);
        result.found = pr.found;
        result.path = pr.path;

        // 生成导航指令
        if (pr.found) {
            for (size_t i = 0; i < pr.path.size(); i++) {
                auto* node = graphNodes_.find(pr.path[i]);
                if (node) {
                    result.instructions.push_back("前往: " + node->name);
                }
            }
        }
        return result;
    }

    // 查找附近设施
    MyVector<Facility> findNearbyFacilities(int areaId, int nodeId, double range,
                                             const std::string& category) const {
        MyVector<Facility> result;
        auto* graph = areaGraphs_.find(areaId);
        if (!graph) return result;

        auto* startNode = graphNodes_.find(nodeId);
        if (!startNode) return result;

        auto facilities = getFacilitiesByArea(areaId);
        for (size_t i = 0; i < facilities.size(); i++) {
            const Facility& f = facilities[i];
            // 类别过滤
            if (!category.empty() && f.category != category) continue;

            // 使用图距离而非直线距离
            if (f.nodeId >= 0) {
                auto pr = graph->shortestPath(nodeId, f.nodeId);
                if (pr.found && pr.totalDistance <= range) {
                    Facility ff = f;
                    // 将距离存入name后面（通过临时变量）
                    result.push_back(ff);
                }
            }
        }

        // 按距离排序（简化：按节点ID排序，实际应按图距离）
        return result;
    }

    // 获取日记列表
    MyVector<Diary> getDiaries(const std::string& sort, int topK) const {
        MyVector<Diary> result = getAllDiaries();
        if (sort == "heat") {
            topKSort(result, topK, [](const Diary& a, const Diary& b) { return a.views > b.views; });
        } else if (sort == "rating") {
            topKSort(result, topK, [](const Diary& a, const Diary& b) { return a.rating > b.rating; });
        } else {
            topKSort(result, topK, [](const Diary& a, const Diary& b) { return a.views > b.views; });
        }
        return result;
    }

    // 按目的地搜索日记
    MyVector<Diary> searchDiaryByDestination(const std::string& dest) const {
        MyVector<Diary> result;
        diaries_.forEach([&](int, const Diary& d) {
            if (d.destination.find(dest) != std::string::npos) {
                result.push_back(d);
            }
        });
        return result;
    }

    // 按标题精确搜索日记
    MyVector<Diary> searchDiaryByTitle(const std::string& title) const {
        MyVector<Diary> result;
        diaries_.forEach([&](int, const Diary& d) {
            if (d.title == title) {
                result.push_back(d);
            }
        });
        return result;
    }

    // 全文检索日记（使用KMP算法）
    MyVector<Diary> searchDiaryByKeyword(const std::string& keyword) const {
        MyVector<Diary> result;
        diaries_.forEach([&](int, const Diary& d) {
            // 使用KMP算法在标题和内容中搜索
            auto titleMatches = kmpSearch(d.title, keyword);
            auto contentMatches = kmpSearch(d.content, keyword);
            auto destMatches = kmpSearch(d.destination, keyword);
            if (!titleMatches.empty() || !contentMatches.empty() || !destMatches.empty()) {
                result.push_back(d);
            }
        });
        return result;
    }

    // 获取美食列表
    MyVector<Food> getFoods(int areaId, const std::string& sort, int topK,
                            const std::string& cuisine, const std::string& keyword) const {
        MyVector<Food> result;
        auto foods = getFoodsByArea(areaId);
        for (size_t i = 0; i < foods.size(); i++) {
            const Food& f = foods[i];
            if (!cuisine.empty() && f.cuisine != cuisine) continue;
            if (!keyword.empty() && f.name.find(keyword) == std::string::npos &&
                f.restaurant.find(keyword) == std::string::npos) continue;
            result.push_back(f);
        }

        if (sort == "heat") {
            topKSort(result, topK, [](const Food& a, const Food& b) { return a.heat > b.heat; });
        } else if (sort == "rating") {
            topKSort(result, topK, [](const Food& a, const Food& b) { return a.rating > b.rating; });
        } else if (sort == "distance") {
            topKSort(result, topK, [](const Food& a, const Food& b) { return a.distance < b.distance; });
        } else {
            topKSort(result, topK, [](const Food& a, const Food& b) { return a.heat > b.heat; });
        }
        return result;
    }

    // Trie前缀搜索日记
    MyVector<Diary> searchDiaryByPrefix(const std::string& prefix) const {
        MyVector<Diary> result;
        auto ids = diaryTrie_.searchPrefix(prefix);
        for (size_t i = 0; i < ids.size(); i++) {
            int id = ids[i];
            // 去重检查
            bool dup = false;
            for (size_t j = 0; j < result.size(); j++) {
                if (result[j].id == id) { dup = true; break; }
            }
            if (!dup) {
                auto* d = diaries_.find(id);
                if (d) result.push_back(*d);
            }
        }
        return result;
    }

    // 计算编辑距离
    static int editDistance(const std::string& s1, const std::string& s2) {
        int m = (int)s1.size(), n = (int)s2.size();
        MyVector<MyVector<int>> dp(m + 1);
        for (int i = 0; i <= m; i++) {
            dp[i] = MyVector<int>(n + 1, 0);
            dp[i][0] = i;
        }
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1[i-1] == s2[j-1]) {
                    dp[i][j] = dp[i-1][j-1];
                } else {
                    int mn = dp[i-1][j];
                    if (dp[i][j-1] < mn) mn = dp[i][j-1];
                    if (dp[i-1][j-1] < mn) mn = dp[i-1][j-1];
                    dp[i][j] = 1 + mn;
                }
            }
        }
        return dp[m][n];
    }

    // 模糊查找美食（编辑距离）
    MyVector<Food> fuzzySearchFood(int areaId, const std::string& keyword, int maxDist = 2) const {
        MyVector<Food> result;
        auto foods = getFoodsByArea(areaId);
        for (size_t i = 0; i < foods.size(); i++) {
            const Food& f = foods[i];
            // 检查名称、菜系、饭店名
            if (f.name.find(keyword) != std::string::npos ||
                f.cuisine.find(keyword) != std::string::npos ||
                f.restaurant.find(keyword) != std::string::npos ||
                editDistance(f.name.substr(0, std::min((int)f.name.size(), (int)keyword.size())), keyword) <= maxDist) {
                result.push_back(f);
            }
        }
        return result;
    }

    // 获取景区图数据（节点和边信息，用于前端地图绘制）
    struct GraphEdgeInfo {
        int from, to;
        double distance;
        int transportType; // 1=步行, 2=自行车, 4=电瓶车
        double congestion;
        double idealSpeed;
    };

    MyVector<GraphNode> getAreaGraphNodes(int areaId) const {
        return getGraphNodesByArea(areaId);
    }

    MyVector<GraphEdgeInfo> getAreaGraphEdges(int areaId) const {
        MyVector<GraphEdgeInfo> result;
        auto* graph = areaGraphs_.find(areaId);
        if (!graph) return result;

        int n = graph->nodeCount();

        // 遍历所有边，只添加一次无向边（from < to）
        for (int u = 0; u < n; u++) {
            auto& neighbors = graph->neighbors(u);
            for (size_t i = 0; i < neighbors.size(); i++) {
                const Edge& e = neighbors[i];
                if (e.to > u) {
                    GraphEdgeInfo gei;
                    gei.from = u;
                    gei.to = e.to;
                    gei.distance = e.distance;
                    gei.transportType = e.transportType;
                    gei.congestion = e.congestion;
                    gei.idealSpeed = e.idealSpeed;
                    result.push_back(gei);
                }
            }
        }
        return result;
    }
};
