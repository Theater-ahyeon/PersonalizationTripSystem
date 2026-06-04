#include "diary_manager.h"
#include "../core/algorithm.h"

// 日记存储（全局静态变量，模拟数据库）
static MyVector<TravelDiary> g_diaries;
static int g_nextDiaryId = 1;

// 创建日记
void createDiary(TravelDiary& diary) {
    diary.id = g_nextDiaryId++;
    g_diaries.push_back(diary);
}

// 更新日记
void updateDiary(TravelDiary& diary) {
    for (int i = 0; i < g_diaries.size(); ++i) {
        if (g_diaries[i].id == diary.id) {
            g_diaries[i] = diary;
            return;
        }
    }
}

// 删除日记
void deleteDiary(int diaryId) {
    for (int i = 0; i < g_diaries.size(); ++i) {
        if (g_diaries[i].id == diaryId) {
            g_diaries.erase(i);
            return;
        }
    }
}

// 获取所有日记
MyVector<TravelDiary> getAllDiaries() {
    return g_diaries;
}

// 按热度/评分推荐日记
MyVector<TravelDiary> recommendDiaries(MyVector<TravelDiary>& diaries, int topK, std::string sortBy) {
    MyVector<TravelDiary> result;
    for (int i = 0; i < diaries.size(); ++i) {
        result.push_back(diaries[i]);
    }

    if (sortBy == "heat") {
        // 按热度降序部分排序
        partialSort(result, topK, [](const TravelDiary& a, const TravelDiary& b) {
            return a.heat > b.heat;
        });
    } else {
        // 默认按评分降序部分排序
        partialSort(result, topK, [](const TravelDiary& a, const TravelDiary& b) {
            return a.rating > b.rating;
        });
    }

    MyVector<TravelDiary> topResult;
    int count = (topK < result.size()) ? topK : result.size();
    for (int i = 0; i < count; ++i) {
        topResult.push_back(result[i]);
    }
    return topResult;
}

// 评分
void rateDiary(int diaryId, double score) {
    for (int i = 0; i < g_diaries.size(); ++i) {
        if (g_diaries[i].id == diaryId) {
            // 简单平均评分
            g_diaries[i].rating = (g_diaries[i].rating + score) / 2.0;
            return;
        }
    }
}

// 浏览（热度+1）
void viewDiary(int diaryId) {
    for (int i = 0; i < g_diaries.size(); ++i) {
        if (g_diaries[i].id == diaryId) {
            g_diaries[i].heat += 1.0;
            return;
        }
    }
}
