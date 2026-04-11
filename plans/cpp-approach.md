# C++ 实施说明

## 1. 当前实施结论

项目当前只有一种实现形态：纯 C++ 单体程序。

这意味着：

- 不再保留 Java 版本
- 不再维护并行实现
- 不再将其他语言版本作为当前仓库的一部分

## 2. 当前工程结构

```text
cpp/
├── CMakeLists.txt
├── README.md
├── include/
│   └── tripsystem/
│       ├── app/
│       ├── core/
│       └── models/
├── src/
│   ├── app/
│   ├── core/
│   └── main.cpp
├── data/
├── scripts/
└── .gitignore
```

## 3. 当前模块分工

### `include/tripsystem/models`

- 存放领域模型
- 当前包括景点、道路、餐厅、搜索结果、推荐结果、路径结果等结构

### `include/tripsystem/core`

- 存放底层数据结构和核心能力
- 当前包括 `HashMap`、`MinHeap`、`Trie`、`Graph`、`DataManager`

### `include/tripsystem/app`

- 存放 CLI 应用层接口

### `src/app`

- 主菜单和交互逻辑

### `src/core`

- 数据加载与业务能力实现

## 4. 当前已经落地的能力

### 数据层

- 程序启动时自动加载或生成样例数据
- 程序退出时自动写回数据文件

### 算法与结构层

- 手写 `HashMap`
- 手写 `MinHeap`
- 手写 `Trie`
- 图结构和单目标最短路径

### 业务层

- 景点推荐
- 场所搜索
- 最短路径规划
- 美食推荐

## 5. 当前构建方式

由于当前环境已确认有 `g++`，但未确认有 `cmake`，因此优先提供脚本构建：

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
```

输出产物：

```text
cpp/build/tripsystem.exe
```

## 6. 当前运行方式

```powershell
.\cpp\build\tripsystem.exe .\cpp\data
```

如果 `cpp/data/` 下不存在数据文件，系统会自动生成一份演示数据。

## 7. 下一步实施顺序

1. 完成旅游日记模块
2. 接入 Huffman 压缩与解压
3. 补充更完整的数据导入
4. 增加多目标路径规划
5. 增加测试和性能统计

