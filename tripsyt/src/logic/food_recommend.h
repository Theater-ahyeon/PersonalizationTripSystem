#pragma once
#include "../models/models.h"

// 美食推荐模块

// 按热度推荐美食（partialSort）
MyVector<Food> recommendByHeat(MyVector<Food>& foods, int topK);

// 按评分推荐美食
MyVector<Food> recommendByRating(MyVector<Food>& foods, int topK);

// 按距离推荐美食
MyVector<Food> recommendByDistance(MyVector<Food>& foods, int topK);

// 按菜系过滤
MyVector<Food> filterByCuisine(MyVector<Food>& foods, std::string cuisine);

// 模糊查找美食
MyVector<Food> fuzzySearchFood(MyVector<Food>& foods, std::string keyword);
