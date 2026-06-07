#pragma once

#include <string>
#include <vector>

namespace tripsystem {

struct Spot {
    int id = 0;
    std::string name;
    std::string category;
    double rating = 0;
    int heat = 0;
    std::string tags;
};

struct Road {
    int from = 0;
    int to = 0;
    double distWalk = 0;
    double distBike = 0;
};

struct OsmNode {
    int id = 0;
    std::string name;
    double lat = 0;
    double lon = 0;
    std::string type;
    int spotId = 0;
    std::string description;
    std::string image;
};

struct OsmEdge {
    int from = 0;
    int to = 0;
    double distance = 0;
    std::string mode;
    std::string roadName;
};

struct IndoorNode {
    std::string id;
    std::string name;
    std::string floor;
    std::string role;
    double x = 0;
    double y = 0;
};

struct IndoorEdge {
    std::string from;
    std::string to;
    double distance = 0;
};

struct IndoorFloorPlan {
    std::string floor;
    std::string image;
};

struct IndoorBuilding {
    std::string id;
    std::string name;
    int floorCount = 0;
    std::vector<IndoorFloorPlan> floorPlans;
    std::vector<IndoorNode> nodes;
    std::vector<IndoorEdge> edges;
};

struct Restaurant {
    int id = 0;
    std::string name;
    int nearSpotId = 0;
    std::string cuisine;
    double rating = 0;
    int heat = 0;
    std::string image;

    Restaurant() = default;
    Restaurant(int id_, const std::string& name_, int nearSpotId_, const std::string& cuisine_, double rating_, int heat_, const std::string& image_ = "")
        : id(id_), name(name_), nearSpotId(nearSpotId_), cuisine(cuisine_), rating(rating_), heat(heat_), image(image_) {}
};

struct User {
    int id = 0;
    std::string name;
    std::vector<std::string> preferenceTags;
    std::vector<std::string> preferredCategories;
    std::string routeMode = "walk";
    std::vector<int> historySpotIds;
};

struct Diary {
    int id = 0;
    std::string title;
    int userId = 1;
    double rating = 0;
    int heat = 0;
    std::string createdAt;
    std::string content;
    bool decodeOk = true;
    std::string loadMessage;
    std::string image;

    Diary() = default;
    Diary(int id_, const std::string& title_, int userId_, double rating_, int heat_, const std::string& createdAt_, const std::string& content_, bool decodeOk_ = true, const std::string& loadMessage_ = "", const std::string& image_ = "")
        : id(id_), title(title_), userId(userId_), rating(rating_), heat(heat_), createdAt(createdAt_), content(content_), decodeOk(decodeOk_), loadMessage(loadMessage_), image(image_) {}
};

} // namespace tripsystem
