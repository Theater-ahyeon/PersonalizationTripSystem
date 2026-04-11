# TripSystem C++ 主程序

这是当前仓库里的 C++ 主线工程。

## 当前已完成

- CLI 主菜单
- `DataManager` 启动加载与退出保存
- 手写 `HashMap`
- 手写 `MinHeap`
- 手写 `Trie`
- 图结构与最短路
- 景点推荐
- 场所搜索
- 美食推荐

## 暂未完成

- 旅游日记的 Huffman 压缩与解压
- 更完整的 JSON 数据集导入
- 多目标路径规划

## 构建

当前环境没有 `cmake`，但有 `g++`，因此可以直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
```

构建产物默认输出到：

```text
cpp/build/tripsystem.exe
```

## 运行

```powershell
.\cpp\build\tripsystem.exe .\cpp\data
```

首次运行如果发现数据目录为空，会自动生成一份演示数据集。

