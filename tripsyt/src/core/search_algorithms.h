#pragma once

#include "my_vector.h"
#include <string>
#include <algorithm>

/**
 * 查找算法集合
 * 包含二分查找、模糊查找（编辑距离）、KMP字符串匹配
 */

// ==================== 二分查找 ====================

/**
 * 二分查找
 * 要求数组已按比较函数排序
 * @param arr 已排序数组
 * @param target 目标值
 * @param cmp 比较函数，cmp(a,b)=true 表示 a < b（a排在b前面）
 * @return 找到返回索引，未找到返回 -1
 */
template <typename T>
int binarySearch(MyVector<T>& arr, const T& target, bool (*cmp)(const T&, const T&)) {
    int left = 0;
    int right = arr.size() - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;

        // arr[mid] == target
        if (!cmp(arr[mid], target) && !cmp(target, arr[mid])) {
            return mid;
        }
        // arr[mid] < target
        if (cmp(arr[mid], target)) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

// ==================== 编辑距离 ====================

namespace internal {

// 计算两个字符串的编辑距离（Levenshtein距离）
inline int editDistance(const std::string& s1, const std::string& s2) {
    int m = s1.length();
    int n = s2.length();

    // 动态规划数组
    int** dp = new int*[m + 1];
    for (int i = 0; i <= m; ++i) {
        dp[i] = new int[n + 1];
    }

    // 初始化
    for (int i = 0; i <= m; ++i) dp[i][0] = i;
    for (int j = 0; j <= n; ++j) dp[0][j] = j;

    // 填表
    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (s1[i - 1] == s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                int ins = dp[i][j - 1] + 1;     // 插入
                int del = dp[i - 1][j] + 1;     // 删除
                int rep = dp[i - 1][j - 1] + 1; // 替换
                dp[i][j] = ins;
                if (del < dp[i][j]) dp[i][j] = del;
                if (rep < dp[i][j]) dp[i][j] = rep;
            }
        }
    }

    int result = dp[m][n];

    // 释放内存
    for (int i = 0; i <= m; ++i) {
        delete[] dp[i];
    }
    delete[] dp;

    return result;
}

} // namespace internal

/**
 * 模糊查找：基于编辑距离在数组中查找与关键词相似的元素
 * @param arr 待查找数组
 * @param keyword 关键词
 * @param extractor 从元素中提取字符串的函数
 * @param maxDistance 最大允许编辑距离（默认2）
 * @return 匹配的元素索引列表
 */
template <typename T>
MyVector<int> fuzzySearch(MyVector<T>& arr, const std::string& keyword,
                          std::string (*extractor)(const T&), int maxDistance = 2) {
    MyVector<int> results;
    for (int i = 0; i < arr.size(); ++i) {
        std::string text = extractor(arr[i]);
        int dist = internal::editDistance(keyword, text);
        if (dist <= maxDistance) {
            results.push_back(i);
        }
    }
    return results;
}

/**
 * 模糊查找（字符串数组版本）
 * @param arr 字符串数组
 * @param keyword 关键词
 * @param maxDistance 最大允许编辑距离（默认2）
 * @return 匹配的元素索引列表
 */
inline MyVector<int> fuzzySearch(MyVector<std::string>& arr, const std::string& keyword,
                                 int maxDistance = 2) {
    MyVector<int> results;
    for (int i = 0; i < arr.size(); ++i) {
        int dist = internal::editDistance(keyword, arr[i]);
        if (dist <= maxDistance) {
            results.push_back(i);
        }
    }
    return results;
}

// ==================== KMP 字符串匹配 ====================

/**
 * 构建 KMP 前缀表（next数组）
 * @param pattern 模式串
 * @return 前缀表数组
 */
inline MyVector<int> buildKMPTable(const std::string& pattern) {
    int m = pattern.length();
    MyVector<int> lps;
    lps.reserve(m);
    for (int i = 0; i < m; ++i) lps.push_back(0);

    int len = 0; // 前一个最长前缀后缀的长度
    int i = 1;

    while (i < m) {
        if (pattern[i] == pattern[len]) {
            ++len;
            lps[i] = len;
            ++i;
        } else {
            if (len != 0) {
                len = lps[len - 1];
            } else {
                lps[i] = 0;
                ++i;
            }
        }
    }
    return lps;
}

/**
 * KMP 字符串匹配
 * @param text 主串
 * @param pattern 模式串
 * @return 匹配的起始位置列表，未匹配返回空列表
 */
inline MyVector<int> kmpSearch(const std::string& text, const std::string& pattern) {
    MyVector<int> results;
    if (pattern.empty() || text.empty() || pattern.length() > text.length()) {
        return results;
    }

    MyVector<int> lps = buildKMPTable(pattern);
    int n = text.length();
    int m = pattern.length();

    int i = 0; // text的索引
    int j = 0; // pattern的索引

    while (i < n) {
        if (text[i] == pattern[j]) {
            ++i;
            ++j;
        }

        if (j == m) {
            // 找到匹配
            results.push_back(i - j);
            j = lps[j - 1];
        } else if (i < n && text[i] != pattern[j]) {
            if (j != 0) {
                j = lps[j - 1];
            } else {
                ++i;
            }
        }
    }
    return results;
}
