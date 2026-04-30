# TripSystem C++ CLI

纯 C++17 个性化旅游系统课程设计实现。项目不使用数据库，不保留 Java/Spring Boot 后端，核心功能基于手写数据结构、经典算法、JSON 文件和日记二进制压缩文件完成。

## 构建

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
```

## 运行

```powershell
.\cpp\build\tripsystem.exe .\cpp\data
```

首次运行如果缺少数据文件，会自动生成示例数据：

- `cpp/data/spots.json`
- `cpp/data/roads.json`
- `cpp/data/restaurants.json`
- `cpp/data/osm_nodes.json`
- `cpp/data/osm_edges.json`
- `cpp/data/diaries/*.json`
- `cpp/data/diaries/*.bin`

## CLI 菜单

```text
1 景点推荐
2 路径规划
3 场所搜索
4 旅游日记
5 美食推荐
0 保存并退出
```

## 模块拆分

当前工程已经从单文件拆分为多个职责模块：

- `models.hpp`：景点、道路、OSM 节点、餐厅、日记等数据模型
- `structures.hpp`：手写 `HashMap`、`MinHeap`、`Trie`、邻接表 `Graph`
- `utils.hpp`：JSON 轻量解析、字符串处理、KMP 工具
- `data_manager.hpp`：数据加载、保存、索引构建、Huffman 压缩与解压
- `services.hpp`：`RecommendService`、`PathPlanner`、`SearchService`、`DiaryService`、`FoodService`
- `app.hpp`：主菜单编排
- `src/main.cpp`：程序入口

## 第二版模块优化

- 景点推荐：使用 `rating 0.4 + heat 0.4 + tagMatch 0.2` 的固定权重，仍通过手写 `MinHeap` 做 Top-K。
- 场所搜索：使用 Trie 自动补全、KMP 匹配、HashMap 去重，并按匹配类型、评分、热度、名称排序。
- 美食推荐：按当前景点筛选附近餐厅，使用 `rating 0.5 + heat 0.3 + cuisineMatch 0.2` 的权重做 Top-5。
- 旅游日记：保留 Huffman 压缩存储，增加样例日记，并对缺文件、空内容、解码失败做可读提示。

## 已实现算法与数据结构

- 手写 `HashMap`：ID 索引、搜索去重、Huffman 频率统计
- 手写 `MinHeap`：Top-K、路径优先队列、Huffman 构树
- 手写 `Trie`：名称前缀补全
- 邻接表 `Graph`：步行/骑行双权重道路图
- `Top-K`：景点与美食推荐
- `A*`：基于离线 OpenStreetMap 样例节点和道路边进行路径规划
- `KMP`：场所与日记关键词匹配
- `Huffman`：日记正文压缩为 `.bin`，编码表写入 `.json`

## 路径规划第二版（OSM）

`2 路径规划` 下包含两个入口：

- `1 第一版景点路径`：使用 `roads.json` 中的景点道路图。
- `2 第二版 OSM 路径规划`：使用 `osm_nodes.json` 和 `osm_edges.json`，通过 A* 搜索输出节点、道路名和总距离。

OSM 样例数据采用离线 JSON，不依赖网络接口，便于课程演示。

## 旅游日记第一版（Huffman）

写日记时，正文会按 UTF-8 字节进行 Huffman 编码压缩：

- `{id}.bin` 保存压缩后的 bit 流。
- `{id}.json` 保存标题、评分、创建时间、原始字节数、压缩字节数、bit 长度和编码表。
- 程序启动时自动根据编码表解压正文，浏览日记时展示原文。
