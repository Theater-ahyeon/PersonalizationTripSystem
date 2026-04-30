#pragma once

#include <string>

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
};

struct OsmEdge {
    int from = 0;
    int to = 0;
    double distance = 0;
    std::string mode;
    std::string roadName;
};

struct Restaurant {
    int id = 0;
    std::string name;
    int nearSpotId = 0;
    std::string cuisine;
    double rating = 0;
    int heat = 0;
};

struct Diary {
    int id = 0;
    std::string title;
    double rating = 0;
    int heat = 0;
    std::string createdAt;
    std::string content;
};

} // namespace tripsystem
