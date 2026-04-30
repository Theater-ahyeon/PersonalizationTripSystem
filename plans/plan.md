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
- 提供 `spots.json`、`roads.json`、`restaurants.json` 示例数据。
- 路径规划第二版增加离线 OpenStreetMap 样例数据和 A* 搜索入口。
- 旅游日记第一版完成 Huffman 编码压缩、元数据保存和启动解压读取。

## 下一步

1. 扩展示例数据规模，满足课程演示所需的更多景点、道路和餐厅数量。
2. 将 `cpp/src/main.cpp` 中的实现按模块拆分到 `include/tripsystem/` 和 `src/`。
3. 为路径规划补充 TSP 状态压缩 DP 的多点游览入口。
4. 增加自动化测试或脚本化输入，用于演示推荐、路径、搜索、日记和美食功能。
5. 补充算法复杂度统计和答辩截图材料。

## 构建运行

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
.\cpp\build\tripsystem.exe .\cpp\data
```
