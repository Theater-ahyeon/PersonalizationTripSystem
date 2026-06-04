cmake_minimum_required(VERSION 3.15)
project(Tripsyt)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 源文件
file(GLOB_RECURSE SOURCES "src/*.cpp")

# 头文件路径
include_directories(src third_party)

# 可执行文件
add_executable(tripsyt ${SOURCES})

# Windows需要链接ws2_32
if(WIN32)
    target_link_libraries(tripsyt ws2_32)
endif()

# 编译选项
if(MSVC)
    # MSVC编译器选项
    target_compile_options(tripsyt PRIVATE /W3 /utf-8)
    # 增大栈空间（图算法可能需要较深递归）
    target_link_options(tripsyt PRIVATE /STACK:8388608)
else()
    # GCC/Clang编译器选项
    target_compile_options(tripsyt PRIVATE -Wall -Wextra)
endif()
