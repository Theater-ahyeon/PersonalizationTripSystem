#include "tripsystem/core/data_manager.hpp"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <optional>
#include <regex>
#include <sstream>

#include "tripsystem/core/min_heap.hpp"
#include "tripsystem/core/string_match.hpp"

namespace tripsystem::core {

using tripsystem::models::RecommendationItem;
using tripsystem::models::Restaurant;
using tripsystem::models::RestaurantRecommendationItem;
using tripsystem::models::Road;
using tripsystem::models::SearchResult;
using tripsystem::models::Spot;

namespace {

std::string trim(const std::string& value) {
    const auto first = value.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) {
        return "";
    }
    const auto last = value.find_last_not_of(" \t\r\n");
    return value.substr(first, last - first + 1);
}

std::string to_lower(std::string value) {
    for (auto& ch : value) {
        ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
    }
    return value;
}

std::vector<std::string> split_csv(const std::string& value) {
    std::vector<std::string> out;
    std::stringstream stream(value);
    std::string item;
    while (std::getline(stream, item, ',')) {
        auto token = trim(item);
        if (!token.empty()) {
            out.push_back(token);
        }
    }
    return out;
}

std::string join_csv(const std::vector<std::string>& items) {
    std::ostringstream out;
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i > 0) {
            out << ",";
        }
        out << items[i];
    }
    return out.str();
}

std::string escape_json(std::string value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (char ch : value) {
        switch (ch) {
            case '\\':
                out += "\\\\";
                break;
            case '"':
                out += "\\\"";
                break;
            case '\n':
                out += "\\n";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

std::vector<std::string> extract_objects(const std::string& text) {
    std::vector<std::string> objects;
    const std::regex object_regex(R"(\{[^{}]*\})");
    for (std::sregex_iterator it(text.begin(), text.end(), object_regex), end; it != end; ++it) {
        objects.push_back(it->str());
    }
    return objects;
}

std::optional<std::string> extract_string_field(const std::string& object, const std::string& key) {
    const std::regex pattern("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"");
    std::smatch match;
    if (std::regex_search(object, match, pattern)) {
        return match[1].str();
    }
    return std::nullopt;
}

std::optional<long> extract_long_field(const std::string& object, const std::string& key) {
    const std::regex pattern("\"" + key + R"("\s*:\s*(-?\d+))");
    std::smatch match;
    if (std::regex_search(object, match, pattern)) {
        return std::stol(match[1].str());
    }
    return std::nullopt;
}

std::optional<double> extract_double_field(const std::string& object, const std::string& key) {
    const std::regex pattern("\"" + key + R"("\s*:\s*(-?\d+(?:\.\d+)?))");
    std::smatch match;
    if (std::regex_search(object, match, pattern)) {
        return std::stod(match[1].str());
    }
    return std::nullopt;
}

template <typename T, typename Scorer>
std::vector<std::pair<T, double>> top_k(const std::vector<T>& items, std::size_t k, Scorer scorer) {
    struct Node {
        std::size_t index{};
        double score{};
    };

    auto compare = [](const Node& lhs, const Node& rhs) {
        return lhs.score < rhs.score;
    };
    MinHeap<Node, decltype(compare)> heap(compare);

    for (std::size_t i = 0; i < items.size(); ++i) {
        const auto score = scorer(items[i]);
        if (heap.size() < k) {
            heap.push(Node{i, score});
        } else if (score > heap.top().score) {
            heap.pop();
            heap.push(Node{i, score});
        }
    }

    std::vector<std::pair<T, double>> result;
    while (!heap.empty()) {
        auto node = heap.top();
        heap.pop();
        result.push_back({items[node.index], node.score});
    }
    std::sort(result.begin(), result.end(),
              [](const auto& lhs, const auto& rhs) { return lhs.second > rhs.second; });
    return result;
}

}  // namespace

DataManager::DataManager(std::filesystem::path data_dir)
    : data_dir_(std::move(data_dir)) {}

void DataManager::load() {
    std::filesystem::create_directories(data_dir_);

    const auto spots_file = data_dir_ / "spots.json";
    const auto roads_file = data_dir_ / "roads.json";
    const auto restaurants_file = data_dir_ / "restaurants.json";

    if (!std::filesystem::exists(spots_file) ||
        !std::filesystem::exists(roads_file) ||
        !std::filesystem::exists(restaurants_file)) {
        bootstrap_demo_data();
        save();
    } else {
        load_spots();
        load_roads();
        load_restaurants();
    }

    rebuild_indexes();
}

void DataManager::save() const {
    std::filesystem::create_directories(data_dir_);
    save_spots();
    save_roads();
    save_restaurants();
}

models::DataSummary DataManager::summary() const {
    return models::DataSummary{spots_.size(), roads_.size(), restaurants_.size()};
}

std::vector<RecommendationItem> DataManager::recommend_spots(const std::string& tag, std::size_t k) const {
    const auto normalized_tag = to_lower(trim(tag));
    const auto ranked = top_k(spots_, k, [&](const Spot& spot) {
        double tag_bonus = 0.0;
        if (!normalized_tag.empty()) {
            for (const auto& candidate : spot.tags) {
                if (to_lower(candidate) == normalized_tag) {
                    tag_bonus = 1.0;
                    break;
                }
            }
        }
        return 0.45 * spot.rating + 0.35 * spot.heat + 0.20 * tag_bonus * 100.0;
    });

    std::vector<RecommendationItem> result;
    result.reserve(ranked.size());
    for (const auto& [spot, score] : ranked) {
        result.push_back({spot, score});
    }
    return result;
}

models::PathResult DataManager::shortest_path(long start, long goal, Graph::Metric metric) const {
    const auto raw = graph_.shortest_path(start, goal, metric);
    if (!raw.found) {
        return {};
    }

    models::PathResult result;
    result.found = true;
    result.total_cost = raw.total_cost;
    for (long id : raw.path_ids) {
        if (const auto* spot = find_spot(id); spot != nullptr) {
            result.steps.push_back({id, spot->name});
        } else {
            result.steps.push_back({id, "Unknown"});
        }
    }
    return result;
}

SearchResult DataManager::search(const std::string& keyword) const {
    SearchResult result;
    const auto normalized = to_lower(trim(keyword));
    if (normalized.empty()) {
        return result;
    }

    result.suggestions = name_trie_.autocomplete(normalized, 5);

    for (const auto& spot : spots_) {
        if (kmp_contains(to_lower(spot.name), normalized)) {
            result.spots.push_back(spot);
        }
    }
    for (const auto& restaurant : restaurants_) {
        if (kmp_contains(to_lower(restaurant.name), normalized)) {
            result.restaurants.push_back(restaurant);
        }
    }

    std::sort(result.spots.begin(), result.spots.end(),
              [](const Spot& lhs, const Spot& rhs) { return lhs.rating > rhs.rating; });
    std::sort(result.restaurants.begin(), result.restaurants.end(),
              [](const Restaurant& lhs, const Restaurant& rhs) { return lhs.rating > rhs.rating; });

    return result;
}

std::vector<RestaurantRecommendationItem> DataManager::recommend_restaurants(long near_spot_id, std::size_t k) const {
    std::vector<Restaurant> candidates;
    for (const auto& restaurant : restaurants_) {
        if (restaurant.near_spot_id == near_spot_id) {
            candidates.push_back(restaurant);
        }
    }

    const auto ranked = top_k(candidates, k, [](const Restaurant& item) {
        return 0.5 * item.rating + 0.5 * item.heat;
    });

    std::vector<RestaurantRecommendationItem> result;
    result.reserve(ranked.size());
    for (const auto& [restaurant, score] : ranked) {
        result.push_back({restaurant, score});
    }
    return result;
}

const Spot* DataManager::find_spot(long id) const {
    const auto* index = spot_index_by_id_.find(id);
    if (index == nullptr) {
        return nullptr;
    }
    return &spots_[*index];
}

void DataManager::bootstrap_demo_data() {
    spots_ = {
        {1, "north-gate", "gate", 4.4, 120, {"entry", "gate"}},
        {2, "lake-square", "scenery", 4.8, 340, {"lake", "photo", "relax"}},
        {3, "library", "building", 4.6, 210, {"study", "quiet"}},
        {4, "museum", "scenery", 4.7, 260, {"history", "culture"}},
        {5, "sports-center", "facility", 4.3, 180, {"sport", "active"}},
        {6, "south-garden", "scenery", 4.5, 240, {"garden", "relax"}}
    };

    roads_ = {
        {1, 2, 130.0, 55.0},
        {2, 3, 90.0, 35.0},
        {3, 4, 140.0, 60.0},
        {2, 4, 160.0, 70.0},
        {4, 5, 110.0, 45.0},
        {5, 6, 120.0, 50.0},
        {2, 6, 200.0, 80.0}
    };

    restaurants_ = {
        {101, "lake-cafe", 2, "coffee", 4.7, 220},
        {102, "book-bistro", 3, "western", 4.4, 170},
        {103, "museum-noodle", 4, "chinese", 4.5, 200},
        {104, "arena-burger", 5, "fastfood", 4.1, 150},
        {105, "garden-tea", 6, "tea", 4.6, 190}
    };
}

void DataManager::rebuild_indexes() {
    graph_.clear();
    name_trie_.clear();
    spot_index_by_id_.clear();
    restaurant_index_by_id_.clear();

    for (std::size_t i = 0; i < spots_.size(); ++i) {
        spot_index_by_id_.insert_or_assign(spots_[i].id, i);
        name_trie_.insert(to_lower(spots_[i].name));
        graph_.ensure_node(spots_[i].id);
    }

    for (std::size_t i = 0; i < restaurants_.size(); ++i) {
        restaurant_index_by_id_.insert_or_assign(restaurants_[i].id, i);
        name_trie_.insert(to_lower(restaurants_[i].name));
    }

    for (const auto& road : roads_) {
        graph_.add_undirected_edge(road.from, road.to, road.dist_walk, road.dist_bike);
    }
}

void DataManager::load_spots() {
    spots_.clear();
    std::ifstream input(data_dir_ / "spots.json");
    std::stringstream buffer;
    buffer << input.rdbuf();

    for (const auto& object : extract_objects(buffer.str())) {
        Spot spot;
        spot.id = extract_long_field(object, "id").value_or(0);
        spot.name = extract_string_field(object, "name").value_or("");
        spot.category = extract_string_field(object, "category").value_or("");
        spot.rating = extract_double_field(object, "rating").value_or(0.0);
        spot.heat = extract_double_field(object, "heat").value_or(0.0);
        spot.tags = split_csv(extract_string_field(object, "tags").value_or(""));
        if (spot.id != 0 && !spot.name.empty()) {
            spots_.push_back(std::move(spot));
        }
    }
}

void DataManager::load_roads() {
    roads_.clear();
    std::ifstream input(data_dir_ / "roads.json");
    std::stringstream buffer;
    buffer << input.rdbuf();

    for (const auto& object : extract_objects(buffer.str())) {
        Road road;
        road.from = extract_long_field(object, "from").value_or(0);
        road.to = extract_long_field(object, "to").value_or(0);
        road.dist_walk = extract_double_field(object, "dist_walk").value_or(0.0);
        road.dist_bike = extract_double_field(object, "dist_bike").value_or(0.0);
        if (road.from != 0 && road.to != 0) {
            roads_.push_back(std::move(road));
        }
    }
}

void DataManager::load_restaurants() {
    restaurants_.clear();
    std::ifstream input(data_dir_ / "restaurants.json");
    std::stringstream buffer;
    buffer << input.rdbuf();

    for (const auto& object : extract_objects(buffer.str())) {
        Restaurant restaurant;
        restaurant.id = extract_long_field(object, "id").value_or(0);
        restaurant.name = extract_string_field(object, "name").value_or("");
        restaurant.near_spot_id = extract_long_field(object, "near_spot_id").value_or(0);
        restaurant.cuisine = extract_string_field(object, "cuisine").value_or("");
        restaurant.rating = extract_double_field(object, "rating").value_or(0.0);
        restaurant.heat = extract_double_field(object, "heat").value_or(0.0);
        if (restaurant.id != 0 && !restaurant.name.empty()) {
            restaurants_.push_back(std::move(restaurant));
        }
    }
}

void DataManager::save_spots() const {
    std::ofstream output(data_dir_ / "spots.json", std::ios::trunc);
    output << "[\n";
    for (std::size_t i = 0; i < spots_.size(); ++i) {
        const auto& spot = spots_[i];
        output << "  {\"id\":" << spot.id
               << ",\"name\":\"" << escape_json(spot.name)
               << "\",\"category\":\"" << escape_json(spot.category)
               << "\",\"rating\":" << std::fixed << std::setprecision(2) << spot.rating
               << ",\"heat\":" << std::fixed << std::setprecision(2) << spot.heat
               << ",\"tags\":\"" << escape_json(join_csv(spot.tags)) << "\"}";
        if (i + 1 != spots_.size()) {
            output << ",";
        }
        output << "\n";
    }
    output << "]\n";
}

void DataManager::save_roads() const {
    std::ofstream output(data_dir_ / "roads.json", std::ios::trunc);
    output << "[\n";
    for (std::size_t i = 0; i < roads_.size(); ++i) {
        const auto& road = roads_[i];
        output << "  {\"from\":" << road.from
               << ",\"to\":" << road.to
               << ",\"dist_walk\":" << std::fixed << std::setprecision(2) << road.dist_walk
               << ",\"dist_bike\":" << std::fixed << std::setprecision(2) << road.dist_bike
               << "}";
        if (i + 1 != roads_.size()) {
            output << ",";
        }
        output << "\n";
    }
    output << "]\n";
}

void DataManager::save_restaurants() const {
    std::ofstream output(data_dir_ / "restaurants.json", std::ios::trunc);
    output << "[\n";
    for (std::size_t i = 0; i < restaurants_.size(); ++i) {
        const auto& restaurant = restaurants_[i];
        output << "  {\"id\":" << restaurant.id
               << ",\"name\":\"" << escape_json(restaurant.name)
               << "\",\"near_spot_id\":" << restaurant.near_spot_id
               << ",\"cuisine\":\"" << escape_json(restaurant.cuisine)
               << "\",\"rating\":" << std::fixed << std::setprecision(2) << restaurant.rating
               << ",\"heat\":" << std::fixed << std::setprecision(2) << restaurant.heat
               << "}";
        if (i + 1 != restaurants_.size()) {
            output << ",";
        }
        output << "\n";
    }
    output << "]\n";
}

}  // namespace tripsystem::core
