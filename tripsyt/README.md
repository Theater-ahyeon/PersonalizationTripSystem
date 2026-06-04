# 🗺️ Tripsyt — 个性化旅游系统

一个基于 C++17 构建的综合性旅游管理与推荐系统，集成了景区查询、智能推荐、路径规划、室内导航、美食推荐、游记分享等功能，并通过 HTTP API + Web 前端提供服务。

## 📁 项目结构

```
tripsyt/
├── CMakeLists.txt              # CMake 构建配置
├── README.md
├── data/                       # 数据目录
├── frontend/                   # Web 前端
│   ├── index.html              # 主页面 (SPA)
│   ├── css/
│   │   └── style.css           # 样式表
│   └── js/
│       └── app.js              # 前端交互逻辑
├── src/
│   ├── main.cpp                # 程序入口，数据初始化 & 服务器启动
│   ├── core/                   # 核心数据结构 & 算法
│   │   ├── my_stl.h            # 自实现 STL（Vector, HashMap, PriorityQueue 等）
│   │   ├── my_vector.h         # 动态数组
│   │   ├── my_hashmap.h        # 哈希表（链地址法）
│   │   ├── min_heap.h          # 最小堆 / 优先队列
│   │   ├── graph.h             # 图数据结构（邻接表）
│   │   ├── trie.h              # 前缀树（Trie，支持模糊搜索）
│   │   ├── huffman.h           # 哈夫曼编码（数据压缩）
│   │   ├── algorithm.h         # 图算法（Dijkstra, A*, 拓扑排序等）
│   │   ├── algorithms.h        # 排序算法集合
│   │   ├── search_algorithms.h # 搜索算法集合
│   │   ├── sort_algorithms.h   # 排序算法
│   │   └── tourism_system.h    # 旅游系统核心：数据类型 + 业务逻辑
│   ├── logic/                  # 业务逻辑模块
│   │   ├── route_planner.h/cpp # 路径规划（最短路径 / 最快路径 / 多点路线）
│   │   ├── place_query.h/cpp   # 地点查询（关键字搜索 & 分类筛选）
│   │   ├── recommend.h/cpp     # 智能推荐（热度 / 评分排序）
│   │   ├── food_recommend.h/cpp# 美食推荐
│   │   ├── diary_manager.h/cpp # 游记管理（CRUD）
│   │   └── diary_exchange.h/cpp# 游记分享 & 交互
│   ├── models/
│   │   └── models.h            # 数据模型定义
│   ├── web/
│   │   ├── api_router.h/cpp    # RESTful API 路由 & 处理
│   │   └── (HTTP 请求分发)
│   └── adapter/
│       └── json_util.h         # JSON 序列化 / 反序列化工具
├── third_party/
│   └── httplib.h               # cpp-httplib（轻量 HTTP 库）
└── tests/                      # 单元测试（已迁移至 C++ 测试框架）
```

## 🚀 快速开始

### 环境要求

- **编译器**: MSVC (Visual Studio 2019+) / GCC 9+ / Clang 10+
- **CMake**: 3.15+
- **系统**: Windows / Linux / macOS

### 构建 & 运行

```bash
# 1. 创建构建目录
cmake -B build -DCMAKE_BUILD_TYPE=Release

# 2. 编译
cmake --build build --config Release

# 3. 运行
./build/tripsyt         # Linux / macOS
# 或
build\Release\tripsyt.exe   # Windows
```

启动后访问 `http://localhost:8080` 使用 Web 界面。

## 🔌 API 接口

### 景区 & 建筑

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/areas` | 获取景区列表（支持 `sort`, `topK`, `keyword`, `category`） |
| `GET` | `/api/areas/:id` | 获取景区详情 |
| `GET` | `/api/buildings` | 获取景区内建筑（`?areaId=`） |

### 智能推荐

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/recommend` | 推荐景区（按热度 / 评分，`?sort=heat&topK=10`） |

### 路线规划

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/route/shortest` | 最短距离路径 |
| `POST` | `/api/route/fastest` | 最快时间路径 |
| `POST` | `/api/route/multipoint` | 多点路线规划 |
| `POST` | `/api/route/transport` | 交通工具路线（步行 / 骑行 / 观光车） |
| `POST` | `/api/route/indoor` | 室内导航（教学楼 / 商场） |

### 服务设施

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/facilities` | 设施查询（洗手间、停车场、商店等） |

### 美食推荐

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/foods` | 美食列表（支持 `areaId`, `cuisine`, `sort`） |

### 游记 & 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/diaries` | 游记列表 |
| `GET` | `/api/diaries/:id` | 游记详情 |
| `GET` | `/api/diaries/search` | 游记搜索（`?q=keyword`） |
| `POST` | `/api/users/login` | 用户登录 |
| `GET` | `/api/users/:id` | 用户信息 |

## 🧩 核心功能

### 1. 景区管理
- 200 个景区 / 校园，支持按热度、评分、名称、分类排序和搜索
- 30 个省份覆盖，支持省份筛选

### 2. 智能推荐
- 基于热度 / 评分的 Top-K 推荐
- 支持关键词模糊搜索（基于 Trie 前缀树 + Levenshtein 编辑距离）

### 3. 路线规划
- **最短路径** — Dijkstra 算法
- **最快路径** — 考虑拥堵系数和交通工具速度
- **多点路线** — 途经点最优路径规划
- **室内导航** — 支持多楼层建筑内部路径规划

### 4. 美食推荐
- 20+ 菜系，50+ 菜品
- 按距离、热度、评分排序

### 5. 游记系统
- 120 篇预置游记数据
- 游记浏览、搜索、互动（浏览次数 / 评分）
- 基于哈夫曼编码的 **游记内容无损压缩存储**

### 6. 数据规模
| 数据类型 | 数量 |
|----------|------|
| 景区 / 校园 | 200 |
| 建筑物 | 4,000+ |
| 图节点 | 10,000+ |
| 服务设施 | 10,000+ |
| 美食 | 4,000+ |
| 游记 | 120 |
| 用户 | 10 |

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | C++17 |
| 构建 | CMake 3.15+ |
| HTTP 服务 | cpp-httplib (header-only) |
| 前端 | HTML5 + CSS3 + Vanilla JS (SPA) |
| 数据结构 | 自实现：Vector, HashMap, PriorityQueue, Trie, Graph, Huffman Tree |
| 算法 | Dijkstra, A\*, 拓扑排序, 快速排序, 归并排序, 并查集, Kruskal, Floyd-Warshall |

## 🎨 前端界面

- 响应式 SPA 设计，支持移动端 / 桌面端
- 渐变主题配色，现代化 UI
- 实时 API 交互，动态渲染景区卡片、路线图、游记列表

## 📄 License

MIT License — 仅供学习交流使用。
