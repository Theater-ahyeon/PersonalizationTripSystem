#pragma once

#include <string>
#include <vector>

namespace tripsystem::models {

struct Spot {
    long id{};
    std::string name;
    std::string category;
    double rating{};
    double heat{};
    std::vector<std::string> tags;
};

struct Road {
    long from{};
    long to{};
    double dist_walk{};
    double dist_bike{};
};

struct Restaurant {
    long id{};
    std::string name;
    long near_spot_id{};
    std::string cuisine;
    double rating{};
    double heat{};
};

struct RecommendationItem {
    Spot spot;
    double score{};
};

struct RestaurantRecommendationItem {
    Restaurant restaurant;
    double score{};
};

struct SearchResult {
    std::vector<std::string> suggestions;
    std::vector<Spot> spots;
    std::vector<Restaurant> restaurants;
};

struct PathStep {
    long id{};
    std::string name;
};

struct PathResult {
    bool found{false};
    double total_cost{};
    std::vector<PathStep> steps;
};

struct DataSummary {
    std::size_t spot_count{};
    std::size_t road_count{};
    std::size_t restaurant_count{};
};

}  // namespace tripsystem::models

