#pragma once
#ifndef MY_STL_H_INCLUDED
#include "my_vector.h"
#include "graph.h"
#endif
#include <functional>
#include <algorithm>

// 自定义算法库

// 部分排序：只排序前topK个元素（基于快速选择算法）
// 时间复杂度：平均O(n + k*log(k))
template <typename T, typename Compare>
void partialSort(MyVector<T>& vec, int topK, Compare comp) {
    int n = vec.size();
    if (topK <= 0 || n == 0) return;
    if (topK >= n) {
        // 完全排序
        std::sort(vec.data(), vec.data() + n, comp);
        return;
    }

    // 使用快速选择找到第topK小的分界点
    int left = 0, right = n - 1;
    while (left < right) {
        // 三数取中法选择pivot
        int mid = left + (right - left) / 2;
        if (comp(vec[mid], vec[left])) std::swap(vec[left], vec[mid]);
        if (comp(vec[right], vec[left])) std::swap(vec[left], vec[right]);
        if (comp(vec[mid], vec[right])) std::swap(vec[mid], vec[right]);

        T pivot = vec[right];
        int i = left;
        for (int j = left; j < right; ++j) {
            if (comp(vec[j], pivot)) {
                std::swap(vec[i], vec[j]);
                ++i;
            }
        }
        std::swap(vec[i], vec[right]);

        if (i == topK - 1) {
            break;
        } else if (i < topK - 1) {
            left = i + 1;
        } else {
            right = i - 1;
        }
    }

    // 对前topK个元素进行排序
    std::sort(vec.data(), vec.data() + topK, comp);
}

// 完全排序
template <typename T, typename Compare>
void fullSort(MyVector<T>& vec, Compare comp) {
    std::sort(vec.data(), vec.data() + vec.size(), comp);
}

// KMP字符串匹配算法
// 返回pattern在text中所有出现位置的起始索引
inline MyVector<int> kmpSearch(const std::string& text, const std::string& pattern) {
    MyVector<int> result;
    int n = static_cast<int>(text.size());
    int m = static_cast<int>(pattern.size());
    if (m == 0 || n < m) return result;

    // 构建next数组
    MyVector<int> next(m);
    next[0] = -1;
    int k = -1;
    for (int j = 1; j < m; ++j) {
        while (k >= 0 && pattern[k + 1] != pattern[j]) {
            k = next[k];
        }
        if (pattern[k + 1] == pattern[j]) {
            ++k;
        }
        next[j] = k;
    }

    // 匹配
    k = -1;
    for (int i = 0; i < n; ++i) {
        while (k >= 0 && pattern[k + 1] != text[i]) {
            k = next[k];
        }
        if (pattern[k + 1] == text[i]) {
            ++k;
        }
        if (k == m - 1) {
            result.push_back(i - m + 1);
            k = next[k];
        }
    }
    return result;
}

// Dijkstra最短路径算法（基于距离）- 仅在未使用my_stl.h时可用
#ifndef MY_STL_H_INCLUDED
inline MyVector<int> dijkstraShortestPath(const Graph& graph, int start, int end, MyVector<double>& dist) {
    int n = graph.nodeCount();
    dist.clear();
    dist.resize(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;
    dist[start] = 0;

    MyVector<int> prev(n);
    for (int i = 0; i < n; ++i) prev[i] = -1;

    MyVector<bool> visited(n);
    for (int i = 0; i < n; ++i) visited[i] = false;

    // 简单优先队列实现（小顶堆用数组模拟）
    // 每次选取未访问的最小距离节点
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
        if (u == end) break;

        graph.forEachEdge(u, [&](const Edge& e) {
            double newDist = dist[u] + e.distance;
            if (newDist < dist[e.to]) {
                dist[e.to] = newDist;
                prev[e.to] = u;
            }
        });
    }

    // 回溯路径
    MyVector<int> path;
    if (dist[end] >= 1e18) return path; // 不可达
    int cur = end;
    while (cur != -1) {
        path.insert(0, cur);
        cur = prev[cur];
    }
    return path;
}

// Dijkstra最短时间路径（考虑拥挤度）
inline MyVector<int> dijkstraShortestTimePath(const Graph& graph, int start, int end, MyVector<double>& dist) {
    int n = graph.nodeCount();
    dist.clear();
    dist.resize(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;
    dist[start] = 0;

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
        if (u == end) break;

        graph.forEachEdge(u, [&](const Edge& e) {
            double time = e.travelTime();
            double newTime = dist[u] + time;
            if (newTime < dist[e.to]) {
                dist[e.to] = newTime;
                prev[e.to] = u;
            }
        });
    }

    MyVector<int> path;
    if (dist[end] >= 1e18) return path;
    int cur = end;
    while (cur != -1) {
        path.insert(0, cur);
        cur = prev[cur];
    }
    return path;
}

// Dijkstra带交通工具过滤的最短时间路径
inline MyVector<int> dijkstraWithTransport(const Graph& graph, int start, int end, RoadType transport, MyVector<double>& dist) {
    int n = graph.nodeCount();
    dist.clear();
    dist.resize(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;
    dist[start] = 0;

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
        if (u == end) break;

        graph.forEachEdge(u, [&](const Edge& e) {
            // 只考虑指定交通工具的道路
            if (e.roadType != transport) return;
            double time = e.travelTime();
            double newTime = dist[u] + time;
            if (newTime < dist[e.to]) {
                dist[e.to] = newTime;
                prev[e.to] = u;
            }
        });
    }

    MyVector<int> path;
    if (dist[end] >= 1e18) return path;
    int cur = end;
    while (cur != -1) {
        path.insert(0, cur);
        cur = prev[cur];
    }
    return path;
}

// 混合交通工具最短时间路径（步行+自行车/电瓶车均可）
inline MyVector<int> dijkstraMixedTransport(const Graph& graph, int start, int end, MyVector<double>& dist) {
    int n = graph.nodeCount();
    dist.clear();
    dist.resize(n);
    for (int i = 0; i < n; ++i) dist[i] = 1e18;
    dist[start] = 0;

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
        if (u == end) break;

        graph.forEachEdge(u, [&](const Edge& e) {
            double time = e.travelTime();
            double newTime = dist[u] + time;
            if (newTime < dist[e.to]) {
                dist[e.to] = newTime;
                prev[e.to] = u;
            }
        });
    }

    MyVector<int> path;
    if (dist[end] >= 1e18) return path;
    int cur = end;
    while (cur != -1) {
        path.insert(0, cur);
        cur = prev[cur];
    }
    return path;
}

#endif // MY_STL_H_INCLUDED (Graph相关Dijkstra函数结束)

// 哈夫曼树节点
struct HuffNode {
    char ch;           // 字符
    double freq;       // 频率
    HuffNode* left;
    HuffNode* right;
    HuffNode(char c, double f) : ch(c), freq(f), left(nullptr), right(nullptr) {}
    HuffNode(double f) : ch(0), freq(f), left(nullptr), right(nullptr) {}
};

// 哈夫曼压缩：返回压缩后的字符串（编码表+编码数据）
inline std::string huffmanCompress(const std::string& content) {
    if (content.empty()) return "";

    // 统计字符频率
    int freq[128] = { 0 };
    for (char c : content) {
        int idx = static_cast<int>(static_cast<unsigned char>(c));
        if (idx >= 0 && idx < 128) freq[idx]++;
    }

    // 构建哈夫曼树
    MyVector<HuffNode*> nodes;
    for (int i = 0; i < 128; ++i) {
        if (freq[i] > 0) {
            nodes.push_back(new HuffNode(static_cast<char>(i), static_cast<double>(freq[i])));
        }
    }

    if (nodes.size() == 1) {
        // 只有一种字符
        std::string result = std::string(1, nodes[0]->ch) + ":" + std::to_string(content.size());
        delete nodes[0];
        return result;
    }

    // 简单选择构建哈夫曼树
    while (nodes.size() > 1) {
        // 找到最小的两个
        int min1 = 0, min2 = 1;
        if (nodes[min2]->freq < nodes[min1]->freq) std::swap(min1, min2);
        for (int i = 2; i < nodes.size(); ++i) {
            if (nodes[i]->freq < nodes[min1]->freq) {
                min2 = min1;
                min1 = i;
            } else if (nodes[i]->freq < nodes[min2]->freq) {
                min2 = i;
            }
        }
        HuffNode* parent = new HuffNode(nodes[min1]->freq + nodes[min2]->freq);
        parent->left = nodes[min1];
        parent->right = nodes[min2];
        // 删除min1和min2，加入parent（先删大索引）
        int del1 = min1 > min2 ? min1 : min2;
        int del2 = min1 > min2 ? min2 : min1;
        nodes.erase(del1);
        nodes.erase(del2);
        nodes.push_back(parent);
    }

    HuffNode* root = nodes[0];

    // 生成编码表
    std::string codes[128];
    // 递归生成编码
    struct Helper {
        static void generateCodes(HuffNode* node, std::string code, std::string codes[]) {
            if (!node) return;
            if (!node->left && !node->right) {
                int idx = static_cast<int>(static_cast<unsigned char>(node->ch));
                if (idx >= 0 && idx < 128) codes[idx] = code;
                return;
            }
            generateCodes(node->left, code + "0", codes);
            generateCodes(node->right, code + "1", codes);
        }
        static void destroyTree(HuffNode* node) {
            if (!node) return;
            destroyTree(node->left);
            destroyTree(node->right);
            delete node;
        }
    };

    Helper::generateCodes(root, "", codes);

    // 编码：格式 "编码表长度|字符1:编码1|字符2:编码2|...|编码数据"
    std::string result;
    int codeCount = 0;
    for (int i = 0; i < 128; ++i) {
        if (!codes[i].empty()) ++codeCount;
    }
    result += std::to_string(codeCount) + "|";
    for (int i = 0; i < 128; ++i) {
        if (!codes[i].empty()) {
            result += std::to_string(i) + ":" + codes[i] + "|";
        }
    }
    // 编码数据
    for (char c : content) {
        int idx = static_cast<int>(static_cast<unsigned char>(c));
        if (idx >= 0 && idx < 128) result += codes[idx];
    }

    Helper::destroyTree(root);
    return result;
}

// 哈夫曼解压
inline std::string huffmanDecompress(const std::string& compressed) {
    if (compressed.empty()) return "";

    // 解析编码表
    int pos = 0;
    // 读取编码表长度
    std::string countStr;
    while (pos < static_cast<int>(compressed.size()) && compressed[pos] != '|') {
        countStr += compressed[pos++];
    }
    ++pos; // 跳过'|'

    int codeCount = 0;
    for (char c : countStr) codeCount = codeCount * 10 + (c - '0');

    // 特殊情况：只有一种字符
    if (codeCount == 0) return "";

    // 读取编码表
    std::string codes[128];
    for (int i = 0; i < codeCount; ++i) {
        std::string idxStr;
        while (pos < static_cast<int>(compressed.size()) && compressed[pos] != ':') {
            idxStr += compressed[pos++];
        }
        ++pos; // 跳过':'
        int charIdx = 0;
        for (char c : idxStr) charIdx = charIdx * 10 + (c - '0');

        std::string code;
        while (pos < static_cast<int>(compressed.size()) && compressed[pos] != '|') {
            code += compressed[pos++];
        }
        ++pos; // 跳过'|'
        if (charIdx >= 0 && charIdx < 128) codes[charIdx] = code;
    }

    // 构建解码映射：编码 -> 字符
    // 简单线性搜索解码
    std::string result;
    std::string currentCode;
    for (int i = pos; i < static_cast<int>(compressed.size()); ++i) {
        currentCode += compressed[i];
        // 查找匹配的编码
        for (int j = 0; j < 128; ++j) {
            if (!codes[j].empty() && codes[j] == currentCode) {
                result += static_cast<char>(j);
                currentCode.clear();
                break;
            }
        }
    }

    return result;
}
