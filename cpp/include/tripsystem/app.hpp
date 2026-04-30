#pragma once

#include "tripsystem/data_manager.hpp"
#include "tripsystem/services.hpp"

#include <filesystem>
#include <iostream>
#include <string>
#include <utility>

namespace tripsystem {

class App {
    DataManager data_;
    RecommendService recommendService_;
    PathPlanner pathPlanner_;
    SearchService searchService_;
    DiaryService diaryService_;
    FoodService foodService_;

public:
    explicit App(fs::path dataDir) : data_(std::move(dataDir)) {}

    int run() {
        data_.load();
        std::cout << "TripSystem C++ CLI loaded from: " << data_.dataDir().string() << "\n";
        while (true) {
            std::cout << "\n1 ????\n2 ????\n3 ????\n4 ????\n5 ????\n0 ?????\n???: ";
            std::string choice;
            std::getline(std::cin, choice);
            if (choice == "1") recommendService_.run(data_);
            else if (choice == "2") pathPlanner_.run(data_);
            else if (choice == "3") searchService_.run(data_);
            else if (choice == "4") diaryService_.run(data_);
            else if (choice == "5") foodService_.run(data_);
            else if (choice == "0") {
                data_.save();
                std::cout << "?????????\n";
                return 0;
            } else {
                std::cout << "?????\n";
            }
        }
    }
};

} // namespace tripsystem
