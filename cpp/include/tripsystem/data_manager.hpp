#pragma once

#include "tripsystem/models.hpp"
#include "tripsystem/structures.hpp"
#include "tripsystem/utils.hpp"

#include <algorithm>
#include <fstream>
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
    std::vector<Restaurant> restaurants;
    std::vector<Diary> diaries;
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
            !fs::exists(dataDir_ / "restaurants.json")) {
            generateSampleData();
            save();
        }
        loadSpots();
        loadRoads();
        loadOsm();
        loadRestaurants();
        loadDiaries();
        if (diaries.empty()) {
            generateSampleDiaries();
            loadDiaries();
        }
        if (spots.empty() || roads.empty() || restaurants.empty()) {
            generateSampleData();
            save();
        }
        buildIndexes();
    }

    void save() const {
        saveSpots();
        saveRoads();
        saveRestaurants();
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
            {1, "太湖广场", "自然", 4.8, 1200, "湖泊,广场,拍照"},
            {2, "樱花大道", "自然", 4.7, 980, "花海,步行,拍照"},
            {3, "历史博物馆", "文化", 4.6, 860, "历史,展览,室内"},
            {4, "观景塔", "观景", 4.9, 1100, "登高,夜景,地标"},
            {5, "水上码头", "休闲", 4.5, 740, "游船,亲水,休闲"},
            {6, "儿童乐园", "亲子", 4.4, 690, "亲子,娱乐"},
            {7, "竹林步道", "自然", 4.6, 820, "徒步,清静,森林"},
            {8, "民俗街", "文化", 4.3, 760, "非遗,购物,小吃"},
            {9, "音乐喷泉", "休闲", 4.7, 930, "夜景,表演,广场"},
            {10, "游客中心", "服务", 4.2, 500, "咨询,入口,服务"}
        };
        roads = {
            {1, 2, 300, 120}, {2, 3, 420, 180}, {3, 4, 380, 150}, {4, 5, 500, 220},
            {5, 6, 280, 110}, {6, 7, 360, 160}, {7, 8, 450, 190}, {8, 9, 320, 130},
            {9, 10, 260, 100}, {1, 10, 700, 310}, {2, 7, 620, 260}, {3, 8, 560, 240},
            {4, 9, 470, 200}, {1, 5, 900, 380}
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
            {9, "喷泉夜宵", 9, "夜宵", 4.5, 570}
        };
    }

    void generateSampleDiaries() {
        fs::create_directories(dataDir_ / "diaries");
        std::vector<Diary> samples = {
            {1, "湖边散步记录", 4.8, 12, "2026-04-30 09:00:00",
             "今天从游客中心出发，沿着太湖广场慢慢走到湖边，风很舒服，适合拍照和休息。"},
            {2, "樱花大道游记", 4.6, 8, "2026-04-30 10:30:00",
             "樱花大道人不算多，花海和步道都很适合散步，后面可以和历史博物馆安排在同一条路线。"},
            {3, "夜晚音乐喷泉", 4.9, 18, "2026-04-30 19:40:00",
             "晚上看了音乐喷泉，灯光和水幕效果很好，附近的夜宵也方便，适合放在一天行程的最后。"}
        };
        for (const auto& d : samples) {
            fs::path jsonPath = dataDir_ / "diaries" / (std::to_string(d.id) + ".json");
            fs::path binPath = dataDir_ / "diaries" / (std::to_string(d.id) + ".bin");
            if (!fs::exists(jsonPath) || !fs::exists(binPath)) {
                writeDiary(d);
            }
        }
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
            osmNodes.push_back({static_cast<int>(jsonNumber(obj, "id")), jsonString(obj, "name"), jsonNumber(obj, "lat"), jsonNumber(obj, "lon"), jsonString(obj, "type")});
        }
        for (const auto& obj : jsonObjects(readText(dataDir_ / "osm_edges.json"))) {
            osmEdges.push_back({static_cast<int>(jsonNumber(obj, "from")), static_cast<int>(jsonNumber(obj, "to")), jsonNumber(obj, "distance"), jsonString(obj, "mode"), jsonString(obj, "road_name")});
        }
    }

    void loadRestaurants() {
        restaurants.clear();
        for (const auto& obj : jsonObjects(readText(dataDir_ / "restaurants.json"))) {
            restaurants.push_back({static_cast<int>(jsonNumber(obj, "id")), jsonString(obj, "name"), static_cast<int>(jsonNumber(obj, "near_spot_id")), jsonString(obj, "cuisine"), jsonNumber(obj, "rating"), static_cast<int>(jsonNumber(obj, "heat"))});
        }
    }

    void loadDiaries() {
        diaries.clear();
        fs::path dir = dataDir_ / "diaries";
        if (!fs::exists(dir)) return;
        for (const auto& entry : fs::directory_iterator(dir)) {
            if (entry.path().extension() != ".json") continue;
            std::string obj = readText(entry.path());
            Diary d;
            d.id = static_cast<int>(jsonNumber(obj, "id"));
            d.title = jsonString(obj, "title");
            d.rating = jsonNumber(obj, "rating");
            d.heat = static_cast<int>(jsonNumber(obj, "heat"));
            d.createdAt = jsonString(obj, "created_at");
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

    void saveRestaurants() const {
        std::ostringstream out;
        out << "[\n";
        for (size_t i = 0; i < restaurants.size(); ++i) {
            const auto& r = restaurants[i];
            out << "  {\"id\": " << r.id << ", \"name\": \"" << escapeJson(r.name)
                << "\", \"near_spot_id\": " << r.nearSpotId
                << ", \"cuisine\": \"" << escapeJson(r.cuisine)
                << "\", \"rating\": " << r.rating << ", \"heat\": " << r.heat << "}";
            out << (i + 1 == restaurants.size() ? "\n" : ",\n");
        }
        out << "]\n";
        writeText(dataDir_ / "restaurants.json", out.str());
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
