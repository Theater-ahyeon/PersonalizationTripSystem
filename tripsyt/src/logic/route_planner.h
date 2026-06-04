#pragma once
#include "../models/models.h"
#include "../core/graph.h"

// 路线规划模块

// 最短距离路径
MyVector<int> planShortestPath(Graph& graph, int start, int end);

// 最短时间路径（考虑拥挤度）
MyVector<int> planShortestTimePath(Graph& graph, int start, int end);

// 途经多点最优路径
MyVector<int> planMultiPointPath(Graph& graph, int start, MyVector<int>& waypoints);

// 指定交通工具路径
MyVector<int> planWithTransport(Graph& graph, int start, int end, RoadType transport);

// 混合交通工具最短时间路径
MyVector<int> planMixedTransport(Graph& graph, int start, int end);

// 室内导航
MyVector<IndoorNode> planIndoorNavigation(
    MyVector<IndoorNode>& nodes,
    MyVector<IndoorEdge>& edges,
    int startNodeId,
    int endNodeId
);
