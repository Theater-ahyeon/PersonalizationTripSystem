#pragma once

#include "my_vector.h"
#include "min_heap.h"
#include <string>

/**
 * 哈夫曼压缩与解压
 * 用于旅游日记压缩存储
 */

// 哈夫曼树节点
struct HuffmanNode {
    char ch;              // 字符（内部节点为'\0'）
    int freq;             // 频率
    HuffmanNode* left;    // 左子节点
    HuffmanNode* right;   // 右子节点

    HuffmanNode(char c, int f) : ch(c), freq(f), left(nullptr), right(nullptr) {}
    HuffmanNode(int f) : ch('\0'), freq(f), left(nullptr), right(nullptr) {}
};

// 哈夫曼节点比较器（用于最小堆）
struct HuffmanNodeCmp {
    HuffmanNode* node;
    HuffmanNodeCmp() : node(nullptr) {}
    HuffmanNodeCmp(HuffmanNode* n) : node(n) {}
    bool operator<(const HuffmanNodeCmp& other) const {
        return node->freq < other.node->freq;
    }
    bool operator>(const HuffmanNodeCmp& other) const {
        return node->freq > other.node->freq;
    }
    bool operator==(const HuffmanNodeCmp& other) const {
        return node == other.node;
    }
};

namespace internal {

// 递归删除哈夫曼树
inline void destroyHuffmanTree(HuffmanNode* node) {
    if (node == nullptr) return;
    destroyHuffmanTree(node->left);
    destroyHuffmanTree(node->right);
    delete node;
}

// 递归生成编码表
inline void generateCodes(HuffmanNode* node, const std::string& code,
                          MyVector<std::pair<char, std::string>>& codeTable) {
    if (node == nullptr) return;

    // 叶子节点
    if (node->left == nullptr && node->right == nullptr) {
        codeTable.push_back(std::pair<char, std::string>(node->ch, code));
        return;
    }

    generateCodes(node->left, code + "0", codeTable);
    generateCodes(node->right, code + "1", codeTable);
}

// 在编码表中查找字符的编码
inline std::string findCode(const MyVector<std::pair<char, std::string>>& codeTable, char ch) {
    for (int i = 0; i < codeTable.size(); ++i) {
        if (codeTable[i].first == ch) {
            return codeTable[i].second;
        }
    }
    return "";
}

// 统计字符频率
inline void countFrequency(const std::string& data, int freq[256]) {
    for (int i = 0; i < 256; ++i) freq[i] = 0;
    for (int i = 0; i < (int)data.length(); ++i) {
        freq[(unsigned char)data[i]]++;
    }
}

} // namespace internal

/**
 * 哈夫曼压缩结果
 */
struct HuffmanResult {
    std::string compressedBits;  // 压缩后的比特串（用'0'和'1'表示）
    MyVector<std::pair<char, std::string>> codeTable; // 编码表

    HuffmanResult() {}
};

/**
 * 哈夫曼压缩
 * @param data 原始字符串数据
 * @return 压缩结果（包含比特串和编码表）
 */
inline HuffmanResult huffmanCompress(const std::string& data) {
    HuffmanResult result;

    if (data.empty()) return result;

    // 1. 统计字符频率
    int freq[256];
    internal::countFrequency(data, freq);

    // 2. 构建最小堆
    MinHeap<HuffmanNodeCmp> heap;
    for (int i = 0; i < 256; ++i) {
        if (freq[i] > 0) {
            HuffmanNode* node = new HuffmanNode((char)i, freq[i]);
            heap.push(HuffmanNodeCmp(node));
        }
    }

    // 特殊情况：只有一个字符
    if (heap.size() == 1) {
        HuffmanNodeCmp top = heap.top();
        heap.pop();
        HuffmanNode* root = new HuffmanNode(top.node->freq);
        root->left = top.node;
        internal::generateCodes(root, "0", result.codeTable);
        internal::destroyHuffmanTree(root);
    } else {
        // 3. 构建哈夫曼树
        while (heap.size() > 1) {
            HuffmanNodeCmp left = heap.top(); heap.pop();
            HuffmanNodeCmp right = heap.top(); heap.pop();

            HuffmanNode* parent = new HuffmanNode(left.node->freq + right.node->freq);
            parent->left = left.node;
            parent->right = right.node;

            heap.push(HuffmanNodeCmp(parent));
        }

        // 4. 生成编码表
        HuffmanNodeCmp rootCmp = heap.top(); heap.pop();
        HuffmanNode* root = rootCmp.node;
        internal::generateCodes(root, "", result.codeTable);
        internal::destroyHuffmanTree(root);
    }

    // 5. 编码原始数据
    std::string compressed;
    for (int i = 0; i < (int)data.length(); ++i) {
        compressed += internal::findCode(result.codeTable, data[i]);
    }
    result.compressedBits = compressed;

    return result;
}

/**
 * 哈夫曼解压
 * @param compressed 压缩结果
 * @return 原始字符串数据
 */
inline std::string huffmanDecompress(const HuffmanResult& compressed) {
    if (compressed.compressedBits.empty() || compressed.codeTable.empty()) {
        return "";
    }

    // 构建解码树（从编码表重建哈夫曼树）
    HuffmanNode* root = new HuffmanNode(0);

    for (int i = 0; i < compressed.codeTable.size(); ++i) {
        char ch = compressed.codeTable[i].first;
        const std::string& code = compressed.codeTable[i].second;

        HuffmanNode* current = root;
        for (int j = 0; j < (int)code.length(); ++j) {
            if (code[j] == '0') {
                if (current->left == nullptr) {
                    current->left = new HuffmanNode(0);
                }
                current = current->left;
            } else {
                if (current->right == nullptr) {
                    current->right = new HuffmanNode(0);
                }
                current = current->right;
            }
        }
        current->ch = ch;
    }

    // 解码
    std::string result;
    HuffmanNode* current = root;
    for (int i = 0; i < (int)compressed.compressedBits.length(); ++i) {
        if (compressed.compressedBits[i] == '0') {
            current = current->left;
        } else {
            current = current->right;
        }

        // 到达叶子节点
        if (current->left == nullptr && current->right == nullptr) {
            result += current->ch;
            current = root;
        }
    }

    internal::destroyHuffmanTree(root);
    return result;
}
