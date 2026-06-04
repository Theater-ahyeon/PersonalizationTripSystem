#include "route_planner.h"
#include "../core/algorithm.h"
#include <cmath>
#include <limits>

// 最短距离路径
MyVector<int> planShortestPath(Graph& graph, int start, int end) {
    MyVector<double> dist;
    return dijkstraShortestPath(graph, start, end, dist);
}

// 最短时间路径（考虑拥挤度）
MyVector<int> planShortestTimePath(Graph& graph, int start, int end) {
    MyVector<double> dist;
    return dijkstraShortestTimePath(graph, start, end, dist);
}

// 途经多点最优路径（贪心TSP近似算法）
MyVector<int> planMultiPointPath(Graph& graph, int start, MyVector<int>& waypoints) {
    MyVector<int> fullPath;
    if (waypoints.empty()) {
        fullPath.push_back(start);
        return fullPath;
    }

    // 使用贪心策略：每次选择距离当前位置最近的未访问途经点
    MyVector<bool> visited(waypoints.size());
    for (int i = 0; i < waypoints.size(); ++i) visited[i] = false;

    int current = start;
    fullPath.push_back(current);

    for (int iter = 0; iter < waypoints.size(); ++iter) {
        // 找到距离current最近的未访问途经点
        int bestIdx = -1;
        double bestDist = 1e18;
        MyVector<int> bestPath;

        for (int i = 0; i < waypoints.size(); ++i) {
            if (visited[i]) continue;
            MyVector<double> dist;
            MyVector<int> path = dijkstraShortestPath(graph, current, waypoints[i], dist);
            if (!path.empty() && dist[waypoints[i]] < bestDist) {
                bestDist = dist[waypoints[i]];
                bestIdx = i;
                bestPath = path;
            }
        }

        if (bestIdx == -1) break; // 没有可达的途经点
        visited[bestIdx] = true;

        // 将路径添加到完整路径中（跳过第一个点，因为它是当前点）
        for (int i = 1; i < bestPath.size(); ++i) {
            fullPath.push_back(bestPath[i]);
        }
        current = waypoints[bestIdx];
    }

    // 从最后一个途经点返回起点
    MyVector<double> dist;
    MyVector<int> returnPath = dijkstraShortestPath(graph, current, start, dist);
    for (int i = 1; i < returnPath.size(); ++i) {
        fullPath.push_back(returnPath[i]);
    }

    return fullPath;
}

// 指定交通工具路径
MyVector<int> planWithTransport(Graph& graph, int start, int end, RoadType transport) {
    MyVector<double> dist;
    return dijkstraWithTransport(graph, start, end, transport, dist);
}

// 混合交通工具最短时间路径
MyVector<int> planMixedTransport(Graph& graph, int start, int end) {
    MyVector<double> dist;
    return dijkstraMixedTransport(graph, start, end, dist);
}

// 室内导航（基于Dijkstra的室内路径规划）
MyVector<IndoorNode> planIndoorNavigation(
    MyVector<IndoorNode>& nodes,
    MyVector<IndoorEdge>& edges,
    int startNodeId,
    int endNodeId
) {
    int n = nodes.size();
    if (n == 0) return MyVector<IndoorNode>();

    // 构建节点ID到索引的映射
    MyHashMap<int, int, DefaultIntHash> idToIdx;
    for (int i = 0; i < n; ++i) {
        idToIdx.insert(nodes[i].id, i);
    }

    // Dijkstra
    MyVector<double> dist(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;

    int startIdx = -1, endIdx = -1;
    int* startPtr = idToIdx.find(startNodeId);
    int* endPtr = idToIdx.find(endNodeId);
    if (startPtr) startIdx = *startPtr;
    if (endPtr) endIdx = *endPtr;
    if (startIdx == -1 || endIdx == -1) return MyVector<IndoorNode>();

    dist[startIdx] = 0;

    MyVector<int> prev(n);
    for (int i = 0; i < n; ++i) prev[i] = -1;

    MyVector<bool> visited(n);
    for (int i = 0; i < n; ++i) visited[i] = false;

    for (int iter = 0; iter < n; ++iter) {
        int u = -1;
        double minDist = 1e18;
        for (int i = 0; i < n; ++i) {
            if (!visited[i] && dist[i] < minDist) {
                minDist = dist[i];
                u = i;
            }
        }
        if (u == -1) break;
        visited[u] = true;
        if (u == endIdx) break;

        // 遍历从u出发的边
        for (int i = 0; i < edges.size(); ++i) {
            if (edges[i].from == nodes[u].id) {
                int* vPtr = idToIdx.find(edges[i].to);
                if (!vPtr) continue;
                int v = *vPtr;
                double newDist = dist[u] + edges[i].distance;
                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    prev[v] = u;
                }
            }
        }
    }

    // 回溯路径
    MyVector<int> pathIdx;
    if (dist[endIdx] >= 1e18) return MyVector<IndoorNode>();
    int cur = endIdx;
    while (cur != -1) {
        pathIdx.insert(0, cur);
        cur = prev[cur];
    }

    // 转换为IndoorNode路径
    MyVector<IndoorNode> result;
    for (int i = 0; i < pathIdx.size(); ++i) {
        result.push_back(nodes[pathIdx[i]]);
    }
    return result;
}
