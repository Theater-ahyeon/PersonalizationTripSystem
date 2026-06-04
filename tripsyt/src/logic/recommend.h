#pragma once
#include "../models/models.h"

// 旅游推荐模块

// 按热度推荐景区（使用partialSort，只排前topK）
MyVector<ScenicArea> recommendByHeat(MyVector<ScenicArea>& areas, int topK);

// 按评分推荐景区
MyVector<ScenicArea> recommendByRating(MyVector<ScenicArea>& areas, int topK);

// 按兴趣推荐景区（标签匹配度排序）
MyVector<ScenicArea> recommendByInterest(MyVector<ScenicArea>& areas, User& user, int topK);

// 按名称/类别/关键字查询景区
MyVector<ScenicArea> searchAreas(MyVector<ScenicArea>& areas, std::string keyword, std::string category);

// 按名称/类别/关键字查询建筑物
MyVector<Building> searchBuildings(MyVector<Building>& buildings, std::string keyword);
