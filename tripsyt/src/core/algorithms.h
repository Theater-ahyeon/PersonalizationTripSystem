#pragma once

#include "graph.h"
#include "my_vector.h"
#include "my_hashmap.h"
#include "min_heap.h"

/**
 * 图算法集合
 * 包含 Dijkstra 最短路径、途经多点最短路径、考虑拥挤度/交通工具的最短时间路径
 */

// ==================== Dijkstra 辅助结构 ====================

// Dijkstra 中的堆元素
struct DijkstraNode {
    int vertex;       // 顶点id
    double dist;      // 到起点的距离/时间

    DijkstraNode() : vertex(-1), dist(0) {}
    DijkstraNode(int v, double d) : vertex(v), dist(d) {}

    bool operator<(const DijkstraNode& other) const {
        return dist < other.dist;
    }
    bool operator>(const DijkstraNode& other) const {
        return dist > other.dist;
    }
    bool operator==(const DijkstraNode& other) const {
        return vertex == other.vertex;
    }
};

// Dijkstra 结果
struct DijkstraResult {
    MyVector<double> dist;  // 各顶点到起点的最短距离
    MyVector<int> prev;     // 前驱顶点数组，用于重建路径

    DijkstraResult() {}
};

// ==================== Dijkstra 单源最短路径 ====================

/**
 * Dijkstra 单源最短路径算法
 * @param graph 图
 * @param start 起点id
 * @return 结果包含 dist 数组和 prev 数组
 */
inline DijkstraResult dijkstra(const Graph& graph, int start) {
    DijkstraResult result;
    MyVector<int> vertices = graph.getAllVertices();

    // 初始化距离和前驱
    MyHashMap<int, double> distMap;
    MyHashMap<int, int> prevMap;

    for (int i = 0; i < vertices.size(); ++i) {
        distMap.put(vertices[i], 1e18);  // 初始化为无穷大
        prevMap.put(vertices[i], -1);     // 前驱为-1
    }
    distMap.put(start, 0);

    // 最小堆
    MinHeap<DijkstraNode> heap;
    heap.push(DijkstraNode(start, 0));

    // 已访问集合
    MyHashMap<int, bool> visited;

    while (!heap.empty()) {
        DijkstraNode top = heap.top();
        heap.pop();

        int u = top.vertex;

        // 跳过已访问的顶点
        if (visited.contains(u)) continue;
        visited.put(u, true);

        // 遍历邻居
        MyVector<Edge> neighbors = graph.getNeighbors(u);
        for (int i = 0; i < neighbors.size(); ++i) {
            int v = neighbors[i].to;
            double weight = neighbors[i].weight;

            if (!visited.contains(v)) {
                double newDist = distMap.get(u) + weight;
                if (newDist < distMap.get(v)) {
                    distMap.put(v, newDist);
                    prevMap.put(v, u);
                    heap.push(DijkstraNode(v, newDist));
                }
            }
        }
    }

    // 将结果转为 MyVector（按顶点顺序）
    for (int i = 0; i < vertices.size(); ++i) {
        result.dist.push_back(distMap.get(vertices[i]));
        result.prev.push_back(prevMap.get(vertices[i]));
    }

    return result;
}

// ==================== 重建路径辅助函数 ====================

namespace internal {

// 根据前驱数组重建从 start 到 end 的路径
inline MyVector<int> reconstructPath(const MyHashMap<int, int>& prevMap,
                                      int start, int end) {
    MyVector<int> path;
    int current = end;

    // 从终点回溯到起点
    MyVector<int> reversePath;
    while (current != -1) {
        reversePath.push_back(current);
        if (current == start) break;
        current = prevMap.get(current);
    }

    // 反转路径
    for (int i = reversePath.size() - 1; i >= 0; --i) {
        path.push_back(reversePath[i]);
    }

    // 如果路径起点不是start，说明不可达
    if (path.size() > 0 && path[0] != start) {
        path.clear();
    }

    return path;
}

} // namespace internal

// ==================== 途经多点最短路径（TSP近似：贪心最近邻） ====================

/**
 * 途经多点最短路径
 * 使用贪心最近邻策略近似TSP
 * @param graph 图
 * @param start 起点id
 * @param waypoints 途经点列表（不含起点，但含终点）
 * @return 完整路径（包含起点和终点）
 */
inline MyVector<int> multiPointShortestPath(const Graph& graph, int start,
                                             MyVector<int> waypoints) {
    MyVector<int> fullPath;

    if (waypoints.size() == 0) {
        fullPath.push_back(start);
        return fullPath;
    }

    // 贪心最近邻：每次选择距离当前位置最近的未访问途经点
    MyVector<bool> visited;
    for (int i = 0; i < waypoints.size(); ++i) {
        visited.push_back(false);
    }

    int current = start;

    for (int step = 0; step < waypoints.size(); ++step) {
        // 对当前点运行 Dijkstra，找到最近的未访问途经点
        DijkstraResult result = dijkstra(graph, current);

        MyVector<int> vertices = graph.getAllVertices();

        // 构建前驱映射
        MyHashMap<int, int> prevMap;
        for (int i = 0; i < vertices.size(); ++i) {
            prevMap.put(vertices[i], result.prev[i]);
        }

        // 找最近的未访问途经点
        double minDist = 1e18;
        int nearestIdx = -1;

        for (int i = 0; i < waypoints.size(); ++i) {
            if (!visited[i]) {
                // 查找该途经点在vertices中的索引
                double d = 1e18;
                for (int j = 0; j < vertices.size(); ++j) {
                    if (vertices[j] == waypoints[i]) {
                        d = result.dist[j];
                        break;
                    }
                }
                if (d < minDist) {
                    minDist = d;
                    nearestIdx = i;
                }
            }
        }

        if (nearestIdx == -1) break; // 没有可达的途经点

        visited[nearestIdx] = true;
        int nextPoint = waypoints[nearestIdx];

        // 重建从 current 到 nextPoint 的路径
        MyVector<int> segment = internal::reconstructPath(prevMap, current, nextPoint);

        // 拼接路径（避免重复点）
        int startIdx = (fullPath.size() == 0) ? 0 : 1;
        for (int i = startIdx; i < segment.size(); ++i) {
            fullPath.push_back(segment[i]);
        }

        current = nextPoint;
    }

    return fullPath;
}

// ==================== 考虑拥挤度的最短时间路径 ====================

/**
 * 考虑拥挤度的最短时间路径
 * 使用边的 travelTime() 作为权重运行 Dijkstra
 * @param graph 图
 * @param start 起点
 * @param end 终点
 * @return 路径（顶点id序列）
 */
inline MyVector<int> shortestPathByTime(const Graph& graph, int start, int end) {
    MyVector<int> vertices = graph.getAllVertices();

    // 初始化
    MyHashMap<int, double> distMap;
    MyHashMap<int, int> prevMap;

    for (int i = 0; i < vertices.size(); ++i) {
        distMap.put(vertices[i], 1e18);
        prevMap.put(vertices[i], -1);
    }
    distMap.put(start, 0);

    MinHeap<DijkstraNode> heap;
    heap.push(DijkstraNode(start, 0));

    MyHashMap<int, bool> visited;

    while (!heap.empty()) {
        DijkstraNode top = heap.top();
        heap.pop();

        int u = top.vertex;
        if (visited.contains(u)) continue;
        visited.put(u, true);

        if (u == end) break; // 已找到终点

        MyVector<Edge> neighbors = graph.getNeighbors(u);
        for (int i = 0; i < neighbors.size(); ++i) {
            int v = neighbors[i].to;
            double time = neighbors[i].travelTime(); // 使用通行时间而非距离

            if (!visited.contains(v)) {
                double newDist = distMap.get(u) + time;
                if (newDist < distMap.get(v)) {
                    distMap.put(v, newDist);
                    prevMap.put(v, u);
                    heap.push(DijkstraNode(v, newDist));
                }
            }
        }
    }

    return internal::reconstructPath(prevMap, start, end);
}

// ==================== 考虑交通工具的最短时间路径 ====================

/**
 * 考虑交通工具的最短时间路径
 * 只能通过指定交通工具可通行的边
 * @param graph 图
 * @param start 起点
 * @param end 终点
 * @param transportMode 交通工具类型
 * @return 路径（顶点id序列）
 */
inline MyVector<int> shortestPathWithTransport(const Graph& graph, int start, int end,
                                                RoadType transportMode) {
    MyVector<int> vertices = graph.getAllVertices();

    // 初始化
    MyHashMap<int, double> distMap;
    MyHashMap<int, int> prevMap;

    for (int i = 0; i < vertices.size(); ++i) {
        distMap.put(vertices[i], 1e18);
        prevMap.put(vertices[i], -1);
    }
    distMap.put(start, 0);

    MinHeap<DijkstraNode> heap;
    heap.push(DijkstraNode(start, 0));

    MyHashMap<int, bool> visited;

    while (!heap.empty()) {
        DijkstraNode top = heap.top();
        heap.pop();

        int u = top.vertex;
        if (visited.contains(u)) continue;
        visited.put(u, true);

        if (u == end) break;

        MyVector<Edge> neighbors = graph.getNeighbors(u);
        for (int i = 0; i < neighbors.size(); ++i) {
            // 只考虑该交通工具可通行的边
            if (!neighbors[i].isPassableBy(transportMode)) continue;

            int v = neighbors[i].to;
            double time = neighbors[i].travelTime();

            if (!visited.contains(v)) {
                double newDist = distMap.get(u) + time;
                if (newDist < distMap.get(v)) {
                    distMap.put(v, newDist);
                    prevMap.put(v, u);
                    heap.push(DijkstraNode(v, newDist));
                }
            }
        }
    }

    return internal::reconstructPath(prevMap, start, end);
}
