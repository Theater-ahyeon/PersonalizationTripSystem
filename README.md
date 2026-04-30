# PersonalizationTripSystem

个性化旅游系统（数据结构课程设计），当前仓库已经统一为纯 C++17 CLI 版本。

本项目已经切换为单一 C++ 实现，核心能力围绕手写数据结构、经典算法和文件持久化展开，符合“无数据库、全内存运行、JSON + 二进制持久化”的需求文档。

## 项目定位

- 手写 `HashMap`、`MinHeap`、`Trie`、邻接表图等核心数据结构
- 使用 Top-K、A*/最短路、KMP、Huffman 等算法完成推荐、路径、搜索和日记压缩
- 使用 JSON 文件保存景点、道路、餐厅数据
- 使用二进制文件保存 Huffman 压缩后的日记正文
- 通过 CLI 菜单形成课程设计演示闭环

## 快速开始

### 构建

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
```

### 运行

```powershell
.\cpp\build\tripsystem.exe .\cpp\data
```

## 目录结构

```text
.
├── cpp/
│   ├── include/
│   │   └── tripsystem/
│   │       ├── app.hpp
│   │       ├── data_manager.hpp
│   │       ├── models.hpp
│   │       ├── services.hpp
│   │       ├── structures.hpp
│   │       └── utils.hpp
│   ├── src/
│   │   └── main.cpp
│   ├── data/
│   │   └── diaries/
│   ├── scripts/
│   │   └── build.ps1
│   └── README.md
├── docs/
├── plans/
└── reports/
```

## 功能菜单

```text
1 景点推荐
2 路径规划
3 场所搜索
4 旅游日记
5 美食推荐
0 保存并退出
```

## 数据文件

- `cpp/data/spots.json`：景点数据
- `cpp/data/roads.json`：道路边，包含 `dist_walk` 和 `dist_bike`
- `cpp/data/osm_nodes.json`：离线 OpenStreetMap 风格路径节点
- `cpp/data/osm_edges.json`：离线 OpenStreetMap 风格道路边，包含交通方式和道路名
- `cpp/data/restaurants.json`：餐厅数据
- `cpp/data/diaries/{id}.json`：日记元数据和 Huffman 编码表
- `cpp/data/diaries/{id}.bin`：Huffman 压缩后的日记正文

## 文档入口

- [C++ 工程说明](cpp/README.md)
- [核心功能点](docs/个性化旅游系统核心功能点(1).md)
- [软件开发文档](docs/软件开发文档.md)
- [C++ 实施说明](plans/cpp-approach.md)
