#pragma once

#include "tripsystem/models.hpp"

#include <functional>
#include <string>
#include <utility>
#include <vector>

namespace tripsystem {

template <typename K, typename V>
class HashMap {
    std::vector<std::vector<std::pair<K, V>>> buckets_;
    size_t size_ = 0;

    size_t indexFor(const K& key) const {
        return std::hash<K>{}(key) % buckets_.size();
    }

    void rehashIfNeeded() {
        if (buckets_.empty()) buckets_.resize(16);
        if (static_cast<double>(size_) / buckets_.size() <= 0.75) return;
        auto old = buckets_;
        buckets_.assign(buckets_.size() * 2, {});
        size_ = 0;
        for (auto& bucket : old) {
            for (auto& kv : bucket) insert(kv.first, kv.second);
        }
    }

public:
    explicit HashMap(size_t capacity = 16) : buckets_(capacity) {}

    void clear() {
        buckets_.assign(16, {});
        size_ = 0;
    }

    void insert(const K& key, const V& value) {
        rehashIfNeeded();
        auto& bucket = buckets_[indexFor(key)];
        for (auto& kv : bucket) {
            if (kv.first == key) {
                kv.second = value;
                return;
            }
        }
        bucket.push_back({key, value});
        ++size_;
    }

    V* get(const K& key) {
        if (buckets_.empty()) return nullptr;
        auto& bucket = buckets_[indexFor(key)];
        for (auto& kv : bucket) {
            if (kv.first == key) return &kv.second;
        }
        return nullptr;
    }

    const V* get(const K& key) const {
        if (buckets_.empty()) return nullptr;
        const auto& bucket = buckets_[indexFor(key)];
        for (const auto& kv : bucket) {
            if (kv.first == key) return &kv.second;
        }
        return nullptr;
    }

    bool contains(const K& key) const {
        return get(key) != nullptr;
    }
};

template <typename T, typename Compare>
class MinHeap {
    std::vector<T> data_;
    Compare cmp_;

    void siftUp(size_t i) {
        while (i > 0) {
            size_t p = (i - 1) / 2;
            if (!cmp_(data_[i], data_[p])) break;
            std::swap(data_[i], data_[p]);
            i = p;
        }
    }

    void siftDown(size_t i) {
        while (true) {
            size_t l = i * 2 + 1;
            size_t r = i * 2 + 2;
            size_t best = i;
            if (l < data_.size() && cmp_(data_[l], data_[best])) best = l;
            if (r < data_.size() && cmp_(data_[r], data_[best])) best = r;
            if (best == i) break;
            std::swap(data_[i], data_[best]);
            i = best;
        }
    }

public:
    bool empty() const { return data_.empty(); }
    size_t size() const { return data_.size(); }
    const T& top() const { return data_.front(); }
    std::vector<T> values() const { return data_; }

    void push(const T& item) {
        data_.push_back(item);
        siftUp(data_.size() - 1);
    }

    T pop() {
        if (data_.empty()) return T{};
        T item = data_.front();
        data_[0] = data_.back();
        data_.pop_back();
        if (!data_.empty()) siftDown(0);
        return item;
    }
};

class Trie {
    struct Node {
        bool terminal = false;
        std::string word;
        std::vector<std::pair<unsigned char, Node*>> children;
    };
    Node root_;

    static Node* child(Node* n, unsigned char c) {
        for (auto& p : n->children) {
            if (p.first == c) return p.second;
        }
        return nullptr;
    }

    static void collect(Node* n, std::vector<std::string>& out, int limit) {
        if (static_cast<int>(out.size()) >= limit) return;
        if (n->terminal) out.push_back(n->word);
        for (auto& p : n->children) collect(p.second, out, limit);
    }

public:
    ~Trie() { clear(&root_); }

    void clear(Node* n) {
        for (auto& p : n->children) clear(p.second);
        if (n != &root_) delete n;
    }

    void reset() {
        clear(&root_);
        root_.children.clear();
        root_.terminal = false;
        root_.word.clear();
    }

    void insert(const std::string& word) {
        Node* cur = &root_;
        for (unsigned char c : word) {
            Node* next = child(cur, c);
            if (!next) {
                next = new Node();
                cur->children.push_back({c, next});
            }
            cur = next;
        }
        cur->terminal = true;
        cur->word = word;
    }

    std::vector<std::string> autocomplete(const std::string& prefix, int limit = 10) const {
        Node* cur = const_cast<Node*>(&root_);
        for (unsigned char c : prefix) {
            cur = child(cur, c);
            if (!cur) return {};
        }
        std::vector<std::string> out;
        collect(cur, out, limit);
        return out;
    }
};

class Graph {
    HashMap<int, std::vector<Road>> adj_;

public:
    void clear() { adj_.clear(); }

    void addEdge(const Road& r) {
        auto* list = adj_.get(r.from);
        if (!list) {
            adj_.insert(r.from, std::vector<Road>{r});
        } else {
            list->push_back(r);
        }
    }

    const std::vector<Road>* neighbors(int id) const {
        return adj_.get(id);
    }

    const Road* edgeBetween(int from, int to) const {
        const auto* list = adj_.get(from);
        if (!list) return nullptr;
        for (const auto& road : *list) {
            if (road.to == to) return &road;
        }
        return nullptr;
    }
};

} // namespace tripsystem
