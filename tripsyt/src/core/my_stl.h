#pragma once
#define MY_STL_H_INCLUDED
// 自定义数据结构实现 - 不依赖STL容器
// 包含：MyVector, MyHashMap, MyPriorityQueue, MyGraph
// 核心算法：Dijkstra最短路径、TopK部分排序

#include <string>
#include <cmath>
#include <cstring>
#include <functional>
#include <algorithm>

// ==================== MyVector ====================
// 自定义动态数组，类似std::vector
template<typename T>
class MyVector {
private:
    T* data_;
    size_t size_;
    size_t capacity_;

    void expand() {
        size_t newCap = capacity_ == 0 ? 4 : capacity_ * 2;
        T* newData = new T[newCap];
        for (size_t i = 0; i < size_; i++) {
            newData[i] = std::move(data_[i]);
        }
        delete[] data_;
        data_ = newData;
        capacity_ = newCap;
    }

public:
    MyVector() : data_(nullptr), size_(0), capacity_(0) {}
    explicit MyVector(size_t n, const T& val = T()) : data_(new T[n]), size_(n), capacity_(n) {
        for (size_t i = 0; i < n; i++) data_[i] = val;
    }
    ~MyVector() { delete[] data_; }

    MyVector(const MyVector& o) : data_(nullptr), size_(o.size_), capacity_(o.capacity_) {
        if (capacity_ > 0) {
            data_ = new T[capacity_];
            for (size_t i = 0; i < size_; i++) data_[i] = o.data_[i];
        }
    }
    MyVector(MyVector&& o) noexcept : data_(o.data_), size_(o.size_), capacity_(o.capacity_) {
        o.data_ = nullptr; o.size_ = o.capacity_ = 0;
    }
    MyVector& operator=(const MyVector& o) {
        if (this != &o) {
            delete[] data_;
            capacity_ = o.capacity_; size_ = o.size_;
            if (capacity_ > 0) {
                data_ = new T[capacity_];
                for (size_t i = 0; i < size_; i++) data_[i] = o.data_[i];
            } else {
                data_ = nullptr;
            }
        }
        return *this;
    }
    MyVector& operator=(MyVector&& o) noexcept {
        if (this != &o) {
            delete[] data_;
            data_ = o.data_; size_ = o.size_; capacity_ = o.capacity_;
            o.data_ = nullptr; o.size_ = o.capacity_ = 0;
        }
        return *this;
    }

    void push_back(const T& val) {
        if (size_ >= capacity_) expand();
        data_[size_++] = val;
    }
    void push_back(T&& val) {
        if (size_ >= capacity_) expand();
        data_[size_++] = std::move(val);
    }

    T& operator[](size_t i) { return data_[i]; }
    const T& operator[](size_t i) const { return data_[i]; }
    size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }
    T* begin() { return data_; }
    T* end() { return data_ + size_; }
    const T* begin() const { return data_; }
    const T* end() const { return data_ + size_; }
    void clear() { size_ = 0; }
    T& back() { return data_[size_ - 1]; }
    const T& back() const { return data_[size_ - 1]; }
    void pop_back() { if (size_ > 0) size_--; }
    T* data() { return data_; }
    const T* data() const { return data_; }

    // 在指定位置插入元素
    void insert(size_t idx, const T& val) {
        if (idx > size_) return;
        if (size_ >= capacity_) expand();
        for (size_t i = size_; i > idx; --i) {
            data_[i] = std::move(data_[i - 1]);
        }
        data_[idx] = val;
        ++size_;
    }

    // 删除指定位置元素
    void erase(size_t idx) {
        if (idx >= size_) return;
        for (size_t i = idx; i < size_ - 1; ++i) {
            data_[i] = std::move(data_[i + 1]);
        }
        --size_;
    }
};

// ==================== MyHashMap ====================
// 自定义哈希表，使用链地址法解决冲突
template<typename K, typename V>
class MyHashMap {
private:
    struct Node {
        K key;
        V value;
        Node* next;
        Node(const K& k, const V& v, Node* n = nullptr) : key(k), value(v), next(n) {}
    };

    Node** buckets_;
    size_t bucketCount_;
    size_t size_;
    static const size_t DEFAULT_BUCKETS = 256;

    // 哈希函数
    size_t hash(const K& key) const {
        return std::hash<K>()(key) % bucketCount_;
    }

    void rehash() {
        size_t newCount = bucketCount_ * 2;
        Node** newBuckets = new Node*[newCount]();
        for (size_t i = 0; i < bucketCount_; i++) {
            Node* cur = buckets_[i];
            while (cur) {
                Node* next = cur->next;
                size_t idx = std::hash<K>()(cur->key) % newCount;
                cur->next = newBuckets[idx];
                newBuckets[idx] = cur;
                cur = next;
            }
        }
        delete[] buckets_;
        buckets_ = newBuckets;
        bucketCount_ = newCount;
    }

public:
    MyHashMap() : bucketCount_(DEFAULT_BUCKETS), size_(0) {
        buckets_ = new Node*[bucketCount_]();
    }
    ~MyHashMap() {
        clear();
        delete[] buckets_;
    }

    MyHashMap(const MyHashMap& o) : bucketCount_(o.bucketCount_), size_(0) {
        buckets_ = new Node*[bucketCount_]();
        for (size_t i = 0; i < o.bucketCount_; i++) {
            Node* cur = o.buckets_[i];
            while (cur) {
                insert(cur->key, cur->value);
                cur = cur->next;
            }
        }
    }
    MyHashMap& operator=(const MyHashMap& o) {
        if (this != &o) {
            clear();
            delete[] buckets_;
            bucketCount_ = o.bucketCount_;
            size_ = 0;
            buckets_ = new Node*[bucketCount_]();
            for (size_t i = 0; i < o.bucketCount_; i++) {
                Node* cur = o.buckets_[i];
                while (cur) {
                    insert(cur->key, cur->value);
                    cur = cur->next;
                }
            }
        }
        return *this;
    }

    void insert(const K& key, const V& value) {
        if (size_ >= bucketCount_ * 2) rehash();
        size_t idx = hash(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) { cur->value = value; return; }
            cur = cur->next;
        }
        buckets_[idx] = new Node(key, value, buckets_[idx]);
        size_++;
    }

    V* find(const K& key) {
        size_t idx = hash(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return &cur->value;
            cur = cur->next;
        }
        return nullptr;
    }

    const V* find(const K& key) const {
        size_t idx = hash(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return &cur->value;
            cur = cur->next;
        }
        return nullptr;
    }

    bool contains(const K& key) const { return find(key) != nullptr; }

    V& operator[](const K& key) {
        if (size_ >= bucketCount_ * 2) rehash();
        size_t idx = hash(key);
        Node* cur = buckets_[idx];
        while (cur) {
            if (cur->key == key) return cur->value;
            cur = cur->next;
        }
        // 使用insert语义：直接用V()构造Node，避免先默认构造再赋值
        Node* newNode = new Node(key, V(), nullptr);
        newNode->next = buckets_[idx];
        buckets_[idx] = newNode;
        size_++;
        return buckets_[idx]->value;
    }

    void erase(const K& key) {
        size_t idx = hash(key);
        Node* cur = buckets_[idx];
        Node* prev = nullptr;
        while (cur) {
            if (cur->key == key) {
                if (prev) prev->next = cur->next;
                else buckets_[idx] = cur->next;
                delete cur;
                size_--;
                return;
            }
            prev = cur;
            cur = cur->next;
        }
    }

    size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    void clear() {
        for (size_t i = 0; i < bucketCount_; i++) {
            Node* cur = buckets_[i];
            while (cur) {
                Node* next = cur->next;
                delete cur;
                cur = next;
            }
            buckets_[i] = nullptr;
        }
        size_ = 0;
    }

    // 获取所有键值对
    MyVector<K> keys() const {
        MyVector<K> result;
        for (size_t i = 0; i < bucketCount_; i++) {
            Node* cur = buckets_[i];
            while (cur) {
                result.push_back(cur->key);
                cur = cur->next;
            }
        }
        return result;
    }

    MyVector<V> values() const {
        MyVector<V> result;
        for (size_t i = 0; i < bucketCount_; i++) {
            Node* cur = buckets_[i];
            while (cur) {
                result.push_back(cur->value);
                cur = cur->next;
            }
        }
        return result;
    }

    // 遍历所有键值对
    template<typename Func>
    void forEach(Func fn) const {
        for (size_t i = 0; i < bucketCount_; i++) {
            Node* cur = buckets_[i];
            while (cur) {
                fn(cur->key, cur->value);
                cur = cur->next;
            }
        }
    }
};

// ==================== MyPriorityQueue ====================
// 最小堆优先队列，用于Dijkstra算法
template<typename T, typename Compare = std::less<T>>
class MyPriorityQueue {
private:
    MyVector<T> heap_;
    Compare cmp_;

    void siftUp(size_t i) {
        while (i > 0) {
            size_t parent = (i - 1) / 2;
            if (cmp_(heap_[i], heap_[parent])) {
                std::swap(heap_[i], heap_[parent]);
                i = parent;
            } else break;
        }
    }

    void siftDown(size_t i) {
        size_t n = heap_.size();
        while (true) {
            size_t left = 2 * i + 1, right = 2 * i + 2, smallest = i;
            if (left < n && cmp_(heap_[left], heap_[smallest])) smallest = left;
            if (right < n && cmp_(heap_[right], heap_[smallest])) smallest = right;
            if (smallest != i) {
                std::swap(heap_[i], heap_[smallest]);
                i = smallest;
            } else break;
        }
    }

public:
    MyPriorityQueue() = default;

    void push(const T& val) {
        heap_.push_back(val);
        siftUp(heap_.size() - 1);
    }

    T top() const { return heap_[0]; }

    void pop() {
        heap_[0] = std::move(heap_.back());
        heap_.pop_back();
        if (!heap_.empty()) siftDown(0);
    }

    bool empty() const { return heap_.empty(); }
    size_t size() const { return heap_.size(); }
};

// ==================== MyGraph ====================
// 图数据结构，支持多种最短路径算法
struct Edge {
    int to;             // 目标节点
    double distance;    // 距离
    double congestion;  // 拥挤度 (0,1]
    double idealSpeed;  // 理想速度
    int transportType;  // 交通类型: 1=步行, 2=自行车, 4=电瓶车

    // 计算通过此边的实际时间
    double time() const {
        double speed = congestion * idealSpeed;
        return speed > 0 ? distance / speed : 1e18;
    }

    // 是否支持指定交通方式
    bool supportsTransport(int transport) const {
        return (transportType & transport) != 0;
    }
};

struct PathResult {
    MyVector<int> path;     // 路径节点序列
    double totalDistance;    // 总距离
    double totalTime;        // 总时间
    bool found;              // 是否找到路径

    PathResult() : totalDistance(0), totalTime(0), found(false) {}
};

class MyGraph {
private:
    int nodeCount_;
    MyVector<MyVector<Edge>> adjList_;  // 邻接表

public:
    explicit MyGraph(int n = 0) : nodeCount_(n), adjList_(n) {}

    void resize(int n) {
        nodeCount_ = n;
        adjList_.clear();
        adjList_ = MyVector<MyVector<Edge>>(n);
    }

    int nodeCount() const { return nodeCount_; }

    void addEdge(int from, int to, double distance, double congestion = 1.0,
                 double idealSpeed = 5.0, int transportType = 1) {
        if (from >= 0 && from < nodeCount_ && to >= 0 && to < nodeCount_) {
            adjList_[from].push_back({to, distance, congestion, idealSpeed, transportType});
            adjList_[to].push_back({from, distance, congestion, idealSpeed, transportType}); // 无向图
        }
    }

    // Dijkstra最短路径 - 按距离
    PathResult shortestPath(int start, int end) const {
        PathResult result;
        if (start < 0 || start >= nodeCount_ || end < 0 || end >= nodeCount_) return result;

        MyVector<double> dist(nodeCount_, 1e18);
        MyVector<int> prev(nodeCount_, -1);
        MyVector<bool> visited(nodeCount_, false);

        // 使用自定义优先队列
        struct State { double d; int u; bool operator>(const State& o) const { return d > o.d; } };
        MyPriorityQueue<State, std::greater<State>> pq;

        dist[start] = 0;
        pq.push({0, start});

        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (visited[u]) continue;
            visited[u] = true;
            if (u == end) break;

            for (size_t i = 0; i < adjList_[u].size(); i++) {
                const Edge& e = adjList_[u][i];
                if (!visited[e.to] && dist[u] + e.distance < dist[e.to]) {
                    dist[e.to] = dist[u] + e.distance;
                    prev[e.to] = u;
                    pq.push({dist[e.to], e.to});
                }
            }
        }

        if (dist[end] >= 1e18) return result;

        // 回溯路径
        result.found = true;
        result.totalDistance = dist[end];
        for (int v = end; v != -1; v = prev[v]) {
            result.path.push_back(v);
        }
        // 反转路径
        for (size_t i = 0; i < result.path.size() / 2; i++) {
            std::swap(result.path[i], result.path[result.path.size() - 1 - i]);
        }
        return result;
    }

    // Dijkstra最短路径 - 按时间
    PathResult fastestPath(int start, int end) const {
        PathResult result;
        if (start < 0 || start >= nodeCount_ || end < 0 || end >= nodeCount_) return result;

        MyVector<double> dist(nodeCount_, 1e18);
        MyVector<int> prev(nodeCount_, -1);
        MyVector<bool> visited(nodeCount_, false);

        struct State { double d; int u; bool operator>(const State& o) const { return d > o.d; } };
        MyPriorityQueue<State, std::greater<State>> pq;

        dist[start] = 0;
        pq.push({0, start});

        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (visited[u]) continue;
            visited[u] = true;
            if (u == end) break;

            for (size_t i = 0; i < adjList_[u].size(); i++) {
                const Edge& e = adjList_[u][i];
                double t = e.time();
                if (!visited[e.to] && dist[u] + t < dist[e.to]) {
                    dist[e.to] = dist[u] + t;
                    prev[e.to] = u;
                    pq.push({dist[e.to], e.to});
                }
            }
        }

        if (dist[end] >= 1e18) return result;

        result.found = true;
        result.totalTime = dist[end];
        // 计算总距离
        result.totalDistance = 0;
        for (int v = end; v != -1; v = prev[v]) {
            result.path.push_back(v);
        }
        for (size_t i = result.path.size() - 1; i > 0; i--) {
            int u = result.path[i], w = result.path[i - 1];
            for (size_t j = 0; j < adjList_[u].size(); j++) {
                if (adjList_[u][j].to == w) {
                    result.totalDistance += adjList_[u][j].distance;
                    break;
                }
            }
        }
        // 反转路径
        for (size_t i = 0; i < result.path.size() / 2; i++) {
            std::swap(result.path[i], result.path[result.path.size() - 1 - i]);
        }
        return result;
    }

    // 指定交通工具的最短时间路径
    PathResult transportPath(int start, int end, int transport) const {
        PathResult result;
        if (start < 0 || start >= nodeCount_ || end < 0 || end >= nodeCount_) return result;

        MyVector<double> dist(nodeCount_, 1e18);
        MyVector<int> prev(nodeCount_, -1);
        MyVector<bool> visited(nodeCount_, false);

        struct State { double d; int u; bool operator>(const State& o) const { return d > o.d; } };
        MyPriorityQueue<State, std::greater<State>> pq;

        dist[start] = 0;
        pq.push({0, start});

        while (!pq.empty()) {
            auto [d, u] = pq.top(); pq.pop();
            if (visited[u]) continue;
            visited[u] = true;
            if (u == end) break;

            for (size_t i = 0; i < adjList_[u].size(); i++) {
                const Edge& e = adjList_[u][i];
                if (!e.supportsTransport(transport)) continue; // 过滤不支持该交通方式的边
                double t = e.time();
                if (!visited[e.to] && dist[u] + t < dist[e.to]) {
                    dist[e.to] = dist[u] + t;
                    prev[e.to] = u;
                    pq.push({dist[e.to], e.to});
                }
            }
        }

        if (dist[end] >= 1e18) return result;

        result.found = true;
        result.totalTime = dist[end];
        result.totalDistance = 0;
        for (int v = end; v != -1; v = prev[v]) {
            result.path.push_back(v);
        }
        for (size_t i = result.path.size() - 1; i > 0; i--) {
            int u = result.path[i], w = result.path[i - 1];
            for (size_t j = 0; j < adjList_[u].size(); j++) {
                if (adjList_[u][j].to == w) {
                    result.totalDistance += adjList_[u][j].distance;
                    break;
                }
            }
        }
        for (size_t i = 0; i < result.path.size() / 2; i++) {
            std::swap(result.path[i], result.path[result.path.size() - 1 - i]);
        }
        return result;
    }

    // 途经多点的最短路径（贪心近似TSP）
    PathResult multipointPath(int start, const MyVector<int>& waypoints) const {
        PathResult result;
        result.found = true;

        int current = start;
        MyVector<bool> visited(waypoints.size(), false);
        MyVector<int> order; // 访问顺序

        // 贪心：每次选最近的未访问点
        for (size_t k = 0; k < waypoints.size(); k++) {
            double bestDist = 1e18;
            int bestIdx = -1;
            PathResult bestPath;

            for (size_t j = 0; j < waypoints.size(); j++) {
                if (visited[j]) continue;
                auto pr = shortestPath(current, waypoints[j]);
                if (pr.found && pr.totalDistance < bestDist) {
                    bestDist = pr.totalDistance;
                    bestIdx = (int)j;
                    bestPath = pr;
                }
            }

            if (bestIdx == -1) { result.found = false; return result; }
            visited[bestIdx] = true;
            order.push_back(bestIdx);

            // 拼接路径
            for (size_t i = 0; i < bestPath.path.size(); i++) {
                if (result.path.empty() || bestPath.path[i] != result.path.back()) {
                    result.path.push_back(bestPath.path[i]);
                }
            }
            result.totalDistance += bestPath.totalDistance;
            result.totalTime += bestPath.totalTime;
            current = waypoints[bestIdx];
        }

        // 返回起点
        auto returnPath = shortestPath(current, start);
        if (!returnPath.found) { result.found = false; return result; }
        for (size_t i = 0; i < returnPath.path.size(); i++) {
            if (returnPath.path[i] != result.path.back()) {
                result.path.push_back(returnPath.path[i]);
            }
        }
        result.totalDistance += returnPath.totalDistance;
        result.totalTime += returnPath.totalTime;

        return result;
    }

    // 获取所有邻居
    const MyVector<Edge>& neighbors(int node) const {
        return adjList_[node];
    }
};

// ==================== 排序算法 ====================
// TopK部分排序 - 使用堆实现，不需要完全排序
// 返回按cmp排序的前K个元素
template<typename T, typename Compare>
void topKSort(MyVector<T>& arr, int topK, Compare cmp) {
    int n = (int)arr.size();
    if (topK >= n) {
        // 完全排序
        std::sort(arr.begin(), arr.end(), cmp);
        return;
    }
    // 使用部分排序：先对前topK+1个建堆，然后扫描剩余元素
    // 这里简单使用std::partial_sort
    std::partial_sort(arr.begin(), arr.begin() + topK, arr.end(), cmp);
    // 截断
    while ((int)arr.size() > topK) arr.pop_back();
}

// 快速排序
template<typename T, typename Compare>
void quickSort(MyVector<T>& arr, int left, int right, Compare cmp) {
    if (left >= right) return;
    T pivot = arr[(left + right) / 2];
    int i = left, j = right;
    while (i <= j) {
        while (cmp(arr[i], pivot)) i++;
        while (cmp(pivot, arr[j])) j--;
        if (i <= j) {
            std::swap(arr[i], arr[j]);
            i++; j--;
        }
    }
    quickSort(arr, left, j, cmp);
    quickSort(arr, i, right, cmp);
}

// ==================== 压缩算法 ====================
// 简单的RLE压缩/解压
inline std::string rleCompress(const std::string& input) {
    if (input.empty()) return "";
    std::string result;
    size_t i = 0;
    while (i < input.size()) {
        char c = input[i];
        size_t count = 1;
        while (i + count < input.size() && input[i + count] == c && count < 255) {
            count++;
        }
        if (count > 3) {
            result += '\x1F'; // 特殊标记
            result += c;
            result += (char)count;
        } else {
            for (size_t j = 0; j < count; j++) result += c;
        }
        i += count;
    }
    return result;
}

inline std::string rleDecompress(const std::string& input) {
    std::string result;
    size_t i = 0;
    while (i < input.size()) {
        if (input[i] == '\x1F' && i + 2 < input.size()) {
            char c = input[i + 1];
            int count = (unsigned char)input[i + 2];
            for (int j = 0; j < count; j++) result += c;
            i += 3;
        } else {
            result += input[i];
            i++;
        }
    }
    return result;
}
