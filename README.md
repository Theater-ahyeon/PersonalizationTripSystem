# 个性化旅游系统 TripSystem

本仓库现已统一为纯 C++ 版本。

截至 2026 年 4 月 12 日，仓库中的 Java 版本已经彻底移除，当前只保留 C++ 主程序、文档和阶段性共识记录。项目目标明确如下：

- 核心实现语言只使用 C++
- 核心功能不依赖数据库
- 以手写数据结构、算法和文件持久化为主
- 以 CLI 可演示闭环作为当前主交付形态

## 当前仓库结构

- `cpp/`：C++ 主工程
- `docs/`：软件开发文档、功能点文档、共识记录
- `plans/`：开发计划和 C++ 实施说明
- `reports/`：周报与阶段记录

## 文档入口

- 开发计划：[plans/plan.md](plans/plan.md)
- C++ 实施说明：[plans/cpp-approach.md](plans/cpp-approach.md)
- 软件开发文档：[docs/软件开发文档.md](docs/软件开发文档.md)
- 核心功能点：[docs/个性化旅游系统核心功能点(1).md](docs/个性化旅游系统核心功能点(1).md)
- C++ 工程说明：[cpp/README.md](cpp/README.md)
- 共识记录目录：[docs/consensus/README.md](docs/consensus/README.md)

## 当前可运行入口

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
.\cpp\build\tripsystem.exe .\cpp\data
```

## 当前已完成

- C++ CLI 主菜单
- `DataManager` 启动加载与退出保存
- 手写 `HashMap`
- 手写 `MinHeap`
- 手写 `Trie`
- 图结构与单目标最短路径
- 景点推荐
- 场所搜索
- 美食推荐

## 下一阶段重点

- 旅游日记 Huffman 压缩与解压
- 更完整的 JSON 数据集导入与校验
- 多目标路径规划
- 测试与性能统计

