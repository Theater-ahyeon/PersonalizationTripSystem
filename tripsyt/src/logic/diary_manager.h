#pragma once
#include "../models/models.h"

// 旅游日记管理模块

// 创建日记
void createDiary(TravelDiary& diary);

// 更新日记
void updateDiary(TravelDiary& diary);

// 删除日记
void deleteDiary(int diaryId);

// 获取所有日记
MyVector<TravelDiary> getAllDiaries();

// 按热度/评分推荐日记
MyVector<TravelDiary> recommendDiaries(MyVector<TravelDiary>& diaries, int topK, std::string sortBy);

// 评分
void rateDiary(int diaryId, double score);

// 浏览（热度+1）
void viewDiary(int diaryId);
