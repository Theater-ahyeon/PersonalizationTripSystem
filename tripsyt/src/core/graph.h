#pragma once
#include "my_vector.h"
#include <cmath>
#include <limits>

// 道路类型
enum RoadType { WALK, BICYCLE, SHUTTLE_BUS };

// 图的边
struct Edge {
    int to;             // 目标节点ID
    double distance;    // 距离
    double crowdDegree; // 拥挤度 (0,1]
    double idealSpeed;  // 理想速度
    RoadType roadType;  // 道路类型
    int next;           // 链式前向星下一条边索引

    // 计算实际速度
    double actualSpeed() const {
        return crowdDegree * idealSpeed;
    }

    // 计算通过时间
    double travelTime() const {
        double speed = actualSpeed();
        if (speed <= 0) return std::numeric_limits<double>::max();
        return distance / speed;
    }
};

// 图结构（链式前向星存储）
class Graph {
private:
    MyVector<Edge> edges_;          // 边数组
    MyVector<int> head_;            // 每个节点的第一条边索引，-1表示无
    int nodeCount_;                 // 节点数量

public:
    Graph(int nodeCount = 0) : nodeCount_(nodeCount) {
        head_.resize(nodeCount);
        for (int i = 0; i < nodeCount; ++i) {
            head_[i] = -1;
        }
    }

    // 设置节点数量
    void resize(int nodeCount) {
        nodeCount_ = nodeCount;
        head_.resize(nodeCount);
        for (int i = 0; i < nodeCount; ++i) {
            head_[i] = -1;
        }
        edges_.clear();
    }

    // 获取节点数量
    int nodeCount() const { return nodeCount_; }

    // 添加有向边
    void addEdge(int from, int to, double distance, double crowdDegree, double idealSpeed, RoadType roadType) {
        Edge e;
        e.to = to;
        e.distance = distance;
        e.crowdDegree = crowdDegree;
        e.idealSpeed = idealSpeed;
        e.roadType = roadType;
        e.next = head_[from];
        head_[from] = edges_.size();
        edges_.push_back(e);
    }

    // 添加无向边
    void addUndirectedEdge(int u, int v, double distance, double crowdDegree, double idealSpeed, RoadType roadType) {
        addEdge(u, v, distance, crowdDegree, idealSpeed, roadType);
        addEdge(v, u, distance, crowdDegree, idealSpeed, roadType);
    }

    // 遍历某节点的所有边
    template <typename Func>
    void forEachEdge(int node, Func func) const {
        for (int i = head_[node]; i != -1; i = edges_[i].next) {
            func(edges_[i]);
        }
    }

    // 获取边数组
    const MyVector<Edge>& edges() const { return edges_; }

    // 获取头数组
    const MyVector<int>& head() const { return head_; }

    MyVector<int>& headMutable() { return head_; }
};
