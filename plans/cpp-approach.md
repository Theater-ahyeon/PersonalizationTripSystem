# C++ 实现核心算法的落地方案（与 Web 系统集成）

> 目标：满足“核心算法必须自己设计数据结构并编程实现”的考核点，同时响应“最好用 C++”的建议；并保持系统可演示、可迭代。

## 方案 A（推荐）：C++ 算法服务 + Java 网关（松耦合）

### 架构

- `alg-cpp`：C++ 实现核心算法（TopK、Dijkstra/多目标、倒排索引、压缩等），提供 HTTP API
- `backend`：Spring Boot 作为网关与业务编排层
  - 负责鉴权/用户偏好/任务编排/调用高德代理/AIGC 任务
  - **核心算法计算通过调用 C++ 服务完成**
- `frontend`：Vue + 高德地图展示

### 优点

- C++ 算法独立可测、可对比、可压测
- 不需要 JNI/本地库加载，Windows 环境更稳
- 后续要对比 Java 版本算法也方便（“多种算法性能比较”）

### API 示例

- `POST /alg/graph/load`：导入道路图 JSON
- `GET /alg/graph/shortest?start=..&goal=..&metric=distance|time&mode=...`
- `GET /alg/recommend/topk?entity=poi|food|diary&k=10&userId=...`
- `GET /alg/search/diary?q=...`（倒排索引）

## 方案 B：JNI/本地动态库（强耦合，不推荐起步）

- C++ 编译成 DLL，通过 JNI 被 Spring Boot 调用。
- 优点：调用开销低；缺点：Windows 下编译/ABI/路径/权限问题多，调试成本高。

## 数据要求如何在 C++ 侧落地

- 目的地数量 >= 200：可以用脚本生成/爬取后导入 JSON
- 每个目的地内部节点 >= 20、设施 >= 50、边 >= 200：C++ 图结构按目的地分片存储（`destinationId -> Graph`）

## 对验收“不要用数据库完成核心功能”的对应

- C++/Java 都以 JSON 作为输入来源，算法只依赖内存结构。
- 持久化可采用：
  - JSON（可读性好）
  - 自定义二进制（更快）
  - 压缩文件（无损压缩模块即考核点之一）

## 里程碑建议

1. 先在 Java `backend` 里把算法跑通（已完成 Dijkstra/TopK 雏形）
2. 再把算法模块逐个迁移/复刻到 C++（并输出性能对比数据）
3. 最终演示时可切换“Java 算法 / C++ 算法”作为创新点
