#include <filesystem>
#include <iostream>

#include "tripsystem/app/cli_app.hpp"

int main(int argc, char* argv[]) {
    try {
        std::filesystem::path data_dir = std::filesystem::path("data");
        if (argc > 1) {
            data_dir = argv[1];
        }

        tripsystem::app::CliApp app(data_dir);
        app.run();
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "Fatal error: " << ex.what() << "\n";
        return 1;
    }
}

