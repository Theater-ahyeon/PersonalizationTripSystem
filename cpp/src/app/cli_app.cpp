#include "tripsystem/app/cli_app.hpp"

#include <iomanip>
#include <iostream>
#include <limits>
#include <string>

namespace tripsystem::app {

CliApp::CliApp(std::filesystem::path data_dir)
    : data_manager_(std::move(data_dir)) {}

void CliApp::run() {
    data_manager_.load();

    std::cout << "TripSystem C++ demo started.\n";
    show_summary();

    while (true) {
        print_menu();
        std::cout << "Select: ";

        int choice = -1;
        if (!(std::cin >> choice)) {
            std::cin.clear();
            std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
            std::cout << "Invalid input.\n";
            continue;
        }
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');

        switch (choice) {
            case 1:
                handle_recommendation();
                break;
            case 2:
                handle_route();
                break;
            case 3:
                handle_search();
                break;
            case 4:
                handle_diary_placeholder();
                break;
            case 5:
                handle_food();
                break;
            case 6:
                show_summary();
                break;
            case 0:
                data_manager_.save();
                std::cout << "Data saved. Bye.\n";
                return;
            default:
                std::cout << "Unknown option.\n";
                break;
        }
    }
}

void CliApp::print_menu() const {
    std::cout << "\n==== Main Menu ====\n"
              << "1. Spot recommendation\n"
              << "2. Route planning\n"
              << "3. Place search\n"
              << "4. Travel diary (coming next)\n"
              << "5. Food recommendation\n"
              << "6. Data summary\n"
              << "0. Exit\n";
}

void CliApp::show_summary() const {
    const auto info = data_manager_.summary();
    std::cout << "Loaded spots=" << info.spot_count
              << ", roads=" << info.road_count
              << ", restaurants=" << info.restaurant_count << "\n";
}

void CliApp::handle_recommendation() {
    std::string tag;
    std::cout << "Tag (empty for overall ranking): ";
    std::getline(std::cin, tag);

    const auto ranked = data_manager_.recommend_spots(tag, 5);
    if (ranked.empty()) {
        std::cout << "No recommendation available.\n";
        return;
    }

    for (std::size_t i = 0; i < ranked.size(); ++i) {
        const auto& item = ranked[i];
        std::cout << i + 1 << ". [" << item.spot.id << "] " << item.spot.name
                  << " score=" << std::fixed << std::setprecision(2) << item.score
                  << " rating=" << item.spot.rating
                  << " heat=" << item.spot.heat << "\n";
    }
}

void CliApp::handle_route() {
    long start = 0;
    long goal = 0;
    int metric_value = 1;

    std::cout << "Start spot id: ";
    std::cin >> start;
    std::cout << "Goal spot id: ";
    std::cin >> goal;
    std::cout << "Metric (1=walk, 2=bike): ";
    std::cin >> metric_value;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');

    const auto metric = metric_value == 2 ? core::Graph::Metric::Bike : core::Graph::Metric::Walk;
    const auto result = data_manager_.shortest_path(start, goal, metric);
    if (!result.found) {
        std::cout << "Path not found.\n";
        return;
    }

    std::cout << "Total cost=" << std::fixed << std::setprecision(2) << result.total_cost << "\n";
    for (std::size_t i = 0; i < result.steps.size(); ++i) {
        if (i > 0) {
            std::cout << " -> ";
        }
        std::cout << result.steps[i].name << "(" << result.steps[i].id << ")";
    }
    std::cout << "\n";
}

void CliApp::handle_search() {
    std::string keyword;
    std::cout << "Keyword: ";
    std::getline(std::cin, keyword);

    const auto result = data_manager_.search(keyword);

    std::cout << "Suggestions:";
    if (result.suggestions.empty()) {
        std::cout << " none";
    } else {
        for (const auto& item : result.suggestions) {
            std::cout << " " << item;
        }
    }
    std::cout << "\n";

    std::cout << "Matched spots:\n";
    for (const auto& spot : result.spots) {
        std::cout << "- [" << spot.id << "] " << spot.name << " rating=" << spot.rating << "\n";
    }
    std::cout << "Matched restaurants:\n";
    for (const auto& restaurant : result.restaurants) {
        std::cout << "- [" << restaurant.id << "] " << restaurant.name << " rating=" << restaurant.rating << "\n";
    }
}

void CliApp::handle_diary_placeholder() const {
    std::cout << "Diary module is the next milestone. The menu entry is reserved for Huffman-based storage.\n";
}

void CliApp::handle_food() {
    long near_spot_id = 0;
    std::cout << "Near which spot id: ";
    std::cin >> near_spot_id;
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');

    const auto ranked = data_manager_.recommend_restaurants(near_spot_id, 3);
    if (ranked.empty()) {
        std::cout << "No nearby restaurant found.\n";
        return;
    }

    for (std::size_t i = 0; i < ranked.size(); ++i) {
        const auto& item = ranked[i];
        std::cout << i + 1 << ". [" << item.restaurant.id << "] " << item.restaurant.name
                  << " cuisine=" << item.restaurant.cuisine
                  << " score=" << std::fixed << std::setprecision(2) << item.score << "\n";
    }
}

}  // namespace tripsystem::app

