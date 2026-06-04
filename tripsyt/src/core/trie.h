#pragma once
#ifndef MY_STL_H_INCLUDED
#include "my_vector.h"
#endif
#include <string>

// Trie树节点（用于全文检索，关联日记ID）
struct TrieNode {
    TrieNode* children[128];  // ASCII字符子节点
    bool isEnd;               // 是否为单词结尾
    MyVector<int> diaryIds;   // 关联的日记ID列表

    TrieNode() : isEnd(false) {
        for (int i = 0; i < 128; ++i) {
            children[i] = nullptr;
        }
    }
};

// Trie字典树（用于全文检索）
class Trie {
private:
    TrieNode* root_;

    // 递归释放节点
    void destroyNode(TrieNode* node) {
        if (!node) return;
        for (int i = 0; i < 128; ++i) {
            destroyNode(node->children[i]);
        }
        delete node;
    }

    // 递归收集所有以prefix开头的日记ID
    void collectIds(TrieNode* node, MyVector<int>& result) const {
        if (!node) return;
        if (node->isEnd) {
            for (int i = 0; i < node->diaryIds.size(); ++i) {
                result.push_back(node->diaryIds[i]);
            }
        }
        for (int i = 0; i < 128; ++i) {
            collectIds(node->children[i], result);
        }
    }

public:
    Trie() : root_(new TrieNode()) {}

    ~Trie() {
        destroyNode(root_);
    }

    // 禁止拷贝
    Trie(const Trie&) = delete;
    Trie& operator=(const Trie&) = delete;

    // 插入单词，关联日记ID
    void insert(const std::string& word, int diaryId) {
        TrieNode* cur = root_;
        for (char c : word) {
            int idx = static_cast<int>(static_cast<unsigned char>(c));
            if (idx < 0 || idx >= 128) continue;
            if (!cur->children[idx]) {
                cur->children[idx] = new TrieNode();
            }
            cur = cur->children[idx];
        }
        cur->isEnd = true;
        // 避免重复添加同一个日记ID
        for (int i = 0; i < cur->diaryIds.size(); ++i) {
            if (cur->diaryIds[i] == diaryId) return;
        }
        cur->diaryIds.push_back(diaryId);
    }

    // 搜索精确匹配的单词，返回关联的日记ID列表
    MyVector<int> search(const std::string& word) const {
        TrieNode* cur = root_;
        for (char c : word) {
            int idx = static_cast<int>(static_cast<unsigned char>(c));
            if (idx < 0 || idx >= 128 || !cur->children[idx]) {
                return MyVector<int>();
            }
            cur = cur->children[idx];
        }
        if (cur->isEnd) return cur->diaryIds;
        return MyVector<int>();
    }

    // 前缀搜索，返回所有以prefix开头的日记ID
    MyVector<int> searchPrefix(const std::string& prefix) const {
        TrieNode* cur = root_;
        for (char c : prefix) {
            int idx = static_cast<int>(static_cast<unsigned char>(c));
            if (idx < 0 || idx >= 128 || !cur->children[idx]) {
                return MyVector<int>();
            }
            cur = cur->children[idx];
        }
        MyVector<int> result;
        collectIds(cur, result);
        return result;
    }

    // 判断单词是否存在
    bool contains(const std::string& word) const {
        TrieNode* cur = root_;
        for (char c : word) {
            int idx = static_cast<int>(static_cast<unsigned char>(c));
            if (idx < 0 || idx >= 128 || !cur->children[idx]) {
                return false;
            }
            cur = cur->children[idx];
        }
        return cur->isEnd;
    }

    // 清空Trie
    void clear() {
        destroyNode(root_);
        root_ = new TrieNode();
    }
};
