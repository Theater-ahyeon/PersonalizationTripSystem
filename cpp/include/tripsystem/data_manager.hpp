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
            {1, "????", "??", 4.8, 1200, "??,??,??"},
            {2, "????", "??", 4.7, 980, "??,??,??"},
            {3, "?????", "??", 4.6, 860, "??,??,??"},
            {4, "???", "??", 4.9, 1100, "??,??,??"},
            {5, "????", "??", 4.5, 740, "??,??,??"},
            {6, "????", "??", 4.4, 690, "??,??"},
            {7, "????", "??", 4.6, 820, "??,??,??"},
            {8, "???", "??", 4.3, 760, "??,??,??"},
            {9, "????", "??", 4.7, 930, "??,??,??"},
            {10, "????", "??", 4.2, 500, "??,??,??"}
        };
        roads = {
            {1, 2, 300, 120}, {2, 3, 420, 180}, {3, 4, 380, 150}, {4, 5, 500, 220},
            {5, 6, 280, 110}, {6, 7, 360, 160}, {7, 8, 450, 190}, {8, 9, 320, 130},
            {9, 10, 260, 100}, {1, 10, 700, 310}, {2, 7, 620, 260}, {3, 8, 560, 240},
            {4, 9, 470, 200}, {1, 5, 900, 380}
        };
        restaurants = {
            {1, "????", 1, "???", 4.7, 600},
            {2, "????", 2, "??", 4.5, 480},
            {3, "?????", 3, "??", 4.2, 360},
            {4, "????", 4, "??", 4.6, 520},
            {5, "????", 5, "??", 4.8, 710},
            {6, "????", 6, "???", 4.3, 390},
            {7, "????", 7, "??", 4.6, 450},
            {8, "?????", 8, "??", 4.4, 680},
            {9, "????", 9, "??", 4.5, 570}
        };
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
            d.content = decodeHuffman(binPath, codes, bitLength);
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

    static std::string decodeHuffman(const fs::path& binPath, const std::vector<std::pair<int, std::string>>& codes, int bitLength) {
        std::ifstream in(binPath, std::ios::binary);
        if (!in || codes.empty()) return "";
        std::vector<unsigned char> bytes;
        char ch;
        while (in.get(ch)) bytes.push_back(static_cast<unsigned char>(ch));

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
        return out;
    }
};

} // namespace tripsystem
