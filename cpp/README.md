# TripSystem C++ CLI

纯 C++17 个性化旅游系统课程设计实现。C++ CLI 是数据结构和算法主体，前端只负责把同一批 JSON 数据可视化展示。

## 构建

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
```

如果 `g++` 不在 PATH 中，构建脚本会尝试常见 MSYS2 路径。

## 运行

```powershell
.\cpp\build\tripsystem.exe .\cpp\data
```

缺少数据文件时，`DataManager` 会生成颐和园口径的备用样例数据，避免退回旧的 12 节点演示。

## CLI 菜单

```text
1 景点推荐
2 路径规划
3 场所搜索
4 旅游日记
5 美食推荐
0 保存并退出
```

## 模块

- `models.hpp`：景点、道路、OSM 节点、OSM 边、餐厅、日记模型。
- `structures.hpp`：手写 `HashMap`、`MinHeap`、`Trie`、邻接表图。
- `data_manager.hpp`：JSON 加载/保存、索引构建、Huffman 压缩与解压。
- `services.hpp`：推荐、路径、搜索、日记、美食服务。
- `app.hpp`：命令行菜单编排。

## 算法

- Top-K：景点推荐和美食推荐。
- Dijkstra：景点道路图最短路径。
- A*：OSM 路网路径规划。
- TSP-DP：多点游览访问顺序。
- Trie + KMP：场所搜索和日记关键词搜索。
- Huffman：日记正文压缩到 `.bin`。

## 数据

当前提交的数据场景为北京颐和园：

- `osm_nodes.json`：228 个节点，其中 208 个道路节点由 `web/scripts/generate-osm-data.mjs` 通过 Overpass 拉取真实 OpenStreetMap 经纬度生成。
- `osm_edges.json`：526 条有向道路边。
- `spots.json`：24 个景点/建筑/入口。
- `restaurants.json`：50 条餐饮数据。
- `facilities.json`、`users.json`、`diaries/index.json`：前端验收展示数据，C++ CLI 不依赖这些扩展文件。

## 验证

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\smoke.ps1
```

该脚本会构建程序，并用临时数据目录验证景点路径、OSM A*、多点游览、推荐、搜索、日记和美食入口。

## 前端演示

仓库根目录启动：

```powershell
python -m http.server 5173
```

打开 `http://localhost:5173/web/index.html`。前端展示推荐、路线、场所查询、日记、美食和数据概览，地图使用本地 Leaflet 文件，在线瓦片失败时仍保留本地路网和占位底图。
