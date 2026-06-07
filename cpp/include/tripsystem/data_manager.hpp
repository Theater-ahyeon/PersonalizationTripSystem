#pragma once

#include "tripsystem/models.hpp"
#include "tripsystem/structures.hpp"
#include "tripsystem/utils.hpp"

#include <algorithm>
#include <cmath>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace tripsystem {

struct HuffNode {
    unsigned char ch = 0;
    int freq = 0;
    HuffNode* left = nullptr;
    HuffNode* right = nullptr;
};

struct HuffCmp {
    bool operator()(HuffNode* a, HuffNode* b) const {
        return a->freq < b->freq;
    }
};

inline void freeHuff(HuffNode* n) {
    if (!n) return;
    freeHuff(n->left);
    freeHuff(n->right);
    delete n;
}

inline void buildCodes(HuffNode* n, const std::string& prefix, std::vector<std::pair<int, std::string>>& codes) {
    if (!n) return;
    if (!n->left && !n->right) {
        codes.push_back({static_cast<int>(n->ch), prefix.empty() ? "0" : prefix});
        return;
    }
    buildCodes(n->left, prefix + "0", codes);
    buildCodes(n->right, prefix + "1", codes);
}

class DataManager {
    fs::path dataDir_;

public:
    std::vector<Spot> spots;
    std::vector<Road> roads;
    std::vector<OsmNode> osmNodes;
    std::vector<OsmEdge> osmEdges;
    std::vector<IndoorBuilding> indoorBuildings;
    std::vector<Restaurant> restaurants;
    std::vector<User> users;
    std::vector<Diary> diaries;
    int currentUserId = 1;
    HashMap<int, size_t> spotById;
    HashMap<int, size_t> osmNodeById;
    HashMap<int, std::vector<OsmEdge>> osmAdj;
    HashMap<int, size_t> restaurantById;
    Trie trie;
    Graph graph;

    explicit DataManager(fs::path dataDir) : dataDir_(std::move(dataDir)) {}

    const fs::path& dataDir() const { return dataDir_; }

    void load() {
        fs::create_directories(dataDir_);
        fs::create_directories(dataDir_ / "diaries");
        if (!fs::exists(dataDir_ / "spots.json") ||
            !fs::exists(dataDir_ / "roads.json") ||
            !fs::exists(dataDir_ / "osm_nodes.json") ||
            !fs::exists(dataDir_ / "osm_edges.json") ||
            !fs::exists(dataDir_ / "restaurants.json")) {
            generateSampleData();
            save();
        }
        loadSpots();
        loadRoads();
        loadOsm();
        loadIndoorBuildings();
        loadRestaurants();
        loadUsers();
        if (users.empty()) {
            generateSampleUsers();
            saveUsers();
        }
        if (!findUser(currentUserId) && !users.empty()) currentUserId = users.front().id;
        loadDiaries();
        if (diaries.empty()) {
            generateSampleDiaries();
            loadDiaries();
        }
        if (spots.empty() || roads.empty() || restaurants.empty()) {
            // Parse may have failed; regenerate in-memory but DO NOT overwrite disk files.
            // The user can explicitly save on exit if they accept the sample data.
            generateSampleData();
            std::cout << "警告：部分数据文件解析失败，已使用样本数据。原始文件未被修改。\n";
        }
        buildIndexes();
    }

    void save() const {
        saveSpots();
        saveRoads();
        saveOsm();
        saveRestaurants();
        saveUsers();
    }

    Spot* findSpot(int id) {
        auto* idx = spotById.get(id);
        if (!idx) return nullptr;
        return &spots[*idx];
    }

    OsmNode* findOsmNode(int id) {
        auto* idx = osmNodeById.get(id);
        if (!idx) return nullptr;
        return &osmNodes[*idx];
    }

    const std::vector<OsmEdge>* osmNeighbors(int id) const {
        return osmAdj.get(id);
    }

    IndoorBuilding* findIndoorBuilding(const std::string& id) {
        for (auto& building : indoorBuildings) {
            if (building.id == id) return &building;
        }
        return nullptr;
    }

    const IndoorBuilding* findIndoorBuilding(const std::string& id) const {
        for (const auto& building : indoorBuildings) {
            if (building.id == id) return &building;
        }
        return nullptr;
    }

    Restaurant* findRestaurant(int id) {
        auto* idx = restaurantById.get(id);
        if (!idx) return nullptr;
        return &restaurants[*idx];
    }

    int nextDiaryId() const {
        int mx = 0;
        for (const auto& d : diaries) mx = std::max(mx, d.id);
        return mx + 1;
    }

    int nextUserId() const {
        int mx = 0;
        for (const auto& u : users) mx = std::max(mx, u.id);
        return std::max(10, mx) + 1;
    }

    User* findUser(int id) {
        for (auto& user : users) {
            if (user.id == id) return &user;
        }
        return nullptr;
    }

    const User* findUser(int id) const {
        for (const auto& user : users) {
            if (user.id == id) return &user;
        }
        return nullptr;
    }

    const User* currentUser() const {
        return findUser(currentUserId);
    }

    std::string currentUserLabel() const {
        const User* user = currentUser();
        if (!user) return "Guest (ID 1)";
        return user->name + " (ID " + std::to_string(user->id) + ")";
    }

    bool setCurrentUser(int id) {
        if (!findUser(id)) return false;
        currentUserId = id;
        return true;
    }

    User registerUser(const std::string& name, const std::vector<std::string>& tags, const std::string& routeMode) {
        User user;
        user.id = nextUserId();
        user.name = trim(name).empty() ? ("User" + std::to_string(user.id)) : trim(name);
        user.preferenceTags = tags.empty() ? std::vector<std::string>{"history", "photo"} : tags;
        user.preferredCategories = user.preferenceTags;
        if (user.preferredCategories.size() > 2) user.preferredCategories.resize(2);
        user.routeMode = (routeMode == "bike") ? "bike" : "walk";
        users.push_back(user);
        currentUserId = user.id;
        saveUsers();
        return user;
    }

    bool deleteDiary(int diaryId) {
        for (auto it = diaries.begin(); it != diaries.end(); ++it) {
            if (it->id != diaryId) continue;
            if (it->userId != currentUserId) return false;
            fs::remove(dataDir_ / "diaries" / (std::to_string(diaryId) + ".json"));
            fs::remove(dataDir_ / "diaries" / (std::to_string(diaryId) + ".bin"));
            diaries.erase(it);
            return true;
        }
        return false;
    }

    void writeDiary(const Diary& diary) {
        std::vector<std::pair<int, std::string>> codes;
        int bitLength = 0;
        std::vector<unsigned char> packed = encodeHuffman(diary.content, codes, bitLength);
        fs::path jsonPath = dataDir_ / "diaries" / (std::to_string(diary.id) + ".json");
        fs::path binPath = dataDir_ / "diaries" / (std::to_string(diary.id) + ".bin");

        std::ofstream bin(binPath, std::ios::binary);
        for (unsigned char b : packed) bin.put(static_cast<char>(b));

        std::ostringstream js;
        js << "{\n";
        js << "  \"id\": " << diary.id << ",\n";
        js << "  \"title\": \"" << escapeJson(diary.title) << "\",\n";
        js << "  \"user_id\": " << diary.userId << ",\n";
        js << "  \"rating\": " << diary.rating << ",\n";
        js << "  \"heat\": " << diary.heat << ",\n";
        js << "  \"created_at\": \"" << escapeJson(diary.createdAt) << "\",\n";
        js << "  \"original_bytes\": " << diary.content.size() << ",\n";
        js << "  \"compressed_bytes\": " << packed.size() << ",\n";
        js << "  \"bit_length\": " << bitLength << ",\n";
        js << "  \"codebook\": [";
        for (size_t i = 0; i < codes.size(); ++i) {
            if (i) js << ", ";
            js << "{\"ch\": " << codes[i].first << ", \"code\": \"" << codes[i].second << "\"}";
        }
        js << "]\n}\n";
        writeText(jsonPath, js.str());
    }

private:
    void buildIndexes() {
        spotById.clear();
        osmNodeById.clear();
        osmAdj.clear();
        restaurantById.clear();
        trie.reset();
        graph.clear();
        for (size_t i = 0; i < spots.size(); ++i) {
            spotById.insert(spots[i].id, i);
            trie.insert(spots[i].name);
        }
        for (size_t i = 0; i < restaurants.size(); ++i) {
            restaurantById.insert(restaurants[i].id, i);
            trie.insert(restaurants[i].name);
        }
        for (const auto& r : roads) {
            graph.addEdge(r);
            Road back{r.to, r.from, r.distWalk, r.distBike};
            graph.addEdge(back);
        }
        for (size_t i = 0; i < osmNodes.size(); ++i) {
            osmNodeById.insert(osmNodes[i].id, i);
        }
        for (const auto& e : osmEdges) {
            auto* list = osmAdj.get(e.from);
            if (!list) osmAdj.insert(e.from, std::vector<OsmEdge>{e});
            else list->push_back(e);
        }
    }

    void generateSampleData() {
        spots = {
            {1, "颐和园东宫门", "出入口", 4.7, 1180, "入口,交通,服务"},
            {2, "仁寿殿", "建筑", 4.6, 960, "建筑,历史,室内"},
            {3, "德和园", "建筑", 4.5, 880, "戏楼,建筑,文化"},
            {4, "长廊东口", "道路", 4.8, 1320, "步行,彩画,路线"},
            {5, "排云门", "道路", 4.4, 840, "中转,登高,路线"},
            {6, "佛香阁", "景点", 4.9, 1410, "地标,观景,拍照"},
            {7, "石舫", "景点", 4.6, 990, "湖岸,拍照,休闲"},
            {8, "苏州街入口", "文化", 4.5, 1060, "文化,购物,美食"},
            {9, "北宫门", "出入口", 4.3, 820, "返程,交通,服务"},
            {10, "万寿山后湖", "自然", 4.4, 760, "安静,湖景,休闲"},
            {11, "昆明湖东堤", "道路", 4.7, 1120, "湖景,步行,骑行"},
            {12, "知春亭", "景点", 4.5, 870, "湖景,摄影,轻松"},
            {13, "十七孔桥", "景点", 4.9, 1380, "桥梁,夕阳,摄影"},
            {14, "南湖岛", "自然", 4.6, 920, "湖区,环线,拍照"},
            {15, "西堤", "道路", 4.4, 740, "长线,低拥挤,徒步"},
            {16, "谐趣园", "园林", 4.7, 930, "园林,安静,文化"},
            {17, "乐寿堂", "建筑", 4.5, 850, "建筑,历史,室内"},
            {18, "文昌院", "文化", 4.4, 710, "展陈,文物,雨天"},
            {19, "铜牛广场", "服务", 4.2, 640, "休息,拍照,补给"},
            {20, "新建宫门", "出入口", 4.3, 730, "入口,交通,服务"},
            {21, "智慧导览服务中心", "服务", 4.3, 780, "咨询,导览,入口"},
            {22, "长廊彩画讲解点", "文化", 4.5, 840, "彩画,讲解,历史"},
            {23, "昆明湖观景台", "观景", 4.7, 1010, "湖景,拍照,休闲"},
            {24, "后湖安静步道", "自然", 4.4, 690, "徒步,低拥挤,树荫"}
        };
        roads = {
            {1, 2, 180, 140}, {2, 17, 120, 95}, {17, 3, 110, 85}, {3, 4, 220, 170},
            {4, 5, 300, 230}, {5, 6, 90, 70}, {6, 7, 360, 280}, {7, 8, 480, 370},
            {8, 9, 210, 160}, {8, 10, 280, 220}, {10, 16, 260, 200}, {16, 3, 330, 250},
            {1, 18, 180, 140}, {18, 12, 230, 180}, {12, 11, 260, 200}, {11, 19, 460, 350},
            {19, 13, 240, 190}, {13, 14, 180, 140}, {14, 15, 760, 590}, {15, 7, 880, 680},
            {11, 4, 520, 400}, {20, 19, 300, 230}, {20, 13, 420, 320}, {1, 12, 240, 190},
            {21, 1, 90, 75}, {22, 4, 120, 95}, {23, 11, 80, 65}, {24, 10, 110, 90}
        };
        restaurants.clear();
        const std::vector<std::string> cuisines = {"北京菜", "小吃", "咖啡", "面食", "甜品", "简餐", "茶饮", "烤鸭", "素食", "家常菜"};
        for (int i = 1; i <= 50; ++i) {
            int spotId = 1 + ((i - 1) % 20);
            std::string cuisine = cuisines[(i - 1) % static_cast<int>(cuisines.size())];
            restaurants.push_back({i, spots[spotId - 1].name + cuisine + "推荐点", spotId, cuisine, 4.0 + ((i * 7) % 10) / 10.0, 300 + ((i * 91) % 760)});
        }

        osmNodes = {
            {1, "颐和园东宫门", 39.9973, 116.2753, "gate", 1, "颐和园东宫门是游客入园和路线规划的主要起点。", "web/assets/spots/visitor-center.svg"},
            {2, "仁寿殿", 39.9994, 116.2740, "building", 2, "仁寿殿是清代皇家园林的政务活动空间。", "web/assets/spots/museum.svg"},
            {3, "德和园", 39.9987, 116.2720, "building", 3, "德和园适合对戏曲、建筑和历史感兴趣的游客。", "web/assets/spots/bookstore.svg"},
            {4, "长廊东口", 39.9982, 116.2695, "path", 4, "长廊是颐和园步行游览的核心通道。", "web/assets/spots/cherry-road.svg"},
            {5, "排云门", 39.9991, 116.2665, "junction", 5, "排云门是前往佛香阁和昆明湖的重要节点。", "web/assets/spots/lakeside-plaza.svg"},
            {6, "佛香阁", 39.9997, 116.2662, "landmark", 6, "佛香阁是颐和园标志性建筑。", "web/assets/spots/view-tower.svg"},
            {7, "石舫", 40.0007, 116.2630, "landmark", 7, "石舫位于昆明湖北岸，适合拍照和休息。", "web/assets/spots/pier.svg"},
            {8, "苏州街入口", 40.0046, 116.2638, "poi", 8, "苏州街入口适合文化体验、美食和文创购物推荐。", "web/assets/spots/folk-street.svg"},
            {9, "北宫门", 40.0061, 116.2636, "gate", 9, "北宫门适合作为返程或多点游览终点。", "web/assets/spots/visitor-center.svg"},
            {10, "万寿山后湖", 40.0048, 116.2676, "waterfront", 10, "后湖区域适合避开高峰人流的休闲路线。", "web/assets/spots/wetland.svg"},
            {11, "昆明湖东堤", 39.9926, 116.2715, "path", 11, "昆明湖东堤视野开阔，适合拍照和骑行。", "web/assets/spots/lakeside-plaza.svg"},
            {12, "知春亭", 39.9949, 116.2739, "landmark", 12, "知春亭连接东宫门和湖岸景观。", "web/assets/spots/wetland.svg"},
            {13, "十七孔桥", 39.9887, 116.2772, "bridge", 13, "十七孔桥是昆明湖最具辨识度的桥梁景观。", "web/assets/spots/view-tower.svg"},
            {14, "南湖岛", 39.9893, 116.2753, "island", 14, "南湖岛适合安排湖区环线。", "web/assets/spots/pier.svg"},
            {15, "西堤", 39.9928, 116.2608, "path", 15, "西堤适合长距离步行和低拥挤度路线。", "web/assets/spots/bamboo.svg"},
            {16, "谐趣园", 40.0023, 116.2706, "garden", 16, "谐趣园有江南园林风格。", "web/assets/spots/bamboo.svg"},
            {17, "乐寿堂", 39.9989, 116.2727, "building", 17, "乐寿堂靠近核心建筑群。", "web/assets/spots/museum.svg"},
            {18, "文昌院", 39.9966, 116.2769, "museum", 18, "文昌院适合室内展陈和雨天备选路线。", "web/assets/spots/bookstore.svg"},
            {19, "铜牛广场", 39.9910, 116.2777, "square", 19, "铜牛广场可作为十七孔桥和东堤之间的休息点。", "web/assets/spots/camp-lawn.svg"},
            {20, "新建宫门", 39.9904, 116.2818, "gate", 20, "新建宫门适合作为南侧入园起点。", "web/assets/spots/visitor-center.svg"}
        };
        osmEdges.clear();
        auto addOsmEdge = [&](int from, int to, double distance, const std::string& name) {
            osmEdges.push_back({from, to, distance, "both", name});
            osmEdges.push_back({to, from, distance, "both", name});
        };
        for (const auto& r : roads) {
            if (r.from <= 20 && r.to <= 20) addOsmEdge(r.from, r.to, r.distWalk, "颐和园景点路");
        }
        const int baseId = 21;
        const int rows = 13;
        const int cols = 16;
        for (int r = 0; r < rows; ++r) {
            for (int c = 0; c < cols; ++c) {
                int id = baseId + r * cols + c;
                double lat = 39.9855 + r * 0.00082;
                double lon = 116.2560 + c * 0.00172;
                osmNodes.push_back({id, "颐和园备用路网节点", lat, lon, (r + c) % 3 == 0 ? "path" : "road", 0, "缺少外部数据文件时生成的颐和园备用路网节点。", "web/assets/spots/visitor-center.svg"});
                if (c > 0) addOsmEdge(id - 1, id, 145, "备用东西向道路");
                if (r > 0) addOsmEdge(id - cols, id, 92, "备用南北向道路");
            }
        }
        for (int i = 1; i <= 20; ++i) {
            int fallback = baseId + (i % rows) * cols + (i % cols);
            addOsmEdge(i, fallback, 80 + i * 3, "景点接入备用路网");
        }
        return;
        spots = {
            {1, "太湖广场", "自然", 4.8, 1200, "湖泊,广场,拍照"},
            {2, "樱花大道", "自然", 4.7, 980, "花海,步行,拍照"},
            {3, "历史博物馆", "文化", 4.6, 860, "历史,展览,室内"},
            {4, "观景塔", "观景", 4.9, 1100, "登高,夜景,地标"},
            {5, "水上码头", "休闲", 4.5, 740, "游船,亲水,休闲"},
            {6, "儿童乐园", "亲子", 4.4, 690, "亲子,娱乐"},
            {7, "竹林步道", "自然", 4.6, 820, "徒步,清静,森林"},
            {8, "民俗街", "文化", 4.3, 760, "非遗,购物,小吃"},
            {9, "音乐喷泉", "休闲", 4.7, 930, "夜景,表演,广场"},
            {10, "游客中心", "服务", 4.2, 500, "咨询,入口,服务"},
            {11, "湿地花园", "自然", 4.5, 650, "湿地,观鸟,生态"},
            {12, "文创书店", "文化", 4.4, 580, "阅读,文创,室内"},
            {13, "露营草坪", "休闲", 4.6, 720, "露营,草坪,亲子"},
            {14, "运动驿站", "服务", 4.1, 430, "骑行,补给,服务"}
        };
        roads = {
            {1, 2, 300, 120}, {2, 3, 420, 180}, {3, 4, 380, 150}, {4, 5, 500, 220},
            {5, 6, 280, 110}, {6, 7, 360, 160}, {7, 8, 450, 190}, {8, 9, 320, 130},
            {9, 10, 260, 100}, {1, 10, 700, 310}, {2, 7, 620, 260}, {3, 8, 560, 240},
            {4, 9, 470, 200}, {1, 5, 900, 380}, {10, 11, 340, 140}, {11, 12, 410, 180},
            {12, 13, 360, 150}, {13, 14, 290, 120}, {14, 7, 520, 210}, {5, 11, 430, 170},
            {6, 13, 480, 200}, {8, 12, 300, 130}
        };
        // OSM road data mirrors cpp/data/osm_nodes.json and cpp/data/osm_edges.json.
        // The first 12 nodes are named course-demo anchors; nodes 13+ are real OpenStreetMap road nodes fetched by web/scripts/generate-osm-data.mjs.
        osmNodes = {
            {1, "OSM游客中心", 31.491, 120.311, "gate", 10, "游客中心是园区入口和服务枢纽，适合作为路线起点。", "web/assets/spots/visitor-center.svg"},
            {2, "湖滨步道入口", 31.4918, 120.3132, "path", 1, "湖滨步道连接太湖广场和樱花大道，适合步行观景。", "web/assets/spots/lakeside-plaza.svg"},
            {3, "樱花路口", 31.4932, 120.315, "junction", 2, "樱花路口是自然景观和文化线路的交汇点。", "web/assets/spots/cherry-road.svg"},
            {4, "博物馆北门", 31.4944, 120.3164, "poi", 3, "历史博物馆北门靠近展览区，适合室内参观。", "web/assets/spots/museum.svg"},
            {5, "观景塔南侧", 31.4957, 120.3181, "poi", 4, "观景塔南侧可俯瞰湖岸与夜景，是热门打卡点。", "web/assets/spots/view-tower.svg"},
            {6, "码头环岛", 31.4964, 120.3202, "junction", 5, "码头环岛连接亲水栈道和骑行环线。", "web/assets/spots/pier.svg"},
            {7, "竹林小径", 31.4948, 120.3211, "path", 7, "竹林小径安静清凉，适合慢行和短暂停留。", "web/assets/spots/bamboo.svg"},
            {8, "民俗街口", 31.4933, 120.3196, "poi", 8, "民俗街口聚集小吃、文创和非遗展示。", "web/assets/spots/folk-street.svg"},
            {9, "湿地观景台", 31.4924, 120.3224, "poi", 11, "湿地观景台适合观鸟和生态讲解。", "web/assets/spots/wetland.svg"},
            {10, "露营草坪口", 31.4908, 120.3208, "poi", 13, "露营草坪口视野开阔，适合亲子休闲。", "web/assets/spots/camp-lawn.svg"},
            {11, "文创书店门口", 31.4921, 120.3177, "poi", 12, "文创书店门口适合休息、阅读和购买纪念品。", "web/assets/spots/bookstore.svg"},
            {12, "运动驿站", 31.4905, 120.3158, "service", 14, "运动驿站提供骑行补给和路线咨询。", "web/assets/spots/sports-station.svg"},
            {13, "小径节点1", 31.492669, 120.315848, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228086，关联道路：贡湖大道。", "web/assets/spots/visitor-center.svg"},
            {14, "小径节点2", 31.492001, 120.31609, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228087，关联道路：贡湖大道。", "web/assets/spots/lakeside-plaza.svg"},
            {15, "小径节点3", 31.494717, 120.31492, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6944125135，关联道路：贡湖大道。", "web/assets/spots/cherry-road.svg"},
            {16, "小径节点4", 31.491948, 120.31612, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204513，关联道路：小径。", "web/assets/spots/museum.svg"},
            {17, "小径节点5", 31.495093, 120.314705, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228085，关联道路：贡湖大道。", "web/assets/spots/view-tower.svg"},
            {18, "小径节点6", 31.491854, 120.316171, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204514，关联道路：贡湖大道。", "web/assets/spots/pier.svg"},
            {19, "服务路节点7", 31.49522, 120.314609, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10923509750，关联道路：贡湖大道。", "web/assets/spots/bamboo.svg"},
            {20, "小径节点8", 31.491828, 120.316185, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 3031403609，关联道路：贡湖大道。", "web/assets/spots/folk-street.svg"},
            {21, "服务路节点9", 31.495362, 120.314541, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994226983，关联道路：贡湖大道。", "web/assets/spots/wetland.svg"},
            {22, "小径节点10", 31.49165, 120.316254, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8099322176，关联道路：贡湖大道。", "web/assets/spots/camp-lawn.svg"},
            {23, "服务路节点11", 31.495698, 120.314291, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437125，关联道路：贡湖大道。", "web/assets/spots/bookstore.svg"},
            {24, "小径节点12", 31.491613, 120.316267, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127929，关联道路：贡湖大道。", "web/assets/spots/sports-station.svg"},
            {25, "三级道路节点13", 31.491628, 120.316161, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8099322177，关联道路：和畅路。", "web/assets/spots/visitor-center.svg"},
            {26, "三级道路节点14", 31.492249, 120.319187, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2063856423，关联道路：兴梁道。", "web/assets/spots/lakeside-plaza.svg"},
            {27, "服务路节点15", 31.496355, 120.313865, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437124，关联道路：贡湖大道。", "web/assets/spots/cherry-road.svg"},
            {28, "小径节点16", 31.491394, 120.316351, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 3031405733，关联道路：贡湖大道。", "web/assets/spots/museum.svg"},
            {29, "三级道路节点17", 31.49159, 120.31618, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127928，关联道路：和畅路。", "web/assets/spots/view-tower.svg"},
            {30, "三级道路节点18", 31.492226, 120.319194, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127932，关联道路：兴梁道。", "web/assets/spots/pier.svg"},
            {31, "三级道路节点19", 31.491587, 120.315986, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2409619513，关联道路：和畅路。", "web/assets/spots/bamboo.svg"},
            {32, "三级道路节点20", 31.492258, 120.319228, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162808，关联道路：和畅路。", "web/assets/spots/folk-street.svg"},
            {33, "三级道路节点21", 31.495715, 120.318082, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430895790，关联道路：兴梁道。", "web/assets/spots/wetland.svg"},
            {34, "居住区道路节点22", 31.496555, 120.31369, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064057，关联道路：居住区道路。", "web/assets/spots/camp-lawn.svg"},
            {35, "小径节点23", 31.4904, 120.316771, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228088，关联道路：贡湖大道。", "web/assets/spots/bookstore.svg"},
            {36, "三级道路节点24", 31.491549, 120.316002, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127927，关联道路：和畅路。", "web/assets/spots/sports-station.svg"},
            {37, "三级道路节点25", 31.488796, 120.320203, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6559841064，关联道路：兴梁道。", "web/assets/spots/visitor-center.svg"},
            {38, "三级道路节点26", 31.492233, 120.319236, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991216599，关联道路：兴梁道。", "web/assets/spots/lakeside-plaza.svg"},
            {39, "服务路节点27", 31.491565, 120.315897, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8099322178，关联道路：贡湖大道。", "web/assets/spots/cherry-road.svg"},
            {40, "三级道路节点28", 31.493027, 120.323004, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5306714022，关联道路：和畅路。", "web/assets/spots/museum.svg"},
            {41, "三级道路节点29", 31.495727, 120.318154, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162807，关联道路：兴梁道。", "web/assets/spots/view-tower.svg"},
            {42, "三级道路节点30", 31.495865, 120.318038, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2409577788，关联道路：兴梁道。", "web/assets/spots/pier.svg"},
            {43, "居住区道路节点31", 31.496611, 120.314053, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064056，关联道路：居住区道路。", "web/assets/spots/bamboo.svg"},
            {44, "服务路节点32", 31.497612, 120.312768, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437123，关联道路：贡湖大道。", "web/assets/spots/folk-street.svg"},
            {45, "小径节点33", 31.490121, 120.3169, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228089，关联道路：贡湖大道。", "web/assets/spots/wetland.svg"},
            {46, "服务路节点34", 31.491528, 120.315912, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127926，关联道路：贡湖大道。", "web/assets/spots/camp-lawn.svg"},
            {47, "三级道路节点35", 31.488809, 120.320262, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162809，关联道路：兴梁道。", "web/assets/spots/bookstore.svg"},
            {48, "三级道路节点36", 31.492993, 120.323011, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127933，关联道路：和畅路。", "web/assets/spots/sports-station.svg"},
            {49, "居住区道路节点37", 31.49131, 120.314637, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072484，关联道路：居住区道路。", "web/assets/spots/visitor-center.svg"},
            {50, "服务路节点38", 31.491736, 120.315833, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204508，关联道路：贡湖大道。", "web/assets/spots/lakeside-plaza.svg"},
            {51, "三级道路节点39", 31.493061, 120.323176, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 1692647895，关联道路：和畅路。", "web/assets/spots/cherry-road.svg"},
            {52, "三级道路节点40", 31.495877, 120.318111, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162806，关联道路：兴梁道。", "web/assets/spots/museum.svg"},
            {53, "居住区道路节点41", 31.497028, 120.317666, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7507219846，关联道路：居住区道路。", "web/assets/spots/view-tower.svg"},
            {54, "居住区道路节点42", 31.497015, 120.316031, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064055，关联道路：居住区道路。", "web/assets/spots/pier.svg"},
            {55, "服务路节点43", 31.498395, 120.312048, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 9016243787，关联道路：贡湖大道。", "web/assets/spots/bamboo.svg"},
            {56, "小径节点44", 31.489953, 120.316971, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410505865，关联道路：贡湖大道。", "web/assets/spots/folk-street.svg"},
            {57, "三级道路节点45", 31.491277, 120.314643, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127924，关联道路：和畅路。", "web/assets/spots/wetland.svg"},
            {58, "小径节点46", 31.491288, 120.315999, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228099，关联道路：贡湖大道。", "web/assets/spots/camp-lawn.svg"},
            {59, "三级道路节点47", 31.493026, 120.323182, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127934，关联道路：和畅路。", "web/assets/spots/bookstore.svg"},
            {60, "步行路节点48", 31.491054, 120.313325, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071678，关联道路：步行路。", "web/assets/spots/sports-station.svg"},
            {61, "居住区道路节点49", 31.491462, 120.314589, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072485，关联道路：居住区道路。", "web/assets/spots/visitor-center.svg"},
            {62, "服务路节点50", 31.491844, 120.315797, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228098，关联道路：贡湖大道。", "web/assets/spots/lakeside-plaza.svg"},
            {63, "三级道路节点51", 31.493593, 120.325739, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5457928506，关联道路：和畅路。", "web/assets/spots/cherry-road.svg"},
            {64, "三级道路节点52", 31.497017, 120.317707, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162805，关联道路：兴梁道。", "web/assets/spots/museum.svg"},
            {65, "居住区道路节点53", 31.497111, 120.317087, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7507219847，关联道路：居住区道路。", "web/assets/spots/view-tower.svg"},
            {66, "三级道路节点54", 31.497565, 120.317504, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6413776686，关联道路：兴梁道。", "web/assets/spots/pier.svg"},
            {67, "居住区道路节点55", 31.497042, 120.316173, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064054，关联道路：居住区道路。", "web/assets/spots/bamboo.svg"},
            {68, "服务路节点56", 31.498426, 120.312019, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162810，关联道路：贡湖大道。", "web/assets/spots/folk-street.svg"},
            {69, "小径节点57", 31.489368, 120.317139, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410505861，关联道路：贡湖大道。", "web/assets/spots/wetland.svg"},
            {70, "三级道路节点58", 31.491004, 120.313374, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127923，关联道路：和畅路。", "web/assets/spots/camp-lawn.svg"},
            {71, "小径节点59", 31.490016, 120.316422, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228100，关联道路：贡湖大道。", "web/assets/spots/bookstore.svg"},
            {72, "三级道路节点60", 31.493338, 120.324705, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10996471717，关联道路：和畅路。", "web/assets/spots/sports-station.svg"},
            {73, "步行路节点61", 31.490997, 120.313338, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127922，关联道路：步行路。", "web/assets/spots/visitor-center.svg"},
            {74, "三级道路节点62", 31.491028, 120.313182, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342274，关联道路：清舒道。", "web/assets/spots/lakeside-plaza.svg"},
            {75, "步行路节点63", 31.491163, 120.313296, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071676，关联道路：步行路。", "web/assets/spots/cherry-road.svg"},
            {76, "居住区道路节点64", 31.491664, 120.314528, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072486，关联道路：居住区道路。", "web/assets/spots/museum.svg"},
            {77, "服务路节点65", 31.491859, 120.315788, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7912026820，关联道路：贡湖大道。", "web/assets/spots/view-tower.svg"},
            {78, "三级道路节点66", 31.497501, 120.31756, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10993980953，关联道路：兴梁道。", "web/assets/spots/pier.svg"},
            {79, "居住区道路节点67", 31.497109, 120.316884, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7507219848，关联道路：居住区道路。", "web/assets/spots/bamboo.svg"},
            {80, "居住区道路节点68", 31.497544, 120.31683, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6944125126，关联道路：居住区道路。", "web/assets/spots/folk-street.svg"},
            {81, "三级道路节点69", 31.497559, 120.317542, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991163001，关联道路：万新路。", "web/assets/spots/wetland.svg"},
            {82, "三级道路节点70", 31.497585, 120.317534, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991102804，关联道路：万新路。", "web/assets/spots/camp-lawn.svg"},
            {83, "三级道路节点71", 31.499552, 120.316826, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991162813，关联道路：兴梁道。", "web/assets/spots/bookstore.svg"},
            {84, "居住区道路节点72", 31.497, 120.316253, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064053，关联道路：居住区道路。", "web/assets/spots/sports-station.svg"},
            {85, "服务路节点73", 31.498672, 120.31178, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6413759977，关联道路：贡湖大道。", "web/assets/spots/visitor-center.svg"},
            {86, "小径节点74", 31.488575, 120.317468, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228090，关联道路：贡湖大道。", "web/assets/spots/lakeside-plaza.svg"},
            {87, "小径节点75", 31.489777, 120.316504, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410505370，关联道路：贡湖大道。", "web/assets/spots/cherry-road.svg"},
            {88, "三级道路节点76", 31.493552, 120.325751, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127935，关联道路：和畅路。", "web/assets/spots/museum.svg"},
            {89, "步行路节点77", 31.490918, 120.313355, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071673，关联道路：步行路。", "web/assets/spots/view-tower.svg"},
            {90, "三级道路节点78", 31.49097, 120.31319, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127921，关联道路：清舒道。", "web/assets/spots/pier.svg"},
            {91, "三级道路节点79", 31.491, 120.313035, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430722902，关联道路：新金匮路。", "web/assets/spots/bamboo.svg"},
            {92, "步行路节点80", 31.491131, 120.313144, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071679，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {93, "居住区道路节点81", 31.491944, 120.314439, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072483，关联道路：居住区道路。", "web/assets/spots/wetland.svg"},
            {94, "服务路节点82", 31.492757, 120.315437, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437135，关联道路：贡湖大道。", "web/assets/spots/camp-lawn.svg"},
            {95, "居住区道路节点83", 31.497093, 120.316785, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064079，关联道路：居住区道路。", "web/assets/spots/bookstore.svg"},
            {96, "居住区道路节点84", 31.49758, 120.31639, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6944125127，关联道路：居住区道路。", "web/assets/spots/sports-station.svg"},
            {97, "三级道路节点85", 31.497972, 120.319885, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6413821365，关联道路：万新路。", "web/assets/spots/visitor-center.svg"},
            {98, "三级道路节点86", 31.498006, 120.319879, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991163000，关联道路：万新路。", "web/assets/spots/lakeside-plaza.svg"},
            {99, "三级道路节点87", 31.499557, 120.316853, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10993478355，关联道路：兴梁道。", "web/assets/spots/cherry-road.svg"},
            {100, "居住区道路节点88", 31.497011, 120.316333, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064058，关联道路：居住区道路。", "web/assets/spots/museum.svg"},
            {101, "小径节点89", 31.488488, 120.3175, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228091，关联道路：贡湖大道。", "web/assets/spots/view-tower.svg"},
            {102, "小径节点90", 31.48928, 120.316778, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410505355，关联道路：贡湖大道。", "web/assets/spots/pier.svg"},
            {103, "步行路节点91", 31.490885, 120.313202, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071675，关联道路：步行路。", "web/assets/spots/bamboo.svg"},
            {104, "三级道路节点92", 31.490944, 120.313044, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991127920，关联道路：新金匮路。", "web/assets/spots/folk-street.svg"},
            {105, "三级道路节点93", 31.490978, 120.312878, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071671，关联道路：新金匮路。", "web/assets/spots/wetland.svg"},
            {106, "步行路节点94", 31.491103, 120.313011, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071677，关联道路：步行路。", "web/assets/spots/camp-lawn.svg"},
            {107, "三级道路节点95", 31.491147, 120.313135, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204504，关联道路：清舒道。", "web/assets/spots/bookstore.svg"},
            {108, "步行路节点96", 31.491914, 120.314302, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072643，关联道路：步行路。", "web/assets/spots/sports-station.svg"},
            {109, "居住区道路节点97", 31.491976, 120.314501, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072449，关联道路：居住区道路。", "web/assets/spots/visitor-center.svg"},
            {110, "服务路节点98", 31.493903, 120.31493, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437136，关联道路：贡湖大道。", "web/assets/spots/lakeside-plaza.svg"},
            {111, "居住区道路节点99", 31.497078, 120.316683, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064059，关联道路：居住区道路。", "web/assets/spots/cherry-road.svg"},
            {112, "服务路节点100", 31.497198, 120.31678, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064080，关联道路：服务路。", "web/assets/spots/museum.svg"},
            {113, "居住区道路节点101", 31.497683, 120.31592, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 11724577849，关联道路：居住区道路。", "web/assets/spots/view-tower.svg"},
            {114, "小径节点102", 31.487733, 120.317812, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228092，关联道路：贡湖大道。", "web/assets/spots/pier.svg"},
            {115, "小径节点103", 31.487797, 120.317323, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228101，关联道路：贡湖大道。", "web/assets/spots/bamboo.svg"},
            {116, "三级道路节点104", 31.490799, 120.313216, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342299，关联道路：清舒道。", "web/assets/spots/folk-street.svg"},
            {117, "步行路节点105", 31.490856, 120.313065, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071674，关联道路：步行路。", "web/assets/spots/wetland.svg"},
            {118, "三级道路节点106", 31.490899, 120.312891, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071672，关联道路：新金匮路。", "web/assets/spots/camp-lawn.svg"},
            {119, "三级道路节点107", 31.49098, 120.31283, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430723035，关联道路：新金匮路。", "web/assets/spots/bookstore.svg"},
            {120, "步行路节点108", 31.491071, 120.312862, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071637，关联道路：步行路。", "web/assets/spots/sports-station.svg"},
            {121, "三级道路节点109", 31.491121, 120.313006, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204501，关联道路：清舒道。", "web/assets/spots/visitor-center.svg"},
            {122, "三级道路节点110", 31.491359, 120.313071, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204503，关联道路：清舒道。", "web/assets/spots/lakeside-plaza.svg"},
            {123, "步行路节点111", 31.491844, 120.314309, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072644，关联道路：步行路。", "web/assets/spots/cherry-road.svg"},
            {124, "居住区道路节点112", 31.49185, 120.314005, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072450，关联道路：居住区道路。", "web/assets/spots/museum.svg"},
            {125, "步行路节点113", 31.492027, 120.314546, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072448，关联道路：步行路。", "web/assets/spots/view-tower.svg"},
            {126, "服务路节点114", 31.494479, 120.314648, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437137，关联道路：贡湖大道。", "web/assets/spots/pier.svg"},
            {127, "服务路节点115", 31.497269, 120.316798, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064081，关联道路：服务路。", "web/assets/spots/bamboo.svg"},
            {128, "居住区道路节点116", 31.497846, 120.315446, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6944125128，关联道路：居住区道路。", "web/assets/spots/folk-street.svg"},
            {129, "小径节点117", 31.487024, 120.31809, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228093，关联道路：贡湖大道。", "web/assets/spots/wetland.svg"},
            {130, "小径节点118", 31.487225, 120.317581, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228102，关联道路：贡湖大道。", "web/assets/spots/camp-lawn.svg"},
            {131, "三级道路节点119", 31.490307, 120.313275, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342292，关联道路：清舒道。", "web/assets/spots/bookstore.svg"},
            {132, "三级道路节点120", 31.489651, 120.313232, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2513873789，关联道路：清舒道。", "web/assets/spots/sports-station.svg"},
            {133, "步行路节点121", 31.490835, 120.312964, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8447413667，关联道路：步行路。", "web/assets/spots/visitor-center.svg"},
            {134, "步行路节点122", 31.490822, 120.312904, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071638，关联道路：步行路。", "web/assets/spots/lakeside-plaza.svg"},
            {135, "三级道路节点123", 31.490877, 120.312856, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430722971，关联道路：新金匮路。", "web/assets/spots/cherry-road.svg"},
            {136, "三级道路节点124", 31.490749, 120.311676, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430723000，关联道路：新金匮路。", "web/assets/spots/museum.svg"},
            {137, "步行路节点125", 31.490813, 120.311625, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071632，关联道路：步行路。", "web/assets/spots/view-tower.svg"},
            {138, "三级道路节点126", 31.49133, 120.312943, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095204502，关联道路：清舒道。", "web/assets/spots/pier.svg"},
            {139, "三级道路节点127", 31.491492, 120.313034, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342296，关联道路：清舒道。", "web/assets/spots/bamboo.svg"},
            {140, "步行路节点128", 31.491753, 120.314285, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072645，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {141, "居住区道路节点129", 31.491846, 120.313929, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072451，关联道路：居住区道路。", "web/assets/spots/wetland.svg"},
            {142, "步行路节点130", 31.491979, 120.314604, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072601，关联道路：步行路。", "web/assets/spots/camp-lawn.svg"},
            {143, "服务路节点131", 31.492339, 120.31465, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072600，关联道路：服务路。", "web/assets/spots/bookstore.svg"},
            {144, "服务路节点132", 31.494543, 120.314607, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437131，关联道路：贡湖大道。", "web/assets/spots/sports-station.svg"},
            {145, "服务路节点133", 31.497351, 120.316832, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064082，关联道路：服务路。", "web/assets/spots/visitor-center.svg"},
            {146, "居住区道路节点134", 31.498031, 120.315142, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 11724577850，关联道路：居住区道路。", "web/assets/spots/lakeside-plaza.svg"},
            {147, "小径节点135", 31.486603, 120.318294, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228094，关联道路：贡湖大道。", "web/assets/spots/cherry-road.svg"},
            {148, "小径节点136", 31.486488, 120.317869, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410507987，关联道路：贡湖大道。", "web/assets/spots/museum.svg"},
            {149, "三级道路节点137", 31.488921, 120.31339, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342258，关联道路：清舒道。", "web/assets/spots/view-tower.svg"},
            {150, "三级道路节点138", 31.48843, 120.313334, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2513873831，关联道路：清舒道。", "web/assets/spots/pier.svg"},
            {151, "步行路节点139", 31.49077, 120.31301, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8447413666，关联道路：步行路。", "web/assets/spots/bamboo.svg"},
            {152, "步行路节点140", 31.490561, 120.311699, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071633，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {153, "三级道路节点141", 31.49064, 120.31168, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071635，关联道路：新金匮路。", "web/assets/spots/wetland.svg"},
            {154, "三级道路节点142", 31.490743, 120.311647, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071634，关联道路：新金匮路。", "web/assets/spots/camp-lawn.svg"},
            {155, "步行路节点143", 31.490849, 120.31151, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071636，关联道路：步行路。", "web/assets/spots/bookstore.svg"},
            {156, "三级道路节点144", 31.491408, 120.312921, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2513873832，关联道路：清舒道。", "web/assets/spots/sports-station.svg"},
            {157, "三级道路节点145", 31.49189, 120.31287, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342281，关联道路：清舒道。", "web/assets/spots/visitor-center.svg"},
            {158, "步行路节点146", 31.491671, 120.314237, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072646，关联道路：步行路。", "web/assets/spots/lakeside-plaza.svg"},
            {159, "居住区道路节点147", 31.491887, 120.31383, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072452，关联道路：居住区道路。", "web/assets/spots/cherry-road.svg"},
            {160, "步行路节点148", 31.491959, 120.314717, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072602，关联道路：步行路。", "web/assets/spots/museum.svg"},
            {161, "服务路节点149", 31.492274, 120.314938, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072581，关联道路：服务路。", "web/assets/spots/view-tower.svg"},
            {162, "步行路节点150", 31.492558, 120.314722, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072757，关联道路：步行路。", "web/assets/spots/pier.svg"},
            {163, "服务路节点151", 31.494977, 120.314329, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 9016243752，关联道路：贡湖大道。", "web/assets/spots/bamboo.svg"},
            {164, "服务路节点152", 31.497387, 120.316888, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064083，关联道路：服务路。", "web/assets/spots/folk-street.svg"},
            {165, "居住区道路节点153", 31.498303, 120.314813, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6944125129，关联道路：居住区道路。", "web/assets/spots/wetland.svg"},
            {166, "小径节点154", 31.486488, 120.318347, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410508074，关联道路：贡湖大道。", "web/assets/spots/camp-lawn.svg"},
            {167, "小径节点155", 31.485893, 120.318103, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2410507988，关联道路：贡湖大道。", "web/assets/spots/bookstore.svg"},
            {168, "三级道路节点156", 31.487583, 120.313525, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 9014692587，关联道路：清舒道。", "web/assets/spots/sports-station.svg"},
            {169, "步行路节点157", 31.487565, 120.31333, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8447413665，关联道路：步行路。", "web/assets/spots/visitor-center.svg"},
            {170, "步行路节点158", 31.490546, 120.311604, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071639，关联道路：步行路。", "web/assets/spots/lakeside-plaza.svg"},
            {171, "三级道路节点159", 31.490666, 120.311458, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991157597，关联道路：新金匮路。", "web/assets/spots/cherry-road.svg"},
            {172, "三级道路节点160", 31.490668, 120.311438, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430728428，关联道路：新金匮路。", "web/assets/spots/museum.svg"},
            {173, "步行路节点161", 31.490869, 120.311448, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071627，关联道路：步行路。", "web/assets/spots/view-tower.svg"},
            {174, "三级道路节点162", 31.491838, 120.312765, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2513873781，关联道路：清舒道。", "web/assets/spots/pier.svg"},
            {175, "三级道路节点163", 31.492223, 120.312705, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342253，关联道路：清舒道。", "web/assets/spots/bamboo.svg"},
            {176, "步行路节点164", 31.491616, 120.31417, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072647，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {177, "服务路节点165", 31.491942, 120.313763, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072453，关联道路：服务路。", "web/assets/spots/wetland.svg"},
            {178, "步行路节点166", 31.491931, 120.3148, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072603，关联道路：步行路。", "web/assets/spots/camp-lawn.svg"},
            {179, "服务路节点167", 31.492242, 120.314934, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072599，关联道路：服务路。", "web/assets/spots/bookstore.svg"},
            {180, "服务路节点168", 31.492304, 120.314955, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072582，关联道路：服务路。", "web/assets/spots/sports-station.svg"},
            {181, "步行路节点169", 31.492601, 120.31466, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072756，关联道路：步行路。", "web/assets/spots/visitor-center.svg"},
            {182, "步行路节点170", 31.492652, 120.314754, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072622，关联道路：步行路。", "web/assets/spots/lakeside-plaza.svg"},
            {183, "小径节点171", 31.494924, 120.313741, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 9016243753，关联道路：小径。", "web/assets/spots/cherry-road.svg"},
            {184, "服务路节点172", 31.495043, 120.314287, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437138，关联道路：贡湖大道。", "web/assets/spots/museum.svg"},
            {185, "服务路节点173", 31.497403, 120.316996, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064084，关联道路：服务路。", "web/assets/spots/view-tower.svg"},
            {186, "居住区道路节点174", 31.498436, 120.314683, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 11724577822，关联道路：居住区道路。", "web/assets/spots/pier.svg"},
            {187, "小径节点175", 31.486054, 120.318498, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228095，关联道路：贡湖大道。", "web/assets/spots/bamboo.svg"},
            {188, "三级道路节点176", 31.487485, 120.313534, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342256，关联道路：清舒道。", "web/assets/spots/folk-street.svg"},
            {189, "步行路节点177", 31.48754, 120.313307, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8447413664，关联道路：步行路。", "web/assets/spots/wetland.svg"},
            {190, "步行路节点178", 31.490511, 120.311542, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071630，关联道路：步行路。", "web/assets/spots/camp-lawn.svg"},
            {191, "步行路节点179", 31.49051, 120.311455, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991157598，关联道路：步行路。", "web/assets/spots/bookstore.svg"},
            {192, "步行路节点180", 31.49051, 120.311435, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430722969，关联道路：步行路。", "web/assets/spots/sports-station.svg"},
            {193, "三级道路节点181", 31.490728, 120.311372, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 11005354059，关联道路：新金匮路。", "web/assets/spots/visitor-center.svg"},
            {194, "三级道路节点182", 31.490852, 120.311407, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430722896，关联道路：新金匮路。", "web/assets/spots/lakeside-plaza.svg"},
            {195, "三级道路节点183", 31.492464, 120.312454, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2513873803，关联道路：清舒道。", "web/assets/spots/cherry-road.svg"},
            {196, "居住区道路节点184", 31.492449, 120.312594, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072460，关联道路：居住区道路。", "web/assets/spots/museum.svg"},
            {197, "步行路节点185", 31.49157, 120.314054, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072648，关联道路：步行路。", "web/assets/spots/view-tower.svg"},
            {198, "服务路节点186", 31.491894, 120.313696, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072633，关联道路：服务路。", "web/assets/spots/pier.svg"},
            {199, "步行路节点187", 31.492251, 120.313654, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072663，关联道路：步行路。", "web/assets/spots/bamboo.svg"},
            {200, "步行路节点188", 31.491897, 120.314875, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072604，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {201, "服务路节点189", 31.492211, 120.314942, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072598，关联道路：服务路。", "web/assets/spots/wetland.svg"},
            {202, "服务路节点190", 31.492327, 120.314983, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072583，关联道路：服务路。", "web/assets/spots/camp-lawn.svg"},
            {203, "步行路节点191", 31.492679, 120.314605, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072755，关联道路：步行路。", "web/assets/spots/bookstore.svg"},
            {204, "步行路节点192", 31.492643, 120.314894, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072621，关联道路：步行路。", "web/assets/spots/sports-station.svg"},
            {205, "居住区道路节点193", 31.492699, 120.314769, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072447，关联道路：居住区道路。", "web/assets/spots/visitor-center.svg"},
            {206, "小径节点194", 31.494893, 120.312969, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 9016243754，关联道路：小径。", "web/assets/spots/lakeside-plaza.svg"},
            {207, "服务路节点195", 31.495174, 120.314182, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 5447437139，关联道路：贡湖大道。", "web/assets/spots/cherry-road.svg"},
            {208, "服务路节点196", 31.497401, 120.317113, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989064085，关联道路：服务路。", "web/assets/spots/museum.svg"},
            {209, "居住区道路节点197", 31.498616, 120.314557, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 11724577851，关联道路：居住区道路。", "web/assets/spots/view-tower.svg"},
            {210, "小径节点198", 31.485913, 120.318544, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 6994228096，关联道路：贡湖大道。", "web/assets/spots/pier.svg"},
            {211, "步行路节点199", 31.486983, 120.310523, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8447413663，关联道路：步行路。", "web/assets/spots/bamboo.svg"},
            {212, "步行路节点200", 31.49041, 120.31151, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8099345530，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {213, "三级道路节点201", 31.490295, 120.311464, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10991157599，关联道路：尚贤路。", "web/assets/spots/wetland.svg"},
            {214, "三级道路节点202", 31.490305, 120.311448, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2430722978，关联道路：尚贤路。", "web/assets/spots/camp-lawn.svg"},
            {215, "小径节点203", 31.490481, 120.311305, "path", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071629，关联道路：小径。", "web/assets/spots/bookstore.svg"},
            {216, "三级道路节点204", 31.490802, 120.31129, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 7095071628，关联道路：新金匮路。", "web/assets/spots/sports-station.svg"},
            {217, "三级道路节点205", 31.491352, 120.311097, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 8099345529，关联道路：新金匮路。", "web/assets/spots/visitor-center.svg"},
            {218, "三级道路节点206", 31.493091, 120.31217, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2513873823，关联道路：清舒道。", "web/assets/spots/lakeside-plaza.svg"},
            {219, "居住区道路节点207", 31.492543, 120.312918, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072461，关联道路：居住区道路。", "web/assets/spots/cherry-road.svg"},
            {220, "三级道路节点208", 31.492601, 120.312505, "tertiary", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 2905342305，关联道路：清舒道。", "web/assets/spots/museum.svg"},
            {221, "步行路节点209", 31.491533, 120.313891, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072649，关联道路：步行路。", "web/assets/spots/view-tower.svg"},
            {222, "服务路节点210", 31.491874, 120.31371, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072634，关联道路：服务路。", "web/assets/spots/pier.svg"},
            {223, "服务路节点211", 31.491909, 120.313676, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072632，关联道路：服务路。", "web/assets/spots/bamboo.svg"},
            {224, "步行路节点212", 31.492222, 120.313521, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072662，关联道路：步行路。", "web/assets/spots/folk-street.svg"},
            {225, "居住区道路节点213", 31.492596, 120.313532, "residential", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072454，关联道路：居住区道路。", "web/assets/spots/wetland.svg"},
            {226, "步行路节点214", 31.491858, 120.314948, "footway", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072605，关联道路：步行路。", "web/assets/spots/camp-lawn.svg"},
            {227, "服务路节点215", 31.492183, 120.314961, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072597，关联道路：服务路。", "web/assets/spots/bookstore.svg"},
            {228, "服务路节点216", 31.492342, 120.315018, "service", 0, "来自 OpenStreetMap 的真实道路节点，OSM node id 10989072584，关联道路：服务路。", "web/assets/spots/sports-station.svg"}
        };
        osmEdges = {
            {1, 2, 240, "both", "游客中心联络路"},
            {2, 1, 240, "both", "游客中心联络路"},
            {2, 3, 260, "both", "湖滨步道"},
            {3, 2, 260, "both", "湖滨步道"},
            {3, 4, 210, "both", "樱花步行街"},
            {4, 3, 210, "both", "樱花步行街"},
            {4, 5, 280, "both", "文化景观道"},
            {5, 4, 280, "both", "文化景观道"},
            {5, 6, 230, "both", "骑行环线"},
            {6, 5, 230, "both", "骑行环线"},
            {6, 7, 310, "both", "亲水栈道"},
            {7, 6, 310, "both", "亲水栈道"},
            {7, 8, 270, "both", "竹林小径"},
            {8, 7, 270, "both", "竹林小径"},
            {3, 8, 420, "both", "文化环路"},
            {8, 3, 420, "both", "文化环路"},
            {8, 9, 260, "both", "湿地支路"},
            {9, 8, 260, "both", "湿地支路"},
            {9, 10, 300, "both", "湿地木栈道"},
            {10, 9, 300, "both", "湿地木栈道"},
            {10, 12, 360, "both", "草坪骑行道"},
            {12, 10, 360, "both", "草坪骑行道"},
            {12, 11, 280, "both", "服务联络路"},
            {11, 12, 280, "both", "服务联络路"},
            {11, 3, 190, "both", "文创小路"},
            {3, 11, 190, "both", "文创小路"},
            {1, 11, 350, "both", "入口文创路"},
            {11, 1, 350, "both", "入口文创路"},
            {2, 8, 380, "both", "湖滨民俗路"},
            {8, 2, 380, "both", "湖滨民俗路"},
            {134, 152, 117.9, "both", "步行路"},
            {152, 134, 117.9, "both", "步行路"},
            {152, 170, 9.2, "both", "步行路"},
            {170, 152, 9.2, "both", "步行路"},
            {170, 190, 7.1, "both", "步行路"},
            {190, 170, 7.1, "both", "步行路"},
            {190, 212, 11.6, "both", "步行路"},
            {212, 190, 11.6, "both", "步行路"},
            {210, 187, 16.3, "both", "贡湖大道"},
            {187, 210, 16.3, "both", "贡湖大道"},
            {187, 166, 50.3, "both", "贡湖大道"},
            {166, 187, 50.3, "both", "贡湖大道"},
            {166, 147, 13.8, "both", "贡湖大道"},
            {147, 166, 13.8, "both", "贡湖大道"},
            {147, 129, 50.6, "both", "贡湖大道"},
            {129, 147, 50.6, "both", "贡湖大道"},
            {129, 114, 83.2, "both", "贡湖大道"},
            {114, 129, 83.2, "both", "贡湖大道"},
            {114, 101, 89, "both", "贡湖大道"},
            {101, 114, 89, "both", "贡湖大道"},
            {101, 86, 10.1, "both", "贡湖大道"},
            {86, 101, 10.1, "both", "贡湖大道"},
            {86, 69, 93.5, "both", "贡湖大道"},
            {69, 86, 93.5, "both", "贡湖大道"},
            {69, 56, 67, "both", "贡湖大道"},
            {56, 69, 67, "both", "贡湖大道"},
            {56, 45, 19.9, "both", "贡湖大道"},
            {45, 56, 19.9, "both", "贡湖大道"},
            {45, 35, 33.3, "both", "贡湖大道"},
            {35, 45, 33.3, "both", "贡湖大道"},
            {35, 28, 117.4, "both", "贡湖大道"},
            {28, 35, 117.4, "both", "贡湖大道"},
            {28, 24, 25.6, "both", "贡湖大道"},
            {24, 28, 25.6, "both", "贡湖大道"},
            {24, 22, 4.3, "both", "贡湖大道"},
            {22, 24, 4.3, "both", "贡湖大道"},
            {22, 20, 20.9, "both", "贡湖大道"},
            {20, 22, 20.9, "both", "贡湖大道"},
            {20, 18, 3.1, "both", "贡湖大道"},
            {18, 20, 3.1, "both", "贡湖大道"},
            {58, 71, 147.1, "both", "贡湖大道"},
            {71, 58, 147.1, "both", "贡湖大道"},
            {71, 87, 27.7, "both", "贡湖大道"},
            {87, 71, 27.7, "both", "贡湖大道"},
            {87, 102, 61, "both", "贡湖大道"},
            {102, 87, 61, "both", "贡湖大道"},
            {102, 115, 172.9, "both", "贡湖大道"},
            {115, 102, 172.9, "both", "贡湖大道"},
            {115, 130, 68.1, "both", "贡湖大道"},
            {130, 115, 68.1, "both", "贡湖大道"},
            {130, 148, 86.5, "both", "贡湖大道"},
            {148, 130, 86.5, "both", "贡湖大道"},
            {148, 167, 69.7, "both", "贡湖大道"},
            {167, 148, 69.7, "both", "贡湖大道"},
            {216, 193, 11.4, "both", "新金匮路"},
            {193, 216, 11.4, "both", "新金匮路"},
            {193, 172, 9.1, "both", "新金匮路"},
            {172, 193, 9.1, "both", "新金匮路"},
            {207, 184, 17.6, "both", "贡湖大道"},
            {184, 207, 17.6, "both", "贡湖大道"},
            {184, 163, 8.4, "both", "贡湖大道"},
            {163, 184, 8.4, "both", "贡湖大道"},
            {163, 144, 54.9, "both", "贡湖大道"},
            {144, 163, 54.9, "both", "贡湖大道"},
            {144, 126, 8.1, "both", "贡湖大道"},
            {126, 144, 8.1, "both", "贡湖大道"},
            {126, 110, 69.4, "both", "贡湖大道"},
            {110, 126, 69.4, "both", "贡湖大道"},
            {110, 94, 136.2, "both", "贡湖大道"},
            {94, 110, 136.2, "both", "贡湖大道"},
            {94, 77, 105.3, "both", "贡湖大道"},
            {77, 94, 105.3, "both", "贡湖大道"},
            {77, 62, 1.9, "both", "贡湖大道"},
            {62, 77, 1.9, "both", "贡湖大道"},
            {62, 50, 12.5, "both", "贡湖大道"},
            {50, 62, 12.5, "both", "贡湖大道"},
            {50, 39, 19.9, "both", "贡湖大道"},
            {39, 50, 19.9, "both", "贡湖大道"},
            {39, 46, 4.4, "both", "贡湖大道"},
            {46, 39, 4.4, "both", "贡湖大道"},
            {46, 58, 27.9, "both", "贡湖大道"},
            {58, 46, 27.9, "both", "贡湖大道"},
            {211, 189, 271.1, "both", "步行路"},
            {189, 211, 271.1, "both", "步行路"},
            {189, 169, 3.5, "both", "步行路"},
            {169, 189, 3.5, "both", "步行路"},
            {169, 151, 357.7, "both", "步行路"},
            {151, 169, 357.7, "both", "步行路"},
            {151, 133, 8.4, "both", "步行路"},
            {133, 151, 8.4, "both", "步行路"},
            {206, 183, 73.3, "both", "小径"},
            {183, 206, 73.3, "both", "小径"},
            {183, 163, 56.1, "both", "小径"},
            {163, 183, 56.1, "both", "小径"},
            {91, 105, 15.1, "both", "新金匮路"},
            {105, 91, 15.1, "both", "新金匮路"},
            {105, 119, 4.6, "both", "新金匮路"},
            {119, 105, 4.6, "both", "新金匮路"},
            {119, 136, 112.3, "both", "新金匮路"},
            {136, 119, 112.3, "both", "新金匮路"},
            {136, 154, 2.8, "both", "新金匮路"},
            {154, 136, 2.8, "both", "新金匮路"},
            {154, 172, 21.5, "both", "新金匮路"},
            {172, 154, 21.5, "both", "新金匮路"},
            {172, 171, 1.9, "both", "新金匮路"},
            {171, 172, 1.9, "both", "新金匮路"},
            {171, 153, 21.3, "both", "新金匮路"},
            {153, 171, 21.3, "both", "新金匮路"},
            {153, 135, 114.6, "both", "新金匮路"},
            {135, 153, 114.6, "both", "新金匮路"},
            {135, 118, 4.1, "both", "新金匮路"},
            {118, 135, 4.1, "both", "新金匮路"},
            {118, 104, 15.4, "both", "新金匮路"},
            {104, 118, 15.4, "both", "新金匮路"},
            {172, 194, 20.6, "both", "新金匮路"},
            {194, 172, 20.6, "both", "新金匮路"},
            {194, 217, 63, "both", "新金匮路"},
            {217, 194, 63, "both", "新金匮路"},
            {216, 194, 12.4, "both", "步行路"},
            {194, 216, 12.4, "both", "步行路"},
            {194, 173, 4.3, "both", "步行路"},
            {173, 194, 4.3, "both", "步行路"},
            {215, 192, 12.8, "both", "步行路"},
            {192, 215, 12.8, "both", "步行路"},
            {192, 191, 1.9, "both", "步行路"},
            {191, 192, 1.9, "both", "步行路"},
            {191, 190, 8.3, "both", "步行路"},
            {190, 191, 8.3, "both", "步行路"},
            {137, 154, 8.1, "both", "步行路"},
            {154, 137, 8.1, "both", "步行路"},
            {154, 153, 11.9, "both", "步行路"},
            {153, 154, 11.9, "both", "步行路"},
            {153, 152, 8.9, "both", "步行路"},
            {152, 153, 8.9, "both", "步行路"},
            {173, 155, 6.2, "both", "步行路"},
            {155, 173, 6.2, "both", "步行路"},
            {155, 137, 11.7, "both", "步行路"},
            {137, 155, 11.7, "both", "步行路"},
            {137, 120, 120.7, "both", "步行路"},
            {120, 137, 120.7, "both", "步行路"},
            {134, 133, 5.8, "both", "步行路"},
            {133, 134, 5.8, "both", "步行路"},
            {133, 117, 9.9, "both", "步行路"},
            {117, 133, 9.9, "both", "步行路"},
            {117, 103, 13.4, "both", "步行路"},
            {103, 117, 13.4, "both", "步行路"},
            {103, 89, 15, "both", "步行路"},
            {89, 103, 15, "both", "步行路"},
            {89, 73, 8.9, "both", "步行路"},
            {73, 89, 8.9, "both", "步行路"},
            {73, 60, 6.5, "both", "步行路"},
            {60, 73, 6.5, "both", "步行路"},
            {60, 75, 12.4, "both", "步行路"},
            {75, 60, 12.4, "both", "步行路"},
            {75, 92, 14.8, "both", "步行路"},
            {92, 75, 14.8, "both", "步行路"},
            {92, 106, 13, "both", "步行路"},
            {106, 92, 13, "both", "步行路"},
            {106, 120, 14.6, "both", "步行路"},
            {120, 106, 14.6, "both", "步行路"},
            {120, 105, 10.5, "both", "步行路"},
            {105, 120, 10.5, "both", "步行路"},
            {105, 118, 8.9, "both", "步行路"},
            {118, 105, 8.9, "both", "步行路"},
            {118, 134, 8.7, "both", "步行路"},
            {134, 118, 8.7, "both", "步行路"},
            {138, 121, 24, "both", "清舒道"},
            {121, 138, 24, "both", "清舒道"},
            {107, 122, 24.3, "both", "清舒道"},
            {122, 107, 24.3, "both", "清舒道"},
            {18, 16, 11.5, "both", "小径"},
            {16, 18, 11.5, "both", "小径"},
            {188, 168, 10.9, "both", "清舒道"},
            {168, 188, 10.9, "both", "清舒道"},
            {168, 149, 149.4, "both", "清舒道"},
            {149, 168, 149.4, "both", "清舒道"},
            {149, 131, 154.5, "both", "清舒道"},
            {131, 149, 154.5, "both", "清舒道"},
            {131, 116, 55, "both", "清舒道"},
            {116, 131, 55, "both", "清舒道"},
            {116, 103, 9.7, "both", "清舒道"},
            {103, 116, 9.7, "both", "清舒道"},
            {103, 90, 9.5, "both", "清舒道"},
            {90, 103, 9.5, "both", "清舒道"},
            {90, 74, 6.6, "both", "清舒道"},
            {74, 90, 6.6, "both", "清舒道"},
            {104, 117, 10, "both", "清舒道"},
            {117, 104, 10, "both", "清舒道"},
            {117, 132, 134.9, "both", "清舒道"},
            {132, 117, 134.9, "both", "清舒道"},
            {132, 150, 136.1, "both", "清舒道"},
            {150, 132, 136.1, "both", "清舒道"},
            {196, 219, 32.4, "both", "居住区道路"},
            {219, 196, 32.4, "both", "居住区道路"},
            {93, 76, 32.2, "both", "居住区道路"},
            {76, 93, 32.2, "both", "居住区道路"},
            {61, 49, 17.5, "both", "居住区道路"},
            {49, 61, 17.5, "both", "居住区道路"},
            {76, 61, 23.2, "both", "居住区道路"},
            {61, 76, 23.2, "both", "居住区道路"},
            {227, 201, 3.6, "both", "服务路"},
            {201, 227, 3.6, "both", "服务路"},
            {201, 179, 3.6, "both", "服务路"},
            {179, 201, 3.6, "both", "服务路"},
            {179, 161, 3.6, "both", "服务路"},
            {161, 179, 3.6, "both", "服务路"},
            {161, 180, 3.7, "both", "服务路"},
            {180, 161, 3.7, "both", "服务路"},
            {180, 202, 3.7, "both", "服务路"},
            {202, 180, 3.7, "both", "服务路"},
            {202, 228, 3.7, "both", "服务路"},
            {228, 202, 3.7, "both", "服务路"},
            {161, 143, 28.3, "both", "服务路"},
            {143, 161, 28.3, "both", "服务路"},
            {125, 142, 7.6, "both", "步行路"},
            {142, 125, 7.6, "both", "步行路"},
            {142, 160, 10.9, "both", "步行路"},
            {160, 142, 10.9, "both", "步行路"},
            {160, 178, 8.5, "both", "步行路"},
            {178, 160, 8.5, "both", "步行路"},
            {178, 200, 8.1, "both", "步行路"},
            {200, 178, 8.1, "both", "步行路"},
            {200, 226, 8.1, "both", "步行路"},
            {226, 200, 8.1, "both", "步行路"},
            {204, 182, 13.4, "both", "步行路"},
            {182, 204, 13.4, "both", "步行路"},
            {223, 198, 2.6, "both", "服务路"},
            {198, 223, 2.6, "both", "服务路"},
            {198, 222, 2.6, "both", "服务路"},
            {222, 198, 2.6, "both", "服务路"},
            {198, 177, 8.3, "both", "服务路"},
            {177, 198, 8.3, "both", "服务路"},
            {108, 123, 7.8, "both", "步行路"},
            {123, 108, 7.8, "both", "步行路"},
            {123, 140, 10.4, "both", "步行路"},
            {140, 123, 10.4, "both", "步行路"},
            {140, 158, 10.2, "both", "步行路"},
            {158, 140, 10.2, "both", "步行路"},
            {158, 176, 8.8, "both", "步行路"},
            {176, 158, 8.8, "both", "步行路"},
            {176, 197, 12.1, "both", "步行路"},
            {197, 176, 12.1, "both", "步行路"},
            {197, 221, 16, "both", "步行路"},
            {221, 197, 16, "both", "步行路"},
            {224, 199, 13.1, "both", "步行路"},
            {199, 224, 13.1, "both", "步行路"},
            {203, 181, 10.1, "both", "步行路"},
            {181, 203, 10.1, "both", "步行路"},
            {181, 162, 7.6, "both", "步行路"},
            {162, 181, 7.6, "both", "步行路"},
            {90, 73, 14.3, "both", "和畅路"},
            {73, 90, 14.3, "both", "和畅路"},
            {73, 70, 3.5, "both", "和畅路"},
            {70, 73, 3.5, "both", "和畅路"},
            {70, 57, 124.1, "both", "和畅路"},
            {57, 70, 124.1, "both", "和畅路"},
            {57, 46, 123.6, "both", "和畅路"},
            {46, 57, 123.6, "both", "和畅路"},
            {46, 36, 8.9, "both", "和畅路"},
            {36, 46, 8.9, "both", "和畅路"},
            {31, 39, 8.8, "both", "和畅路"},
            {39, 31, 8.8, "both", "和畅路"},
            {39, 49, 122.8, "both", "和畅路"},
            {49, 39, 122.8, "both", "和畅路"},
            {49, 60, 127.6, "both", "和畅路"},
            {60, 49, 127.6, "both", "和畅路"},
            {60, 74, 13.8, "both", "和畅路"},
            {74, 60, 13.8, "both", "和畅路"},
            {104, 90, 14.1, "both", "和畅路"},
            {90, 104, 14.1, "both", "和畅路"},
            {121, 106, 2.1, "both", "清舒道"},
            {106, 121, 2.1, "both", "清舒道"},
            {106, 91, 11.6, "both", "清舒道"},
            {91, 106, 11.6, "both", "清舒道"},
            {74, 92, 11.9, "both", "清舒道"},
            {92, 74, 11.9, "both", "清舒道"},
            {92, 107, 2, "both", "清舒道"},
            {107, 92, 2, "both", "清舒道"},
            {91, 74, 14.3, "both", "和畅路"},
            {74, 91, 14.3, "both", "和畅路"},
            {25, 31, 17.2, "both", "和畅路"},
            {31, 25, 17.2, "both", "和畅路"},
            {36, 29, 17.5, "both", "和畅路"},
            {29, 36, 17.5, "both", "和畅路"},
            {172, 192, 17.6, "both", "尚贤路"},
            {192, 172, 17.6, "both", "尚贤路"},
            {192, 214, 22.8, "both", "尚贤路"},
            {214, 192, 22.8, "both", "尚贤路"},
            {213, 191, 23.9, "both", "尚贤路"},
            {191, 213, 23.9, "both", "尚贤路"},
            {191, 171, 17.3, "both", "尚贤路"},
            {171, 191, 17.3, "both", "尚贤路"},
            {91, 104, 6.3, "both", "清舒道"},
            {104, 91, 6.3, "both", "清舒道"},
            {30, 37, 393.3, "both", "兴梁道"},
            {37, 30, 393.3, "both", "兴梁道"},
            {26, 30, 2.6, "both", "兴梁道"},
            {30, 26, 2.6, "both", "兴梁道"},
            {47, 38, 393, "both", "兴梁道"},
            {38, 47, 393, "both", "兴梁道"},
            {32, 26, 4, "both", "和畅路"},
            {26, 32, 4, "both", "和畅路"},
            {30, 38, 4.1, "both", "和畅路"},
            {38, 30, 4.1, "both", "和畅路"},
            {38, 32, 2.8, "both", "兴梁道"},
            {32, 38, 2.8, "both", "兴梁道"},
            {38, 48, 367.8, "both", "和畅路"},
            {48, 38, 367.8, "both", "和畅路"},
            {40, 32, 368.1, "both", "和畅路"},
            {32, 40, 368.1, "both", "和畅路"},
            {51, 40, 16.7, "both", "和畅路"},
            {40, 51, 16.7, "both", "和畅路"},
            {48, 59, 16.7, "both", "和畅路"},
            {59, 48, 16.7, "both", "和畅路"},
            {33, 26, 399.5, "both", "兴梁道"},
            {26, 33, 399.5, "both", "兴梁道"},
            {218, 195, 74.7, "both", "清舒道"},
            {195, 218, 74.7, "both", "清舒道"},
            {195, 174, 75.7, "both", "清舒道"},
            {174, 195, 75.7, "both", "清舒道"},
            {174, 156, 50, "both", "清舒道"},
            {156, 174, 50, "both", "清舒道"},
            {156, 138, 8.9, "both", "清舒道"},
            {138, 156, 8.9, "both", "清舒道"},
            {98, 82, 227.2, "both", "万新路"},
            {82, 98, 227.2, "both", "万新路"},
            {122, 139, 15.2, "both", "清舒道"},
            {139, 122, 15.2, "both", "清舒道"},
            {139, 157, 46.9, "both", "清舒道"},
            {157, 139, 46.9, "both", "清舒道"},
            {157, 175, 40.2, "both", "清舒道"},
            {175, 157, 40.2, "both", "清舒道"},
            {175, 196, 27.3, "both", "清舒道"},
            {196, 175, 27.3, "both", "清舒道"},
            {196, 220, 18.9, "both", "清舒道"},
            {220, 196, 18.9, "both", "清舒道"},
            {16, 14, 6.6, "both", "贡湖大道"},
            {14, 16, 6.6, "both", "贡湖大道"},
            {14, 13, 77.7, "both", "贡湖大道"},
            {13, 14, 77.7, "both", "贡湖大道"},
            {13, 15, 244.1, "both", "贡湖大道"},
            {15, 13, 244.1, "both", "贡湖大道"},
            {15, 17, 46.5, "both", "贡湖大道"},
            {17, 15, 46.5, "both", "贡湖大道"},
            {53, 65, 55.7, "both", "居住区道路"},
            {65, 53, 55.7, "both", "居住区道路"},
            {65, 79, 19.2, "both", "居住区道路"},
            {79, 65, 19.2, "both", "居住区道路"},
            {79, 95, 9.6, "both", "居住区道路"},
            {95, 79, 9.6, "both", "居住区道路"},
            {95, 111, 9.8, "both", "居住区道路"},
            {111, 95, 9.8, "both", "居住区道路"},
            {205, 182, 5.4, "both", "居住区道路"},
            {182, 205, 5.4, "both", "居住区道路"},
            {182, 162, 10.9, "both", "居住区道路"},
            {162, 182, 10.9, "both", "居住区道路"},
            {162, 143, 25.4, "both", "居住区道路"},
            {143, 162, 25.4, "both", "居住区道路"},
            {143, 125, 36, "both", "居住区道路"},
            {125, 143, 36, "both", "居住区道路"},
            {125, 109, 7.1, "both", "居住区道路"},
            {109, 125, 7.1, "both", "居住区道路"},
            {109, 93, 6.9, "both", "居住区道路"},
            {93, 109, 6.9, "both", "居住区道路"},
            {93, 108, 13.4, "both", "居住区道路"},
            {108, 93, 13.4, "both", "居住区道路"},
            {108, 124, 29.1, "both", "居住区道路"},
            {124, 108, 29.1, "both", "居住区道路"},
            {124, 141, 7.1, "both", "居住区道路"},
            {141, 124, 7.1, "both", "居住区道路"},
            {141, 159, 10.5, "both", "居住区道路"},
            {159, 141, 10.5, "both", "居住区道路"},
            {159, 177, 8.8, "both", "居住区道路"},
            {177, 159, 8.8, "both", "居住区道路"},
            {177, 199, 35.8, "both", "居住区道路"},
            {199, 177, 35.8, "both", "居住区道路"},
            {199, 225, 40.1, "both", "居住区道路"},
            {225, 199, 40.1, "both", "居住区道路"},
            {32, 41, 399, "both", "兴梁道"},
            {41, 32, 399, "both", "兴梁道"},
            {81, 97, 226.8, "both", "万新路"},
            {97, 81, 226.8, "both", "万新路"},
            {52, 64, 132.4, "both", "兴梁道"},
            {64, 52, 132.4, "both", "兴梁道"},
            {64, 78, 55.6, "both", "兴梁道"},
            {78, 64, 55.6, "both", "兴梁道"},
            {78, 81, 6.6, "both", "兴梁道"},
            {81, 78, 6.6, "both", "兴梁道"},
            {66, 53, 61.7, "both", "兴梁道"},
            {53, 66, 61.7, "both", "兴梁道"},
            {53, 42, 134, "both", "兴梁道"},
            {42, 53, 134, "both", "兴梁道"},
            {26, 22, 285.9, "both", "和畅路"},
            {22, 26, 285.9, "both", "和畅路"},
            {22, 25, 9.2, "both", "和畅路"},
            {25, 22, 9.2, "both", "和畅路"},
            {29, 24, 8.6, "both", "和畅路"},
            {24, 29, 8.6, "both", "和畅路"},
            {24, 30, 285.8, "both", "和畅路"},
            {30, 24, 285.8, "both", "和畅路"},
            {63, 51, 250.1, "both", "和畅路"},
            {51, 63, 250.1, "both", "和畅路"},
            {59, 72, 148.4, "both", "和畅路"},
            {72, 59, 148.4, "both", "和畅路"},
            {72, 88, 102, "both", "和畅路"},
            {88, 72, 102, "both", "和畅路"},
            {66, 80, 63.9, "both", "居住区道路"},
            {80, 66, 63.9, "both", "居住区道路"},
            {80, 96, 41.9, "both", "居住区道路"},
            {96, 80, 41.9, "both", "居住区道路"},
            {100, 84, 7.7, "both", "居住区道路"},
            {84, 100, 7.7, "both", "居住区道路"},
            {84, 67, 8.9, "both", "居住区道路"},
            {67, 84, 8.9, "both", "居住区道路"},
            {67, 54, 13.8, "both", "居住区道路"},
            {54, 67, 13.8, "both", "居住区道路"},
            {54, 43, 192.9, "both", "居住区道路"},
            {43, 54, 192.9, "both", "居住区道路"},
            {43, 34, 35, "both", "居住区道路"},
            {34, 43, 35, "both", "居住区道路"},
            {111, 100, 34, "both", "居住区道路"},
            {100, 111, 34, "both", "居住区道路"},
            {127, 145, 9.6, "both", "服务路"},
            {145, 127, 9.6, "both", "服务路"},
            {145, 164, 6.7, "both", "服务路"},
            {164, 145, 6.7, "both", "服务路"},
            {164, 185, 10.4, "both", "服务路"},
            {185, 164, 10.4, "both", "服务路"},
            {185, 208, 11.1, "both", "服务路"},
            {208, 185, 11.1, "both", "服务路"},
            {95, 112, 11.7, "both", "服务路"},
            {112, 95, 11.7, "both", "服务路"},
            {112, 127, 8.1, "both", "服务路"},
            {127, 112, 8.1, "both", "服务路"},
            {17, 19, 16.8, "both", "贡湖大道"},
            {19, 17, 16.8, "both", "贡湖大道"},
            {19, 21, 17.1, "both", "贡湖大道"},
            {21, 19, 17.1, "both", "贡湖大道"},
            {21, 23, 44.2, "both", "贡湖大道"},
            {23, 21, 44.2, "both", "贡湖大道"},
            {23, 27, 83.4, "both", "贡湖大道"},
            {27, 23, 83.4, "both", "贡湖大道"},
            {27, 34, 27.8, "both", "贡湖大道"},
            {34, 27, 27.8, "both", "贡湖大道"},
            {34, 44, 146.5, "both", "贡湖大道"},
            {44, 34, 146.5, "both", "贡湖大道"},
            {44, 55, 110.6, "both", "贡湖大道"},
            {55, 44, 110.6, "both", "贡湖大道"},
            {55, 68, 4.4, "both", "贡湖大道"},
            {68, 55, 4.4, "both", "贡湖大道"},
            {68, 85, 35.5, "both", "贡湖大道"},
            {85, 68, 35.5, "both", "贡湖大道"},
            {96, 113, 46, "both", "居住区道路"},
            {113, 96, 46, "both", "居住区道路"},
            {113, 128, 48.4, "both", "居住区道路"},
            {128, 113, 48.4, "both", "居住区道路"},
            {128, 146, 35.4, "both", "居住区道路"},
            {146, 128, 35.4, "both", "居住区道路"},
            {146, 165, 43.4, "both", "居住区道路"},
            {165, 146, 43.4, "both", "居住区道路"},
            {165, 186, 19.2, "both", "居住区道路"},
            {186, 165, 19.2, "both", "居住区道路"},
            {186, 209, 23.4, "both", "居住区道路"},
            {209, 186, 23.4, "both", "居住区道路"},
            {82, 99, 228.6, "both", "兴梁道"},
            {99, 82, 228.6, "both", "兴梁道"},
            {82, 66, 3.6, "both", "万新路"},
            {66, 82, 3.6, "both", "万新路"},
            {81, 82, 3.1, "both", "兴梁道"},
            {82, 81, 3.1, "both", "兴梁道"},
            {66, 81, 3.7, "both", "万新路"},
            {81, 66, 3.7, "both", "万新路"},
            {83, 66, 230.1, "both", "兴梁道"},
            {66, 83, 230.1, "both", "兴梁道"},
            {41, 52, 17.2, "both", "兴梁道"},
            {52, 41, 17.2, "both", "兴梁道"},
            {42, 33, 17.2, "both", "兴梁道"},
            {33, 42, 17.2, "both", "兴梁道"},
            {1, 216, 35.2, "both", "景点接入路"},
            {216, 1, 35.2, "both", "景点接入路"},
            {2, 157, 32.9, "both", "景点接入路"},
            {157, 2, 32.9, "both", "景点接入路"},
            {3, 205, 59.9, "both", "景点接入路"},
            {205, 3, 59.9, "both", "景点接入路"},
            {4, 15, 144.7, "both", "景点接入路"},
            {15, 4, 144.7, "both", "景点接入路"},
            {5, 33, 20, "both", "景点接入路"},
            {33, 5, 20, "both", "景点接入路"},
            {6, 97, 177.4, "both", "景点接入路"},
            {97, 6, 177.4, "both", "景点接入路"},
            {7, 40, 267.4, "both", "景点接入路"},
            {40, 7, 267.4, "both", "景点接入路"},
            {8, 32, 121.2, "both", "景点接入路"},
            {32, 8, 121.2, "both", "景点接入路"},
            {9, 48, 87.8, "both", "景点接入路"},
            {48, 9, 87.8, "both", "景点接入路"},
            {10, 38, 217.7, "both", "景点接入路"},
            {38, 10, 217.7, "both", "景点接入路"},
            {11, 26, 142, "both", "景点接入路"},
            {26, 11, 142, "both", "景点接入路"},
            {12, 71, 79.9, "both", "景点接入路"},
            {71, 12, 79.9, "both", "景点接入路"}
        };
                restaurants = {
            {1, "湖畔小馆", 1, "本帮菜", 4.7, 600},
            {2, "樱花茶屋", 2, "甜品", 4.5, 480},
            {3, "博物馆简餐", 3, "简餐", 4.2, 360},
            {4, "塔下咖啡", 4, "咖啡", 4.6, 520},
            {5, "码头鱼鲜", 5, "江鲜", 4.8, 710},
            {6, "亲子餐厅", 6, "儿童餐", 4.3, 390},
            {7, "竹林素食", 7, "素食", 4.6, 450},
            {8, "民俗小吃铺", 8, "小吃", 4.4, 680},
            {9, "喷泉夜宵", 9, "夜宵", 4.5, 570},
            {10, "湿地轻食", 11, "轻食", 4.4, 410},
            {11, "书店咖啡", 12, "咖啡", 4.6, 520},
            {12, "草坪烧烤", 13, "烧烤", 4.5, 610},
            {13, "骑行补给站", 14, "简餐", 4.2, 360},
            {14, "湖景甜品车", 1, "甜品", 4.3, 470}
        };
    }

    void generateSampleUsers() {
        users = {
            {1, "游客01", {"历史", "建筑", "室内"}, {"历史", "建筑"}, "walk", {1, 9, 16}},
            {2, "游客02", {"湖景", "拍照", "夕阳"}, {"湖景", "拍照"}, "bike", {2, 10, 17}},
            {3, "游客03", {"安静", "园林", "低拥挤"}, {"安静", "园林"}, "walk", {3, 11, 18}},
            {4, "游客04", {"亲子", "服务", "轻松"}, {"亲子", "服务"}, "walk", {4, 12, 19}},
            {5, "游客05", {"美食", "购物", "文化"}, {"美食", "购物"}, "bike", {5, 13, 16}},
            {6, "游客06", {"徒步", "路线", "登高"}, {"徒步", "路线"}, "walk", {6, 14, 17}},
            {7, "游客07", {"展陈", "文物", "讲解"}, {"展陈", "文物"}, "walk", {7, 15, 18}},
            {8, "游客08", {"骑行", "湖岸", "效率"}, {"骑行", "湖岸"}, "bike", {8, 9, 19}},
            {9, "游客09", {"地标", "打卡", "热门"}, {"地标", "打卡"}, "walk", {1, 10, 16}},
            {10, "游客10", {"自然", "树荫", "休闲"}, {"自然", "树荫"}, "walk", {2, 11, 17}}
        };
        currentUserId = 1;
    }

    void generateSampleDiaries() {
        fs::create_directories(dataDir_ / "diaries");
        std::vector<Diary> summerPalaceSamples = {
            {1, "东宫门到长廊半日路线", 1, 4.8, 18, "2026-05-10 09:00:00",
             "从颐和园东宫门入园，先看仁寿殿和德和园，再沿长廊走到排云门，适合第一次来颐和园的游客。", true, ""},
            {2, "佛香阁登高记录", 2, 4.7, 15, "2026-05-11 10:20:00",
             "佛香阁视野很好，可以俯瞰昆明湖。路线不长但有台阶，推荐给喜欢建筑、观景和拍照的游客。", true, ""},
            {3, "苏州街慢游体验", 3, 4.6, 14, "2026-05-12 15:30:00",
             "从石舫走到苏州街入口，后湖一带比前山更安静，适合把美食和文创购物放在返程前。", true, ""}
        };
        for (const auto& d : summerPalaceSamples) {
            fs::path jsonPath = dataDir_ / "diaries" / (std::to_string(d.id) + ".json");
            fs::path binPath = dataDir_ / "diaries" / (std::to_string(d.id) + ".bin");
            if (!fs::exists(jsonPath) || !fs::exists(binPath)) {
                writeDiary(d);
            }
        }
        return;
        std::vector<Diary> samples = {
            {1, "湖边散步记录", 1, 4.8, 12, "2026-04-30 09:00:00",
             "今天从游客中心出发，沿着太湖广场慢慢走到湖边，风很舒服，适合拍照和休息。", true, ""},
            {2, "樱花大道游记", 2, 4.6, 8, "2026-04-30 10:30:00",
             "樱花大道人不算多，花海和步道都很适合散步，后面可以和历史博物馆安排在同一条路线。", true, ""},
            {3, "夜晚音乐喷泉", 3, 4.9, 18, "2026-04-30 19:40:00",
             "晚上看了音乐喷泉，灯光和水幕效果很好，附近的夜宵也方便，适合放在一天行程的最后。", true, ""}
        };
        for (const auto& d : samples) {
            fs::path jsonPath = dataDir_ / "diaries" / (std::to_string(d.id) + ".json");
            fs::path binPath = dataDir_ / "diaries" / (std::to_string(d.id) + ".bin");
            if (!fs::exists(jsonPath) || !fs::exists(binPath)) {
                writeDiary(d);
            }
        }
    }

    // JSON parser field coverage:
    // spots.json: id, name, category, rating, heat, tags.
    // roads.json: from, to, dist_walk, dist_bike.
    // osm_nodes.json: id, name, lat, lon, type, spot_id, description, image.
    // osm_edges.json: from, to, distance, mode, road_name.
    // restaurants.json: id, name, near_spot_id, cuisine, rating, heat, image.
    // users.json: id, name, preference_tags, preferred_categories, route_mode,
    // history_spot_ids.
    // diaries/*.json: id, title, user_id, rating, heat, created_at, image,
    // bit_length and codebook entries with ch/code. Keep these comments in sync
    // with utils.hpp when adding fields parsed by regex helpers.
    static std::string jsonArrayBody(const std::string& obj, const std::string& key) {
        std::string needle = "\"" + key + "\"";
        size_t keyPos = obj.find(needle);
        if (keyPos == std::string::npos) return "";
        size_t start = obj.find('[', keyPos + needle.size());
        if (start == std::string::npos) return "";
        int depth = 0;
        bool inString = false;
        for (size_t i = start; i < obj.size(); ++i) {
            char c = obj[i];
            if (c == '"' && (i == 0 || obj[i - 1] != '\\')) inString = !inString;
            if (inString) continue;
            if (c == '[') ++depth;
            else if (c == ']') {
                --depth;
                if (depth == 0) return obj.substr(start + 1, i - start - 1);
            }
        }
        return "";
    }

    void generateSampleIndoorBuildings() {
        indoorBuildings.clear();
        indoorBuildings.push_back({
            "wenchang",
            "Wenchang Gallery",
            1,
            {{"1F", "web/assets/indoor/wenchang-gallery.png"}},
            {
                {"wc_entrance", "Entrance", "1F", "entrance", 50, 92},
                {"wc_general", "General Gallery", "1F", "room", 50, 48},
                {"wc_bronze", "Bronze Gallery", "1F", "room", 23, 28},
                {"wc_jade", "Jade Gallery", "1F", "room", 77, 28},
                {"wc_porcelain", "Porcelain Gallery", "1F", "room", 88, 56},
                {"wc_study", "Imperial Study", "1F", "room", 73, 67},
                {"wc_treasures", "Treasure Gallery", "1F", "room", 10, 66},
                {"wc_exit", "Exit", "1F", "entrance", 50, 4}
            },
            {
                {"wc_entrance", "wc_general", 32}, {"wc_general", "wc_bronze", 24},
                {"wc_general", "wc_jade", 24}, {"wc_general", "wc_study", 18},
                {"wc_study", "wc_porcelain", 16}, {"wc_general", "wc_treasures", 28},
                {"wc_bronze", "wc_exit", 30}, {"wc_jade", "wc_exit", 30}
            }
        });
        indoorBuildings.push_back({
            "pku_library",
            "PKU Library",
            4,
            {{"1F", "web/assets/indoor/pku_library/1ceng.jpg"}, {"2F", "web/assets/indoor/pku_library/2ceng.jpg"}, {"3F", "web/assets/indoor/pku_library/3ceng.jpg"}, {"4F", "web/assets/indoor/pku_library/4ceng.jpg"}},
            {
                {"pku_1_east", "East Entrance", "1F", "entrance", 84, 74},
                {"pku_1_service", "Main Service Desk", "1F", "service", 58, 68},
                {"pku_1_lift", "1F Elevator", "1F", "elevator", 50, 31},
                {"pku_2_lift", "2F Elevator", "2F", "elevator", 50, 31},
                {"pku_2_science", "Science Reading Area", "2F", "room", 37, 39},
                {"pku_3_lift", "3F Elevator", "3F", "elevator", 50, 31},
                {"pku_3_literature", "Literature Reading Area", "3F", "room", 35, 41},
                {"pku_4_lift", "4F Elevator", "4F", "elevator", 50, 31},
                {"pku_4_rare", "Rare Books Area", "4F", "room", 35, 41}
            },
            {
                {"pku_1_east", "pku_1_service", 30}, {"pku_1_service", "pku_1_lift", 24},
                {"pku_1_lift", "pku_2_lift", 10}, {"pku_2_lift", "pku_3_lift", 10},
                {"pku_3_lift", "pku_4_lift", 10}, {"pku_2_lift", "pku_2_science", 15},
                {"pku_3_lift", "pku_3_literature", 16}, {"pku_4_lift", "pku_4_rare", 16}
            }
        });
        indoorBuildings.push_back({
            "tsinghua_hospital",
            "Tsinghua University Hospital",
            4,
            {{"1F", "web/assets/indoor/清华大学医院F1.jpg"}, {"2F", "web/assets/indoor/清华大学医院F2.jpg"}, {"3F", "web/assets/indoor/清华大学医院F3.jpg"}, {"4F", "web/assets/indoor/清华大学医院F4.jpg"}},
            {
                {"hosp_1_entrance", "Entrance", "1F", "entrance", 50, 94},
                {"hosp_1_info", "Information Desk", "1F", "service", 54, 75},
                {"hosp_1_registration", "Registration and Cashier", "1F", "service", 59, 62},
                {"hosp_1_lift", "1F Elevator", "1F", "elevator", 55, 48},
                {"hosp_2_lift", "2F Elevator", "2F", "elevator", 55, 50},
                {"hosp_2_clinic", "2F Clinic", "2F", "room", 25, 50},
                {"hosp_3_lift", "3F Elevator", "3F", "elevator", 55, 54},
                {"hosp_3_admin", "Administration", "3F", "service", 25, 58},
                {"hosp_4_lift", "4F Elevator", "4F", "elevator", 55, 62},
                {"hosp_4_prepare", "Pre-op Area", "4F", "service", 48, 46},
                {"hosp_4_surgery", "Operating Room", "4F", "room", 63, 30}
            },
            {
                {"hosp_1_entrance", "hosp_1_info", 12}, {"hosp_1_info", "hosp_1_registration", 10},
                {"hosp_1_registration", "hosp_1_lift", 12}, {"hosp_1_lift", "hosp_2_lift", 8},
                {"hosp_2_lift", "hosp_3_lift", 8}, {"hosp_3_lift", "hosp_4_lift", 8},
                {"hosp_2_lift", "hosp_2_clinic", 22}, {"hosp_3_lift", "hosp_3_admin", 20},
                {"hosp_4_lift", "hosp_4_prepare", 12}, {"hosp_4_prepare", "hosp_4_surgery", 16}
            }
        });
    }

    void loadSpots() {
        spots.clear();
        for (const auto& obj : jsonObjects(readText(dataDir_ / "spots.json"))) {
            spots.push_back({static_cast<int>(jsonNumber(obj, "id")), jsonString(obj, "name"), jsonString(obj, "category"), jsonNumber(obj, "rating"), static_cast<int>(jsonNumber(obj, "heat")), jsonString(obj, "tags")});
        }
    }

    void loadRoads() {
        roads.clear();
        for (const auto& obj : jsonObjects(readText(dataDir_ / "roads.json"))) {
            roads.push_back({static_cast<int>(jsonNumber(obj, "from")), static_cast<int>(jsonNumber(obj, "to")), jsonNumber(obj, "dist_walk"), jsonNumber(obj, "dist_bike")});
        }
    }

    void loadOsm() {
        osmNodes.clear();
        osmEdges.clear();
        for (const auto& obj : jsonObjects(readText(dataDir_ / "osm_nodes.json"))) {
            osmNodes.push_back({
                static_cast<int>(jsonNumber(obj, "id")),
                jsonString(obj, "name"),
                jsonNumber(obj, "lat"),
                jsonNumber(obj, "lon"),
                jsonString(obj, "type"),
                static_cast<int>(jsonNumber(obj, "spot_id")),
                jsonString(obj, "description"),
                jsonString(obj, "image")
            });
        }
        for (const auto& obj : jsonObjects(readText(dataDir_ / "osm_edges.json"))) {
            osmEdges.push_back({static_cast<int>(jsonNumber(obj, "from")), static_cast<int>(jsonNumber(obj, "to")), jsonNumber(obj, "distance"), jsonString(obj, "mode"), jsonString(obj, "road_name")});
        }
    }

    void loadIndoorBuildings() {
        indoorBuildings.clear();
        std::string text = readText(dataDir_ / "indoor_buildings.json");
        if (text.empty()) {
            generateSampleIndoorBuildings();
            return;
        }
        for (const auto& obj : jsonObjects(text)) {
            IndoorBuilding building;
            building.id = jsonString(obj, "id");
            building.name = jsonString(obj, "name");
            building.floorCount = static_cast<int>(jsonNumber(obj, "floorCount"));

            for (const auto& planObj : jsonObjects(jsonArrayBody(obj, "floorPlans"))) {
                building.floorPlans.push_back({
                    jsonString(planObj, "floor"),
                    jsonString(planObj, "image")
                });
            }
            for (const auto& nodeObj : jsonObjects(jsonArrayBody(obj, "nodes"))) {
                building.nodes.push_back({
                    jsonString(nodeObj, "id"),
                    jsonString(nodeObj, "name"),
                    jsonString(nodeObj, "floor"),
                    jsonString(nodeObj, "role"),
                    jsonNumber(nodeObj, "x"),
                    jsonNumber(nodeObj, "y")
                });
            }
            for (const auto& edgeObj : jsonObjects(jsonArrayBody(obj, "edges"))) {
                building.edges.push_back({
                    jsonString(edgeObj, "from"),
                    jsonString(edgeObj, "to"),
                    jsonNumber(edgeObj, "distance")
                });
            }
            if (building.floorCount == 0) building.floorCount = static_cast<int>(building.floorPlans.size());
            if (!building.id.empty() && !building.nodes.empty() && !building.edges.empty()) {
                indoorBuildings.push_back(building);
            }
        }
        if (indoorBuildings.empty()) generateSampleIndoorBuildings();
    }

    void loadRestaurants() {
        restaurants.clear();
        for (const auto& obj : jsonObjects(readText(dataDir_ / "restaurants.json"))) {
            restaurants.push_back({
                static_cast<int>(jsonNumber(obj, "id")),
                jsonString(obj, "name"),
                static_cast<int>(jsonNumber(obj, "near_spot_id")),
                jsonString(obj, "cuisine"),
                jsonNumber(obj, "rating"),
                static_cast<int>(jsonNumber(obj, "heat")),
                jsonString(obj, "image")
            });
        }
    }

    void loadUsers() {
        users.clear();
        for (const auto& obj : jsonObjects(readText(dataDir_ / "users.json"))) {
            User user;
            user.id = static_cast<int>(jsonNumber(obj, "id"));
            user.name = jsonString(obj, "name");
            user.preferenceTags = jsonStringArray(obj, "preference_tags");
            user.preferredCategories = jsonStringArray(obj, "preferred_categories");
            user.routeMode = jsonString(obj, "route_mode", "walk");
            user.historySpotIds = jsonNumberArray(obj, "history_spot_ids");
            if (user.id > 0 && !user.name.empty()) users.push_back(user);
        }
    }

    void loadDiaries() {
        diaries.clear();
        fs::path dir = dataDir_ / "diaries";
        if (!fs::exists(dir)) return;
        for (const auto& entry : fs::directory_iterator(dir)) {
            if (entry.path().extension() != ".json") continue;
            if (entry.path().filename() == "index.json") continue;
            std::string obj = readText(entry.path());
            Diary d;
            d.id = static_cast<int>(jsonNumber(obj, "id"));
            d.title = jsonString(obj, "title");
            d.userId = static_cast<int>(jsonNumber(obj, "user_id", 1));
            d.rating = jsonNumber(obj, "rating");
            d.heat = static_cast<int>(jsonNumber(obj, "heat"));
            d.createdAt = jsonString(obj, "created_at");
            d.image = jsonString(obj, "image");
            int bitLength = static_cast<int>(jsonNumber(obj, "bit_length"));
            std::vector<std::pair<int, std::string>> codes;
            size_t codebookPos = obj.find("\"codebook\"");
            if (codebookPos != std::string::npos) {
                for (const auto& cobj : jsonObjects(obj.substr(codebookPos))) {
                    int ch = static_cast<int>(jsonNumber(cobj, "ch", -1));
                    std::string code = jsonString(cobj, "code");
                    if (ch >= 0 && !code.empty()) codes.push_back({ch, code});
                }
            }
            fs::path binPath = entry.path();
            binPath.replace_extension(".bin");
            bool ok = true;
            if (d.id <= 0 || d.title.empty()) {
                ok = false;
                d.loadMessage = "日记元数据缺失";
            } else if (!fs::exists(binPath)) {
                ok = false;
                d.loadMessage = "压缩正文文件缺失";
            } else if (codes.empty() || bitLength <= 0) {
                ok = false;
                d.loadMessage = "编码表为空或 bit_length 无效";
            }
            if (ok) {
                d.content = decodeHuffman(binPath, codes, bitLength, ok);
                if (!ok) d.loadMessage = "Huffman 解码失败";
            }
            if (ok && d.content.empty()) {
                d.decodeOk = false;
                d.loadMessage = "正文为空";
            } else {
                d.decodeOk = ok;
            }
            diaries.push_back(d);
        }
    }

    void saveSpots() const {
        std::ostringstream out;
        out << "[\n";
        for (size_t i = 0; i < spots.size(); ++i) {
            const auto& s = spots[i];
            out << "  {\"id\": " << s.id << ", \"name\": \"" << escapeJson(s.name)
                << "\", \"category\": \"" << escapeJson(s.category)
                << "\", \"rating\": " << s.rating << ", \"heat\": " << s.heat
                << ", \"tags\": \"" << escapeJson(s.tags) << "\"}";
            out << (i + 1 == spots.size() ? "\n" : ",\n");
        }
        out << "]\n";
        writeText(dataDir_ / "spots.json", out.str());
    }

    void saveRoads() const {
        std::ostringstream out;
        out << "[\n";
        for (size_t i = 0; i < roads.size(); ++i) {
            const auto& r = roads[i];
            out << "  {\"from\": " << r.from << ", \"to\": " << r.to
                << ", \"dist_walk\": " << r.distWalk << ", \"dist_bike\": " << r.distBike << "}";
            out << (i + 1 == roads.size() ? "\n" : ",\n");
        }
        out << "]\n";
        writeText(dataDir_ / "roads.json", out.str());
    }

    void saveOsm() const {
        std::ostringstream nodes;
        nodes << "[\n";
        for (size_t i = 0; i < osmNodes.size(); ++i) {
            const auto& n = osmNodes[i];
            nodes << "  {\"id\": " << n.id << ", \"name\": \"" << escapeJson(n.name)
                  << "\", \"lat\": " << n.lat << ", \"lon\": " << n.lon
                  << ", \"type\": \"" << escapeJson(n.type)
                  << "\", \"spot_id\": " << n.spotId
                  << ", \"description\": \"" << escapeJson(n.description)
                  << "\", \"image\": \"" << escapeJson(n.image) << "\"}";
            nodes << (i + 1 == osmNodes.size() ? "\n" : ",\n");
        }
        nodes << "]\n";
        writeText(dataDir_ / "osm_nodes.json", nodes.str());

        std::ostringstream edges;
        edges << "[\n";
        for (size_t i = 0; i < osmEdges.size(); ++i) {
            const auto& e = osmEdges[i];
            edges << "  {\"from\": " << e.from << ", \"to\": " << e.to
                  << ", \"distance\": " << e.distance
                  << ", \"mode\": \"" << escapeJson(e.mode)
                  << "\", \"road_name\": \"" << escapeJson(e.roadName) << "\"}";
            edges << (i + 1 == osmEdges.size() ? "\n" : ",\n");
        }
        edges << "]\n";
        writeText(dataDir_ / "osm_edges.json", edges.str());
    }

    void saveRestaurants() const {
        std::ostringstream out;
        out << "[\n";
        for (size_t i = 0; i < restaurants.size(); ++i) {
            const auto& r = restaurants[i];
            out << "  {\"id\": " << r.id << ", \"name\": \"" << escapeJson(r.name)
                << "\", \"near_spot_id\": " << r.nearSpotId
                << ", \"cuisine\": \"" << escapeJson(r.cuisine)
                << "\", \"rating\": " << r.rating << ", \"heat\": " << r.heat
                << ", \"image\": \"" << escapeJson(r.image) << "\"}";
            out << (i + 1 == restaurants.size() ? "\n" : ",\n");
        }
        out << "]\n";
        writeText(dataDir_ / "restaurants.json", out.str());
    }

    void saveUsers() const {
        std::ostringstream out;
        out << "[\n";
        for (size_t i = 0; i < users.size(); ++i) {
            const auto& u = users[i];
            out << "  {\n"
                << "    \"id\": " << u.id << ",\n"
                << "    \"name\": \"" << escapeJson(u.name) << "\",\n"
                << "    \"preference_tags\": ";
            writeStringArray(out, u.preferenceTags);
            out << ",\n    \"preferred_categories\": ";
            writeStringArray(out, u.preferredCategories);
            out << ",\n    \"route_mode\": \"" << escapeJson(u.routeMode.empty() ? "walk" : u.routeMode) << "\",\n"
                << "    \"history_spot_ids\": ";
            writeNumberArray(out, u.historySpotIds);
            out << "\n  }";
            out << (i + 1 == users.size() ? "\n" : ",\n");
        }
        out << "]\n";
        writeText(dataDir_ / "users.json", out.str());
    }

    static void writeStringArray(std::ostream& out, const std::vector<std::string>& values) {
        out << "[";
        for (size_t i = 0; i < values.size(); ++i) {
            if (i) out << ", ";
            out << "\"" << escapeJson(values[i]) << "\"";
        }
        out << "]";
    }

    static void writeNumberArray(std::ostream& out, const std::vector<int>& values) {
        out << "[";
        for (size_t i = 0; i < values.size(); ++i) {
            if (i) out << ", ";
            out << values[i];
        }
        out << "]";
    }

    static std::vector<unsigned char> encodeHuffman(const std::string& text, std::vector<std::pair<int, std::string>>& codes, int& bitLength) {
        HashMap<int, int> freq;
        for (unsigned char c : text) {
            int* f = freq.get(c);
            freq.insert(c, f ? *f + 1 : 1);
        }

        MinHeap<HuffNode*, HuffCmp> heap;
        for (int c = 0; c < 256; ++c) {
            int* f = freq.get(c);
            if (f) heap.push(new HuffNode{static_cast<unsigned char>(c), *f, nullptr, nullptr});
        }
        if (heap.empty()) {
            bitLength = 0;
            return {};
        }
        while (heap.size() > 1) {
            HuffNode* a = heap.pop();
            HuffNode* b = heap.pop();
            heap.push(new HuffNode{0, a->freq + b->freq, a, b});
        }
        HuffNode* root = heap.pop();
        buildCodes(root, "", codes);

        HashMap<int, std::string> codeByByte;
        for (auto& p : codes) codeByByte.insert(p.first, p.second);

        std::string bits;
        for (unsigned char c : text) bits += *codeByByte.get(c);
        bitLength = static_cast<int>(bits.size());
        std::vector<unsigned char> packed((bits.size() + 7) / 8, 0);
        for (size_t i = 0; i < bits.size(); ++i) {
            if (bits[i] == '1') packed[i / 8] |= static_cast<unsigned char>(1u << (7 - (i % 8)));
        }
        freeHuff(root);
        return packed;
    }

    static std::string decodeHuffman(const fs::path& binPath, const std::vector<std::pair<int, std::string>>& codes, int bitLength, bool& ok) {
        ok = false;
        std::ifstream in(binPath, std::ios::binary);
        if (!in || codes.empty()) return "";
        std::vector<unsigned char> bytes;
        char ch;
        while (in.get(ch)) bytes.push_back(static_cast<unsigned char>(ch));
        if (bitLength < 0 || static_cast<size_t>((bitLength + 7) / 8) > bytes.size()) return "";

        HashMap<std::string, int> byteByCode;
        for (const auto& p : codes) byteByCode.insert(p.second, p.first);

        std::string out;
        std::string cur;
        for (int i = 0; i < bitLength; ++i) {
            bool bit = (bytes[i / 8] >> (7 - (i % 8))) & 1u;
            cur += bit ? '1' : '0';
            int* val = byteByCode.get(cur);
            if (val) {
                out.push_back(static_cast<char>(*val));
                cur.clear();
            }
        }
        if (!cur.empty()) return "";
        ok = true;
        return out;
    }
};

} // namespace tripsystem
