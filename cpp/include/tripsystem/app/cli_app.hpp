#pragma once

#include <filesystem>

#include "tripsystem/core/data_manager.hpp"

namespace tripsystem::app {

class CliApp {
public:
    explicit CliApp(std::filesystem::path data_dir);
    void run();

private:
    void print_menu() const;
    void show_summary() const;
    void handle_recommendation();
    void handle_route();
    void handle_search();
    void handle_diary_placeholder() const;
    void handle_food();

    core::DataManager data_manager_;
};

}  // namespace tripsystem::app

