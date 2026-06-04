# 个性化旅游系统 — 架构设计说明

## 1. 设计理念

本系统遵循 **"无数据库、纯内存计算、手写数据结构"** 的设计原则。所有核心数据结构（HashMap、MinHeap、Trie、Graph）和算法（Dijkstra、A*、TSP-DP、KMP、Huffman）均从零实现，不依赖 STL 容器和第三方库。

### 为什么不用数据库？

课程要求明确："不要使用数据库来完成核心功能"。系统的持久化方案是 JSON 文本文件 + Huffman 压缩二进制文件，数据在启动时全部加载到内存，运行期间全部在内存操作，退出时写回文件。

**优点：**
- 无需安装配置数据库，部署零依赖
- 全内存操作，核心算法不受 I/O 瓶颈影响
- JSON 格式可读可调试，便于答辩演示

**缺点（已知并可控）：**
- 内存占用随数据量线性增长
- 崩溃可能丢失未保存数据（已通过退出自动保存缓解）
- 不支持并发访问

---

## 2. 三层架构

```
┌─────────────────────────────────────────────┐
│           CLI 表示层 (app.hpp)               │
│  菜单驱动：推荐 | 路线 | 搜索 | 日记 | 美食   │
├─────────────────────────────────────────────┤
│          Service 业务层 (services.hpp)        │
│  RecommendService  PathPlanner               │
│  SearchService     DiaryService              │
│  FoodService                                 │
├─────────────────────────────────────────────┤
│       DataManager 数据层 (data_manager.hpp)   │
│  JSON 解析 · 二进制 I/O · Huffman 编解码      │
│  索引构建 · 样本数据生成                      │
└─────────────────────────────────────────────┘
```

### 数据流

```
DataManager::load()
  ├── loadSpots()      → spots 向量 + spotById HashMap + trie
  ├── loadRoads()      → graph (邻接表)
  ├── loadOsm()        → osmNodes + osmAdj HashMap
  ├── loadRestaurants() → restaurants + restaurantById HashMap
  └── loadDiaries()    → diaries 向量 + Huffman 解码

[运行期间：所有 Service 通过 DataManager& 访问共享内存数据]

DataManager::save()
  ├── saveSpots()
  ├── saveRoads()
  ├── saveOsm()
  └── saveRestaurants()
```

---

## 3. 模块划分与职责

| 模块 | 文件 | 职责 | 对外接口 |
|------|------|------|---------|
| 数据结构 | `structures.hpp` | HashMap、MinHeap、Trie、Graph | `insert/get/contains`, `push/pop/top`, `autocomplete`, `neighbors` |
| 工具函数 | `utils.hpp` | JSON 解析、KMP 搜索、文件读写、字符串处理 | `jsonObjects`, `jsonString`, `kmpContains`, `readText` |
| 数据模型 | `models.hpp` | Spot、Road、OsmNode、OsmEdge、Restaurant、Diary | 纯数据 struct |
| 数据管理 | `data_manager.hpp` | 加载/保存、Huffman 编码/解码、索引构建、样本数据生成 | `load()`, `save()`, `findSpot()`, `writeDiary()` |
| 推荐服务 | `services.hpp:RecommendService` | Top-K 景点推荐 | `run(data)` |
| 路线规划 | `services.hpp:PathPlanner` | Dijkstra、A*、TSP 多点 | `run(data)` |
| 搜索服务 | `services.hpp:SearchService` | Trie 补全 + KMP 搜索 | `run(data)` |
| 日记服务 | `services.hpp:DiaryService` | 日记 CRUD + Huffman 压缩 | `run(data)` |
| 美食服务 | `services.hpp:FoodService` | Top-5 美食推荐 | `run(data)` |
| 应用入口 | `app.hpp:App` | CLI 菜单循环、协调各 Service | `run()` |
| 程序入口 | `main.cpp` | 解析命令行参数、异常捕获 | `main()` |

---

## 4. 前端架构

前端为**纯静态 HTML5 + Leaflet.js**，无需构建步骤：

```
web/
├── index.html          # 入口，5 个功能视图
├── app.js              # 核心逻辑：数据加载、算法、地图渲染
├── styles.css          # Stitch 风格视觉系统
├── vendor/
│   ├── leaflet.js      # 地图库（本地副本）
│   └── leaflet.css
├── assets/spots/       # 景点 SVG 图标 + 真实照片
└── scripts/
    ├── smoke.ps1       # 前端自动化验收
    └── generate-osm-data.mjs  # OSM 数据采集脚本
```

### 前端数据流

```
DOMContentLoaded
  └── loadJson(cpp/data/*.json)  → state 对象
        ├── initializeMap()       → Leaflet 地图
        ├── buildFacilityGeoIndex() → GeoHash 前缀索引
        ├── buildSimilarityIndexes() → LSH 索引
        ├── renderNodeMarkers()   → 道路节点标注
        ├── renderRoadNetwork()   → 道路网络图层
        ├── recommendSpots()      → Top-K 推荐
        ├── searchFacilities()    → 附近设施
        ├── renderDiaryList()     → 日记列表
        └── recommendFood()       → 美食推荐
```

---

## 5. C++ 与前端的功能分工

| 功能 | C++ CLI | Web 前端 | 说明 |
|------|---------|---------|------|
| Top-K 推荐 | MinHeap + 评分公式 | MinHeap + LSH + 综合评分 | 前端更丰富 |
| Dijkstra 路径 | 手写 MinHeap 优先队列 | 数组排序优先队列 | C++ 性能更优 |
| A* 路径 | Haversine 启发式 | — | 仅 C++ |
| TSP 多点 | 状态压缩 DP (≤12点) | 状态压缩 DP (≤12点) | 两者一致 |
| KMP 搜索 | `kmpContains()` | `kmpContains()` | 算法完全一致 |
| Trie 补全 | 前缀树 | — | 仅 C++ |
| Huffman 压缩 | 真实编码+二进制文件 | 估算压缩率 | C++ 是真实压缩 |
| GeoHash 检索 | — | 前缀桶+图上距离排序 | 仅前端 |
| LSH 相似检索 | — | SimHash+波段索引 | 仅前端 |
| 室内导航 | — | 文昌院模拟图 | 仅前端（演示） |

---

## 6. 关键技术决策

### 决策 1：为什么室内导航只在前端？

室内导航需要交互式地图展示楼层、电梯和房间关系。CLI 文本界面无法有效呈现三层建筑的空间关系。前端使用 Leaflet 绘制节点图 + Dijkstra 计算路径，适合答辩演示。C++ 保留室内图数据结构接口，后续可接入。

### 决策 2：为什么 GeoHash 和 LSH 只在前端？

这些算法主要用于缩小候选集以提高查询效率，在前端实现可以直接绑定地图交互（范围过滤、标记更新）。C++ CLI 的数据规模较小（200 个目的地），线性扫描已足够快，不需要这些高级索引结构。

### 决策 3：为什么推荐权重 C++ 和前端不同？

C++ 权重（0.4/0.4/0.2）面向通用场景，简单直观。前端权重（0.34/0.28/0.38）加入了用户画像、兴趣相似度、LSH 候选集等更细粒度的匹配逻辑。前端面向答辩演示，需要展示更丰富的推荐理由。

### 决策 4：为什么不使用外部 JSON 库？

课程要求核心算法自己实现。`utils.hpp` 中的 `jsonObjects()`、`jsonString()`、`jsonNumber()` 使用轻量正则解析，支持字符串值和数值的基本提取，满足当前数据规模。正则方案的已知限制（不能处理嵌套、不能处理转义引号）在控制的数据文件下不会触发。

---

## 7. 数据规模验证

| 指标 | 课程要求 | 当前数量 | 文件来源 |
|------|---------|---------|---------|
| 景区/校园目的地 | ≥200 | 200 | `spots.json` |
| 内部建筑/景点 | ≥20 | 24 | 颐和园数据包 |
| 服务设施 | ≥50 | 60 | `facilities.json` |
| 设施类别 | ≥10 | 12 | 同上 |
| 道路边 | ≥200 | 526 | `osm_edges.json` |
| 系统用户 | ≥10 | 10 | `users.json` |
| 旅游日记 | ≥1 | 12 | `diaries/index.json` |

---

## 8. 扩展架构：区域数据包

系统支持通过 `regions/manifest.json` 扩展多区域数据包：

```json
{
  "regions": [
    {"id": "summer_palace", "name": "颐和园", "status": "active"},
    {"id": "beijing_city", "name": "北京城区", "status": "planned"},
    {"id": "campus_template", "name": "校园模板", "status": "template"}
  ]
}
```

每个数据包包含独立的 spots、nodes、edges、facilities、restaurants。算法层复用现有 Dijkstra、TSP-DP、GeoHash、LSH、Top-K。
