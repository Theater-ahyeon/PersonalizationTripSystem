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
    AccountService accountService_;

public:
    explicit App(fs::path dataDir) : data_(std::move(dataDir)) {}

    int run() {
        data_.load();
        std::cout << "TripSystem C++ CLI loaded from: " << data_.dataDir().string() << "\n";
        while (true) {
            std::cout << "\n1 景点推荐 / Recommend\n"
                      << "2 路径规划 / Route\n"
                      << "3 场所搜索 / Search\n"
                      << "4 旅游日记 / Diary\n"
                      << "5 美食推荐 / Food\n"
                      << "6 用户系统 / Account\n"
                      << "0 保存并退出 / Save and exit\n请选择: ";
            std::string choice;
            std::getline(std::cin, choice);
            if (std::cin.eof() || std::cin.fail()) {
                data_.save();
                std::cout << "\n输入结束，数据已保存，程序退出。\n";
                return 0;
            }
            if (choice == "1") recommendService_.run(data_);
            else if (choice == "2") pathPlanner_.run(data_);
            else if (choice == "3") searchService_.run(data_);
            else if (choice == "4") diaryService_.run(data_);
            else if (choice == "5") foodService_.run(data_);
            else if (choice == "6") accountService_.run(data_);
            else if (choice == "0") {
                data_.save();
                std::cout << "数据已保存，程序退出。\n";
                return 0;
            } else {
                std::cout << "无效选项。\n";
            }
        }
    }
};

} // namespace tripsystem
