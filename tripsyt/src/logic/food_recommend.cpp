#include "food_recommend.h"
#include "../core/algorithm.h"

// 按热度推荐美食（partialSort）
MyVector<Food> recommendByHeat(MyVector<Food>& foods, int topK) {
    MyVector<Food> result;
    for (int i = 0; i < foods.size(); ++i) {
        result.push_back(foods[i]);
    }
    // 按热度降序部分排序
    partialSort(result, topK, [](const Food& a, const Food& b) {
        return a.heat > b.heat;
    });
    MyVector<Food> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 按评分推荐美食
MyVector<Food> recommendByRating(MyVector<Food>& foods, int topK) {
    MyVector<Food> result;
    for (int i = 0; i < foods.size(); ++i) {
        result.push_back(foods[i]);
    }
    // 按评分降序部分排序
    partialSort(result, topK, [](const Food& a, const Food& b) {
        return a.rating > b.rating;
    });
    MyVector<Food> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 按距离推荐美食
MyVector<Food> recommendByDistance(MyVector<Food>& foods, int topK) {
    MyVector<Food> result;
    for (int i = 0; i < foods.size(); ++i) {
        result.push_back(foods[i]);
    }
    // 按距离升序部分排序
    partialSort(result, topK, [](const Food& a, const Food& b) {
        return a.distance < b.distance;
    });
    MyVector<Food> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 按菜系过滤
MyVector<Food> filterByCuisine(MyVector<Food>& foods, std::string cuisine) {
    MyVector<Food> result;
    for (int i = 0; i < foods.size(); ++i) {
        if (foods[i].cuisine == cuisine) {
            result.push_back(foods[i]);
        }
    }
    return result;
}

// 辅助函数：不区分大小写的子串匹配
static bool containsIgnoreCase(const std::string& str, const std::string& sub) {
    if (sub.empty()) return true;
    if (str.size() < sub.size()) return false;
    for (size_t i = 0; i <= str.size() - sub.size(); ++i) {
        bool match = true;
        for (size_t j = 0; j < sub.size(); ++j) {
            char c1 = str[i + j], c2 = sub[j];
            if (c1 >= 'A' && c1 <= 'Z') c1 += 32;
            if (c2 >= 'A' && c2 <= 'Z') c2 += 32;
            if (c1 != c2) { match = false; break; }
        }
        if (match) return true;
    }
    return false;
}

// 模糊查找美食
MyVector<Food> fuzzySearchFood(MyVector<Food>& foods, std::string keyword) {
    MyVector<Food> result;
    for (int i = 0; i < foods.size(); ++i) {
        const Food& f = foods[i];
        // 名称匹配
        if (containsIgnoreCase(f.name, keyword)) { result.push_back(f); continue; }
        // 菜系匹配
        if (containsIgnoreCase(f.cuisine, keyword)) { result.push_back(f); continue; }
        // 饭店/窗口名称匹配
        if (containsIgnoreCase(f.restaurant, keyword)) { result.push_back(f); continue; }
    }
    // 按热度排序
    fullSort(result, [](const Food& a, const Food& b) {
        return a.heat > b.heat;
    });
    return result;
}
