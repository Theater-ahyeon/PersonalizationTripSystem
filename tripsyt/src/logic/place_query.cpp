#include "place_query.h"
#include "../core/algorithm.h"
#include <limits>

// 查找附近设施（基于图距离，不是直线距离）
MyVector<Facility> findNearbyFacilities(Graph& graph, MyVector<Facility>& facilities, int currentNodeId, double range) {
    // 从当前节点执行Dijkstra，计算到所有节点的最短距离
    int n = graph.nodeCount();
    MyVector<double> dist;
    dist.resize(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;
    dist[currentNodeId] = 0;

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
        // 提前终止：如果当前最小距离已经超过range，后续不会再有更近的
        if (dist[u] > range) break;

        graph.forEachEdge(u, [&](const Edge& e) {
            double newDist = dist[u] + e.distance;
            if (newDist < dist[e.to]) {
                dist[e.to] = newDist;
            }
        });
    }

    // 筛选在范围内的设施
    MyVector<Facility> result;
    for (int i = 0; i < facilities.size(); ++i) {
        int nodeId = facilities[i].graphNodeId;
        if (nodeId >= 0 && nodeId < n && dist[nodeId] <= range) {
            // 将距离临时存储在coord中（使用id字段标记）
            Facility f = facilities[i];
            result.push_back(f);
        }
    }

    // 按图距离排序
    fullSort(result, [&dist](const Facility& a, const Facility& b) {
        return dist[a.graphNodeId] < dist[b.graphNodeId];
    });

    return result;
}

// 按类别过滤设施
MyVector<Facility> filterByCategory(MyVector<Facility>& facilities, std::string category) {
    MyVector<Facility> result;
    for (int i = 0; i < facilities.size(); ++i) {
        if (facilities[i].category == category) {
            result.push_back(facilities[i]);
        }
    }
    return result;
}

// 按类别名称查找设施并按距离排序
MyVector<Facility> searchFacilities(MyVector<Facility>& facilities, std::string categoryName, int currentNodeId, Graph& graph) {
    // 先按类别过滤
    MyVector<Facility> filtered = filterByCategory(facilities, categoryName);

    // 计算当前节点到所有节点的最短距离
    int n = graph.nodeCount();
    MyVector<double> dist;
    dist.resize(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;
    dist[currentNodeId] = 0;

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

        graph.forEachEdge(u, [&](const Edge& e) {
            double newDist = dist[u] + e.distance;
            if (newDist < dist[e.to]) {
                dist[e.to] = newDist;
            }
        });
    }

    // 按距离排序
    fullSort(filtered, [&dist](const Facility& a, const Facility& b) {
        double distA = (a.graphNodeId >= 0 && a.graphNodeId < dist.size()) ? dist[a.graphNodeId] : 1e18;
        double distB = (b.graphNodeId >= 0 && b.graphNodeId < dist.size()) ? dist[b.graphNodeId] : 1e18;
        return distA < distB;
    });

    return filtered;
}
