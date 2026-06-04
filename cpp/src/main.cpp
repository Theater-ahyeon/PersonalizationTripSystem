#include "tripsystem/app.hpp"

#include <exception>
#include <filesystem>
#include <iostream>

namespace fs = std::filesystem;

int main(int argc, char** argv) {
    fs::path dataDir = argc > 1 ? fs::path(argv[1]) : fs::path("cpp/data");
    try {
        return tripsystem::App(dataDir).run();
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << "\n";
        return 1;
    }
}
