#pragma once
#include "../models/models.h"
#include "../core/graph.h"

// 场所查询模块

// 查找附近设施（基于图距离，不是直线距离）
MyVector<Facility> findNearbyFacilities(Graph& graph, MyVector<Facility>& facilities, int currentNodeId, double range);

// 按类别过滤设施
MyVector<Facility> filterByCategory(MyVector<Facility>& facilities, std::string category);

// 按类别名称查找设施并按距离排序
MyVector<Facility> searchFacilities(MyVector<Facility>& facilities, std::string categoryName, int currentNodeId, Graph& graph);
