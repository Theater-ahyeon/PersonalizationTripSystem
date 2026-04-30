# C++ 纯数据结构实现方案

## 目标

本仓库只保留 C++17 CLI 实现，不再使用 Web 后端、数据库或接口服务。系统启动时从文件加载数据到内存，运行期全部操作手写数据结构，退出时写回 JSON；旅游日记正文使用 Huffman 压缩写入二进制文件。

## 架构

- CLI 表示层：固定菜单入口，负责输入输出。
- Service 业务层：推荐、路径、搜索、日记、美食等业务流程。
- DataManager 数据层：加载和保存 `cpp/data/` 下的数据文件，并初始化图、Trie、HashMap 等内存结构。

## 核心数据结构

- `HashMap`：链地址法，支持自动 rehash，用于 ID 索引、去重和频率统计。
- `MinHeap`：数组二叉堆，用于 Top-K、路径搜索和 Huffman 构树。
- `Trie`：`vector<pair<unsigned char, Node*>>` 子节点结构，用于名称补全。
- `Graph`：邻接表道路图，边包含步行和骑行两种权重。

## 核心算法

- 景点推荐：Top-K 小顶堆，`O(N log K)`。
- 路径规划：第一版基于景点道路图；第二版基于离线 OpenStreetMap 风格节点和道路边，使用 A* + Haversine 启发函数，支持步行/骑行过滤。
- 场所搜索：Trie 前缀补全 + KMP 关键词匹配 + HashMap 去重。
- 日记管理：第一版完成 Huffman 编码压缩和启动解压读取，后续再扩展完整管理能力。
- 美食推荐：按当前景点筛选餐厅后进行 Top-K 推荐。

## 构建运行

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
.\cpp\build\tripsystem.exe .\cpp\data
```
