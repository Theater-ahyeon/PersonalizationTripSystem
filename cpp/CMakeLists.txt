cmake_minimum_required(VERSION 3.16)
project(tripsystem_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(tripsystem
    src/main.cpp
    src/app/cli_app.cpp
    src/core/data_manager.cpp
)

target_include_directories(tripsystem PRIVATE include)

