#pragma once

#include <filesystem>
#include <string>
#include <vector>

#include "tripsystem/core/graph.hpp"
#include "tripsystem/core/hash_map.hpp"
#include "tripsystem/core/trie.hpp"
#include "tripsystem/models/domain.hpp"

namespace tripsystem::core {

class DataManager {
public:
    explicit DataManager(std::filesystem::path data_dir);

    void load();
    void save() const;

    models::DataSummary summary() const;
    std::vector<models::RecommendationItem> recommend_spots(const std::string& tag, std::size_t k) const;
    models::PathResult shortest_path(long start, long goal, Graph::Metric metric) const;
    models::SearchResult search(const std::string& keyword) const;
    std::vector<models::RestaurantRecommendationItem> recommend_restaurants(long near_spot_id, std::size_t k) const;

    const models::Spot* find_spot(long id) const;

private:
    void bootstrap_demo_data();
    void rebuild_indexes();

    void load_spots();
    void load_roads();
    void load_restaurants();

    void save_spots() const;
    void save_roads() const;
    void save_restaurants() const;

    std::filesystem::path data_dir_;
    std::vector<models::Spot> spots_;
    std::vector<models::Road> roads_;
    std::vector<models::Restaurant> restaurants_;
    Graph graph_;
    Trie name_trie_;
    HashMap<long, std::size_t> spot_index_by_id_;
    HashMap<long, std::size_t> restaurant_index_by_id_;
};

}  // namespace tripsystem::core

