#pragma once

#include <algorithm>
#include <cmath>
#include <limits>
#include <vector>

#include "tripsystem/core/hash_map.hpp"
#include "tripsystem/core/min_heap.hpp"

namespace tripsystem::core {

class Graph {
public:
    enum class Metric {
        Walk,
        Bike
    };

    struct Edge {
        long to{};
        double walk_cost{};
        double bike_cost{};
    };

    struct PathResult {
        bool found{false};
        double total_cost{};
        std::vector<long> path_ids;
    };

    void clear() {
        node_ids_.clear();
        adjacency_.clear();
        node_to_index_.clear();
    }

    void ensure_node(long id) {
        if (node_to_index_.contains(id)) {
            return;
        }
        node_to_index_.insert_or_assign(id, node_ids_.size());
        node_ids_.push_back(id);
        adjacency_.emplace_back();
    }

    void add_undirected_edge(long from, long to, double walk_cost, double bike_cost) {
        ensure_node(from);
        ensure_node(to);
        adjacency_[index_of(from)].push_back(Edge{to, walk_cost, bike_cost});
        adjacency_[index_of(to)].push_back(Edge{from, walk_cost, bike_cost});
    }

    PathResult shortest_path(long start, long goal, Metric metric) const {
        const auto* start_index_ptr = node_to_index_.find(start);
        const auto* goal_index_ptr = node_to_index_.find(goal);
        if (start_index_ptr == nullptr || goal_index_ptr == nullptr) {
            return {};
        }

        const auto start_index = *start_index_ptr;
        const auto goal_index = *goal_index_ptr;
        const auto inf = std::numeric_limits<double>::infinity();
        std::vector<double> dist(node_ids_.size(), inf);
        std::vector<long> prev(node_ids_.size(), -1);

        struct HeapNode {
            long node{};
            double dist{};
        };
        auto compare = [](const HeapNode& lhs, const HeapNode& rhs) {
            return lhs.dist < rhs.dist;
        };
        MinHeap<HeapNode, decltype(compare)> heap(compare);

        dist[start_index] = 0.0;
        heap.push({start, 0.0});

        while (!heap.empty()) {
            const auto current = heap.top();
            heap.pop();

            const auto current_index = index_of(current.node);
            if (current.dist > dist[current_index]) {
                continue;
            }
            if (current.node == goal) {
                break;
            }

            for (const auto& edge : adjacency_[current_index]) {
                const auto next_index = index_of(edge.to);
                const auto weight = metric == Metric::Walk ? edge.walk_cost : edge.bike_cost;
                const auto candidate = current.dist + weight;
                if (candidate < dist[next_index]) {
                    dist[next_index] = candidate;
                    prev[next_index] = current.node;
                    heap.push({edge.to, candidate});
                }
            }
        }

        if (!std::isfinite(dist[goal_index])) {
            return {};
        }

        std::vector<long> path;
        for (long node = goal; node != -1;) {
            path.push_back(node);
            if (node == start) {
                break;
            }
            node = prev[index_of(node)];
        }
        std::reverse(path.begin(), path.end());
        return PathResult{true, dist[goal_index], std::move(path)};
    }

private:
    std::size_t index_of(long id) const {
        return *node_to_index_.find(id);
    }

    std::vector<long> node_ids_;
    std::vector<std::vector<Edge>> adjacency_;
    HashMap<long, std::size_t> node_to_index_;
};

}  // namespace tripsystem::core

