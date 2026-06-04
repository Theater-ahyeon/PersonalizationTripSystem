#pragma once
#include <string>
#include "../core/my_vector.h"
#include "../core/my_hashmap.h"

// 道路类型定义在 core/graph.h 中: WALK, BICYCLE, SHUTTLE_BUS

// 坐标
struct Coordinate {
    double x; // 经度
    double y; // 纬度
};

// 景区/校园
struct ScenicArea {
    int id;
    std::string name;
    std::string category; // 景区/校园
    std::string description;
    double heat;        // 热度
    double rating;      // 评分 1-5
    MyVector<std::string> tags; // 标签/关键字
    Coordinate coord;
};

// 建筑物（景点、教学楼等）
struct Building {
    int id;
    int areaId;         // 所属景区ID
    std::string name;
    std::string type;   // 景点/教学楼/办公楼/宿舍楼
    std::string description;
    double heat;
    double rating;
    MyVector<std::string> tags;
    Coordinate coord;
    int graphNodeId;     // 在道路图中的节点ID
};

// 服务设施
struct Facility {
    int id;
    int areaId;
    std::string name;
    std::string category; // 商店/饭店/洗手间/图书馆/食堂/超市/咖啡馆等
    Coordinate coord;
    int graphNodeId;
};

// 美食
struct Food {
    int id;
    int areaId;
    std::string name;
    std::string cuisine;   // 菜系
    std::string restaurant; // 饭店或窗口名称
    double heat;
    double rating;
    double distance;       // 距离（动态计算）
    Coordinate coord;
    int graphNodeId;
};

// 用户
struct User {
    int id;
    std::string username;
    std::string password;
    MyVector<std::string> interests; // 兴趣标签
};

// 旅游日记
struct TravelDiary {
    int id;
    int userId;
    std::string title;
    std::string content;
    std::string destination; // 旅游目的地
    MyVector<std::string> imagePaths;
    MyVector<std::string> videoPaths;
    double heat;      // 浏览量
    double rating;    // 评分
    std::string createTime;
    bool compressed;  // 是否压缩存储
};

// 室内导航节点
struct IndoorNode {
    int id;
    int buildingId;
    int floor;
    std::string name;  // 大门/电梯/房间号
    std::string type;  // gate/elevator/room
    double x, y;       // 室内坐标
};

// 室内导航边
struct IndoorEdge {
    int from;
    int to;
    double distance;
};
