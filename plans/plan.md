# 个性化旅游系统纯 C++ 开发计划

## 当前目标

仓库统一为 C++17 CLI 系统，完全移除旧后端实现。核心功能不使用数据库，依赖手写数据结构、经典算法、JSON 文件和 Huffman 二进制日记文件完成。

## 已完成

- 删除旧后端工程与构建文件。
- 新建 `cpp/` 工程目录。
- 提供 PowerShell 构建脚本。
- 提供 CLI 主菜单：
  - `1 景点推荐`
  - `2 路径规划`
  - `3 场所搜索`
  - `4 旅游日记`
  - `5 美食推荐`
  - `0 保存并退出`
- 实现手写 `HashMap`、`MinHeap`、`Trie`、邻接表 `Graph`。
- 实现 Top-K、路径搜索、KMP、Huffman 编码/解码。
- 提供并扩展 `spots.json`、`roads.json`、`restaurants.json`、`osm_nodes.json`、`osm_edges.json` 示例数据。
- 路径规划第二版增加离线 OpenStreetMap 样例数据和 A* 搜索入口。
- 路径规划增加 Dijkstra 详细路径输出和 TSP 状态压缩 DP 多点游览入口。
- 旅游日记第一版完成 Huffman 编码压缩、元数据保存和启动解压读取。
- 景点推荐、场所搜索、美食推荐完成第二版权重、排序和交互优化。
- 日记模块增加样例数据、摘要展示和异常文件处理。
- 增加 `cpp/scripts/smoke.ps1`，用于脚本化验证推荐、路径、搜索、日记和美食功能。

## 下一步

1. 继续补充边界场景脚本，例如非法 id、重复目标、不可达路径和空输入。
2. 在课程设计文档中保持算法复杂度说明与当前代码一致。
3. 如样例数据继续增大，可为 TSP 多点游览增加更明确的目标数量提示和性能说明。

## 构建运行

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
.\cpp\build\tripsystem.exe .\cpp\data
```
