#include "recommend.h"
#include "../core/algorithm.h"
#include <algorithm>

// 按热度推荐景区（使用partialSort，只排前topK）
MyVector<ScenicArea> recommendByHeat(MyVector<ScenicArea>& areas, int topK) {
    // 复制一份数据，避免修改原数组
    MyVector<ScenicArea> result;
    for (int i = 0; i < areas.size(); ++i) {
        result.push_back(areas[i]);
    }
    // 按热度降序部分排序，只排前topK
    partialSort(result, topK, [](const ScenicArea& a, const ScenicArea& b) {
        return a.heat > b.heat;
    });
    // 截取前topK个
    MyVector<ScenicArea> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 按评分推荐景区
MyVector<ScenicArea> recommendByRating(MyVector<ScenicArea>& areas, int topK) {
    MyVector<ScenicArea> result;
    for (int i = 0; i < areas.size(); ++i) {
        result.push_back(areas[i]);
    }
    // 按评分降序部分排序
    partialSort(result, topK, [](const ScenicArea& a, const ScenicArea& b) {
        return a.rating > b.rating;
    });
    MyVector<ScenicArea> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 按兴趣推荐景区（标签匹配度排序）
MyVector<ScenicArea> recommendByInterest(MyVector<ScenicArea>& areas, User& user, int topK) {
    MyVector<ScenicArea> result;
    for (int i = 0; i < areas.size(); ++i) {
        result.push_back(areas[i]);
    }
    // 按标签匹配度降序排序
    // 匹配度 = 用户兴趣标签与景区标签的交集数量
    fullSort(result, [&user](const ScenicArea& a, const ScenicArea& b) {
        int matchA = 0, matchB = 0;
        // 计算a的匹配度
        for (int i = 0; i < user.interests.size(); ++i) {
            for (int j = 0; j < a.tags.size(); ++j) {
                if (user.interests[i] == a.tags[j]) ++matchA;
            }
        }
        // 计算b的匹配度
        for (int i = 0; i < user.interests.size(); ++i) {
            for (int j = 0; j < b.tags.size(); ++j) {
                if (user.interests[i] == b.tags[j]) ++matchB;
            }
        }
        // 匹配度高的排前面，匹配度相同则按热度排
        if (matchA != matchB) return matchA > matchB;
        return a.heat > b.heat;
    });
    MyVector<ScenicArea> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 辅助函数：判断字符串是否包含子串（不区分大小写的模糊匹配）
static bool containsIgnoreCase(const std::string& str, const std::string& sub) {
    if (sub.empty()) return true;
    if (str.size() < sub.size()) return false;
    for (size_t i = 0; i <= str.size() - sub.size(); ++i) {
        bool match = true;
        for (size_t j = 0; j < sub.size(); ++j) {
            char c1 = str[i + j], c2 = sub[j];
            // 简单的小写转换
            if (c1 >= 'A' && c1 <= 'Z') c1 += 32;
            if (c2 >= 'A' && c2 <= 'Z') c2 += 32;
            if (c1 != c2) { match = false; break; }
        }
        if (match) return true;
    }
    return false;
}

// 辅助函数：判断景区是否匹配关键字和类别
static bool areaMatchesKeyword(const ScenicArea& area, const std::string& keyword, const std::string& category) {
    // 类别过滤
    if (!category.empty() && area.category != category) return false;
    // 关键字为空则只按类别过滤
    if (keyword.empty()) return true;
    // 名称匹配
    if (containsIgnoreCase(area.name, keyword)) return true;
    // 描述匹配
    if (containsIgnoreCase(area.description, keyword)) return true;
    // 标签匹配
    for (int i = 0; i < area.tags.size(); ++i) {
        if (containsIgnoreCase(area.tags[i], keyword)) return true;
    }
    return false;
}

// 按名称/类别/关键字查询景区
MyVector<ScenicArea> searchAreas(MyVector<ScenicArea>& areas, std::string keyword, std::string category) {
    MyVector<ScenicArea> result;
    for (int i = 0; i < areas.size(); ++i) {
        if (areaMatchesKeyword(areas[i], keyword, category)) {
            result.push_back(areas[i]);
        }
    }
    // 查询结果按热度排序
    fullSort(result, [](const ScenicArea& a, const ScenicArea& b) {
        return a.heat > b.heat;
    });
    return result;
}

// 按名称/类别/关键字查询建筑物
MyVector<Building> searchBuildings(MyVector<Building>& buildings, std::string keyword) {
    MyVector<Building> result;
    for (int i = 0; i < buildings.size(); ++i) {
        const Building& b = buildings[i];
        if (keyword.empty()) {
            result.push_back(b);
            continue;
        }
        // 名称匹配
        if (containsIgnoreCase(b.name, keyword)) { result.push_back(b); continue; }
        // 类型匹配
        if (containsIgnoreCase(b.type, keyword)) { result.push_back(b); continue; }
        // 描述匹配
        if (containsIgnoreCase(b.description, keyword)) { result.push_back(b); continue; }
        // 标签匹配
        bool tagMatch = false;
        for (int j = 0; j < b.tags.size(); ++j) {
            if (containsIgnoreCase(b.tags[j], keyword)) { tagMatch = true; break; }
        }
        if (tagMatch) { result.push_back(b); continue; }
    }
    // 查询结果按热度排序
    fullSort(result, [](const Building& a, const Building& b) {
        return a.heat > b.heat;
    });
    return result;
}
