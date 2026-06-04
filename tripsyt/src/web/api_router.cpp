// API路由实现 - 所有HTTP API端点的处理逻辑

#include "web/api_router.h"
#include "httplib.h"

// ==================== 旅游推荐 API ====================

// GET /api/areas - 获取所有景区列表
static void handleGetAreas(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    // httplib已经解析了查询参数
    std::string sort = req.has_param("sort") ? req.get_param_value("sort") : "heat";
    int topK = req.has_param("topK") ? std::atoi(req.get_param_value("topK").c_str()) : 50;
    std::string keyword = req.has_param("keyword") ? req.get_param_value("keyword") : "";
    std::string category = req.has_param("category") ? req.get_param_value("category") : "";

    auto areas = sys.getAreas(sort, topK, keyword, category);
    res.set_content(jsonSuccess(vectorToJson(areas, areaToJson)), "application/json");
}

// GET /api/buildings - 获取景区内建筑物
static void handleGetBuildings(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    int areaId = req.has_param("areaId") ? std::atoi(req.get_param_value("areaId").c_str()) : 0;
    if (areaId == 0) {
        res.set_content(jsonError(400, "缺少areaId参数"), "application/json");
        return;
    }
    auto buildings = sys.getBuildingsByArea(areaId);
    res.set_content(jsonSuccess(vectorToJson(buildings, buildingToJson)), "application/json");
}

// GET /api/recommend - 推荐景区
static void handleRecommend(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    std::string sort = req.has_param("sort") ? req.get_param_value("sort") : "heat";
    int topK = req.has_param("topK") ? std::atoi(req.get_param_value("topK").c_str()) : 10;
    auto areas = sys.recommendAreas(sort, topK);
    res.set_content(jsonSuccess(vectorToJson(areas, areaToJson)), "application/json");
}

// ==================== 路线规划 API ====================

// POST /api/route/shortest - 最短距离路径
static void handleRouteShortest(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    int start = jsonGetInt(body, "start");
    int end = jsonGetInt(body, "end");
    int areaId = jsonGetInt(body, "areaId");

    if (areaId == 0 || start == 0 || end == 0) {
        res.set_content(jsonError(400, "参数不完整"), "application/json");
        return;
    }

    auto result = sys.shortestPath(areaId, start, end);
    res.set_content(jsonSuccess(pathResultToJson(result)), "application/json");
}

// POST /api/route/fastest - 最短时间路径
static void handleRouteFastest(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    int start = jsonGetInt(body, "start");
    int end = jsonGetInt(body, "end");
    int areaId = jsonGetInt(body, "areaId");

    if (areaId == 0 || start == 0 || end == 0) {
        res.set_content(jsonError(400, "参数不完整"), "application/json");
        return;
    }

    auto result = sys.fastestPath(areaId, start, end);
    res.set_content(jsonSuccess(pathResultToJson(result)), "application/json");
}

// POST /api/route/multipoint - 途经多点路径
static void handleRouteMultipoint(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    int start = jsonGetInt(body, "start");
    int areaId = jsonGetInt(body, "areaId");
    auto waypoints = jsonGetIntArray(body, "waypoints");

    if (areaId == 0 || start == 0 || waypoints.empty()) {
        res.set_content(jsonError(400, "参数不完整"), "application/json");
        return;
    }

    auto result = sys.multipointPath(areaId, start, waypoints);
    res.set_content(jsonSuccess(pathResultToJson(result)), "application/json");
}

// POST /api/route/transport - 指定交通工具路径
static void handleRouteTransport(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    int start = jsonGetInt(body, "start");
    int end = jsonGetInt(body, "end");
    int transport = jsonGetInt(body, "transport");
    int areaId = jsonGetInt(body, "areaId");

    if (areaId == 0 || start == 0 || end == 0 || transport == 0) {
        res.set_content(jsonError(400, "参数不完整"), "application/json");
        return;
    }

    auto result = sys.transportPath(areaId, start, end, transport);
    res.set_content(jsonSuccess(pathResultToJson(result)), "application/json");
}

// POST /api/route/indoor - 室内导航
static void handleRouteIndoor(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    int buildingId = jsonGetInt(body, "buildingId");
    int start = jsonGetInt(body, "start");
    int end = jsonGetInt(body, "end");

    if (buildingId == 0 || start == 0 || end == 0) {
        res.set_content(jsonError(400, "参数不完整"), "application/json");
        return;
    }

    auto result = sys.indoorNavigation(buildingId, start, end);
    res.set_content(jsonSuccess(indoorPathResultToJson(result)), "application/json");
}

// ==================== 场所查询 API ====================

// GET /api/facilities - 查找附近设施
static void handleGetFacilities(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    int areaId = req.has_param("areaId") ? std::atoi(req.get_param_value("areaId").c_str()) : 0;
    int nodeId = req.has_param("nodeId") ? std::atoi(req.get_param_value("nodeId").c_str()) : 0;
    double range = req.has_param("range") ? std::atof(req.get_param_value("range").c_str()) : 1000.0;
    std::string category = req.has_param("category") ? req.get_param_value("category") : "";

    if (areaId == 0) {
        res.set_content(jsonError(400, "缺少areaId参数"), "application/json");
        return;
    }

    auto facilities = sys.findNearbyFacilities(areaId, nodeId, range, category);
    res.set_content(jsonSuccess(vectorToJson(facilities, facilityToJson)), "application/json");
}

// ==================== 旅游日记 API ====================

// GET /api/diaries - 获取所有日记
static void handleGetDiaries(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    std::string sort = req.has_param("sort") ? req.get_param_value("sort") : "heat";
    int topK = req.has_param("topK") ? std::atoi(req.get_param_value("topK").c_str()) : 50;
    auto diaries = sys.getDiaries(sort, topK);
    res.set_content(jsonSuccess(vectorToJson(diaries, diaryToJson)), "application/json");
}

// POST /api/diaries - 创建日记
static void handleCreateDiary(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    Diary d;
    d.userId = jsonGetInt(body, "userId");
    d.title = jsonGetString(body, "title");
    d.content = jsonGetString(body, "content");
    d.destination = jsonGetString(body, "destination");
    d.createTime = "2026-06-04";

    if (d.title.empty()) {
        res.set_content(jsonError(400, "标题不能为空"), "application/json");
        return;
    }

    sys.addDiary(d);
    // 获取最后添加的日记
    auto allDiaries = sys.getAllDiaries();
    if (!allDiaries.empty()) {
        res.set_content(jsonSuccess(diaryToJson(allDiaries.back())), "application/json");
    } else {
        res.set_content(jsonError(500, "创建失败"), "application/json");
    }
}

// ==================== 日记交流 API ====================

// GET /api/diaries/search - 搜索日记
static void handleSearchDiaries(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    std::string destination = req.has_param("destination") ? req.get_param_value("destination") : "";
    std::string title = req.has_param("title") ? req.get_param_value("title") : "";
    std::string keyword = req.has_param("keyword") ? req.get_param_value("keyword") : "";

    MyVector<Diary> result;
    if (!destination.empty()) {
        result = sys.searchDiaryByDestination(destination);
    } else if (!title.empty()) {
        result = sys.searchDiaryByTitle(title);
    } else if (!keyword.empty()) {
        result = sys.searchDiaryByKeyword(keyword);
    } else {
        result = sys.getAllDiaries();
    }

    res.set_content(jsonSuccess(vectorToJson(result, diaryToJson)), "application/json");
}

// ==================== 美食推荐 API ====================

// GET /api/foods - 获取美食列表
static void handleGetFoods(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    int areaId = req.has_param("areaId") ? std::atoi(req.get_param_value("areaId").c_str()) : 0;
    std::string sort = req.has_param("sort") ? req.get_param_value("sort") : "heat";
    int topK = req.has_param("topK") ? std::atoi(req.get_param_value("topK").c_str()) : 10;
    std::string cuisine = req.has_param("cuisine") ? req.get_param_value("cuisine") : "";
    std::string keyword = req.has_param("keyword") ? req.get_param_value("keyword") : "";

    if (areaId == 0) {
        res.set_content(jsonError(400, "缺少areaId参数"), "application/json");
        return;
    }

    // 如果有keyword，使用模糊查找
    if (!keyword.empty()) {
        auto foods = sys.fuzzySearchFood(areaId, keyword);
        // 排序
        if (sort == "heat") {
            topKSort(foods, topK, [](const Food& a, const Food& b) { return a.heat > b.heat; });
        } else if (sort == "rating") {
            topKSort(foods, topK, [](const Food& a, const Food& b) { return a.rating > b.rating; });
        } else if (sort == "distance") {
            topKSort(foods, topK, [](const Food& a, const Food& b) { return a.distance < b.distance; });
        }
        res.set_content(jsonSuccess(vectorToJson(foods, foodToJson)), "application/json");
        return;
    }

    auto foods = sys.getFoods(areaId, sort, topK, cuisine, keyword);
    res.set_content(jsonSuccess(vectorToJson(foods, foodToJson)), "application/json");
}

// ==================== 用户 API ====================

// POST /api/users/login - 登录
static void handleLogin(const httplib::Request& req, httplib::Response& res, TourismSystem& sys) {
    const std::string& body = req.body;
    std::string username = jsonGetString(body, "username");
    std::string password = jsonGetString(body, "password");

    if (username.empty() || password.empty()) {
        res.set_content(jsonError(400, "用户名和密码不能为空"), "application/json");
        return;
    }

    auto* user = sys.login(username, password);
    if (user) {
        res.set_content(jsonSuccess(userToJson(*user)), "application/json");
    } else {
        res.set_content(jsonError(401, "用户名或密码错误"), "application/json");
    }
}

// ==================== 路由注册 ====================

void registerApiRoutes(httplib::Server& svr, TourismSystem& sys) {
    // 设置CORS预检请求处理
    svr.Options("/api/.*", [](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });

    // CORS中间件 - 所有API响应添加CORS头
    svr.set_post_routing_handler([](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
    });

    // ---- 旅游推荐 API ----
    svr.Get("/api/areas", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleGetAreas(req, res, sys);
    });

    svr.Get(R"(/api/areas/(\d+))", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        auto* area = sys.getArea(id);
        if (area) {
            res.set_content(jsonSuccess(areaToJson(*area)), "application/json");
        } else {
            res.set_content(jsonError(404, "景区不存在"), "application/json");
        }
    });

    svr.Get("/api/buildings", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleGetBuildings(req, res, sys);
    });

    svr.Get("/api/recommend", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleRecommend(req, res, sys);
    });

    // GET /api/areas/:id/graph - 获取景区图数据
    svr.Get(R"(/api/areas/(\d+)/graph)", [&sys](const httplib::Request& req, httplib::Response& res) {
        int areaId = std::atoi(req.matches[1].str().c_str());
        auto* area = sys.getArea(areaId);
        if (!area) {
            res.set_content(jsonError(404, "景区不存在"), "application/json");
            return;
        }

        auto nodes = sys.getAreaGraphNodes(areaId);
        auto edges = sys.getAreaGraphEdges(areaId);
        auto buildings = sys.getBuildingsByArea(areaId);

        JsonBuilder j;
        j.startObject();

        // 节点数组
        j.key("nodes").startArray();
        for (size_t i = 0; i < nodes.size(); i++) {
            j.raw(
                (JsonBuilder()
                    .startObject()
                    .key("id").value(nodes[i].id)
                    .key("name").value(nodes[i].name)
                    .key("type").value(nodes[i].type)
                    .key("x").value(nodes[i].x)
                    .key("y").value(nodes[i].y)
                    .endObject()
                ).toString()
            );
        }
        j.endArray();

        // 边数组
        j.key("edges").startArray();
        for (size_t i = 0; i < edges.size(); i++) {
            std::string transport = "walk";
            if (edges[i].transportType & 2) transport = "bike";
            if (edges[i].transportType & 4) transport = "shuttle";

            j.raw(
                (JsonBuilder()
                    .startObject()
                    .key("from").value(edges[i].from)
                    .key("to").value(edges[i].to)
                    .key("distance").value(edges[i].distance)
                    .key("transport").value(transport)
                    .key("congestion").value(edges[i].congestion)
                    .endObject()
                ).toString()
            );
        }
        j.endArray();

        // 建筑物数组
        j.key("buildings").startArray();
        for (size_t i = 0; i < buildings.size(); i++) {
            j.raw(buildingToJson(buildings[i]));
        }
        j.endArray();

        j.endObject();

        res.set_content(jsonSuccess(j.toString()), "application/json");
    });

    // ---- 路线规划 API ----
    svr.Post("/api/route/shortest", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleRouteShortest(req, res, sys);
    });

    svr.Post("/api/route/fastest", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleRouteFastest(req, res, sys);
    });

    svr.Post("/api/route/multipoint", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleRouteMultipoint(req, res, sys);
    });

    svr.Post("/api/route/transport", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleRouteTransport(req, res, sys);
    });

    svr.Post("/api/route/indoor", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleRouteIndoor(req, res, sys);
    });

    // ---- 场所查询 API ----
    svr.Get("/api/facilities", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleGetFacilities(req, res, sys);
    });

    // ---- 旅游日记 API ----
    svr.Get("/api/diaries", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleGetDiaries(req, res, sys);
    });

    svr.Post("/api/diaries", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleCreateDiary(req, res, sys);
    });

    svr.Get(R"(/api/diaries/(\d+))", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        auto* diary = sys.getDiary(id);
        if (diary) {
            res.set_content(jsonSuccess(diaryToJson(*diary)), "application/json");
        } else {
            res.set_content(jsonError(404, "日记不存在"), "application/json");
        }
    });

    svr.Post(R"(/api/diaries/(\d+)/rate)", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        double score = jsonGetDouble(req.body, "score", 0);
        if (score < 0 || score > 5) {
            res.set_content(jsonError(400, "评分应在0-5之间"), "application/json");
            return;
        }
        sys.rateDiary(id, score);
        auto* diary = sys.getDiary(id);
        if (diary) {
            res.set_content(jsonSuccess(diaryToJson(*diary)), "application/json");
        } else {
            res.set_content(jsonError(404, "日记不存在"), "application/json");
        }
    });

    svr.Post(R"(/api/diaries/(\d+)/view)", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        sys.viewDiary(id);
        auto* diary = sys.getDiary(id);
        if (diary) {
            res.set_content(jsonSuccess(diaryToJson(*diary)), "application/json");
        } else {
            res.set_content(jsonError(404, "日记不存在"), "application/json");
        }
    });

    // ---- 日记交流 API ----
    svr.Get("/api/diaries/search", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleSearchDiaries(req, res, sys);
    });

    // GET /api/diaries/prefix - Trie前缀搜索日记
    svr.Get("/api/diaries/prefix", [&sys](const httplib::Request& req, httplib::Response& res) {
        std::string prefix = req.has_param("prefix") ? req.get_param_value("prefix") : "";
        if (prefix.empty()) {
            res.set_content(jsonError(400, "缺少prefix参数"), "application/json");
            return;
        }
        auto result = sys.searchDiaryByPrefix(prefix);
        res.set_content(jsonSuccess(vectorToJson(result, diaryToJson)), "application/json");
    });

    svr.Post(R"(/api/diaries/(\d+)/compress)", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        auto* diary = sys.getDiary(id);
        if (!diary) {
            res.set_content(jsonError(404, "日记不存在"), "application/json");
            return;
        }
        size_t originalSize = diary->content.size();
        sys.compressDiary(id);
        diary = sys.getDiary(id);
        if (diary) {
            JsonBuilder j;
            j.startObject();
            j.key("id").value(diary->id);
            j.key("compressed").value(diary->compressed);
            j.key("originalSize").value((int)originalSize);
            j.key("compressedSize").value((int)diary->compressedData.size());
            double ratio = originalSize > 0 ? (double)diary->compressedData.size() / originalSize * 100 : 0;
            j.key("compressionRatio").value(ratio);
            j.endObject();
            res.set_content(jsonSuccess(j.toString()), "application/json");
        } else {
            res.set_content(jsonError(500, "压缩失败"), "application/json");
        }
    });

    svr.Post(R"(/api/diaries/(\d+)/decompress)", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        sys.decompressDiary(id);
        auto* diary = sys.getDiary(id);
        if (diary) {
            res.set_content(jsonSuccess(diaryToJson(*diary)), "application/json");
        } else {
            res.set_content(jsonError(404, "日记不存在"), "application/json");
        }
    });

    // ---- 美食推荐 API ----
    svr.Get("/api/foods", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleGetFoods(req, res, sys);
    });

    // ---- 用户 API ----
    svr.Post("/api/users/login", [&sys](const httplib::Request& req, httplib::Response& res) {
        handleLogin(req, res, sys);
    });

    svr.Get(R"(/api/users/(\d+))", [&sys](const httplib::Request& req, httplib::Response& res) {
        int id = std::atoi(req.matches[1].str().c_str());
        auto* user = sys.getUser(id);
        if (user) {
            res.set_content(jsonSuccess(userToJson(*user)), "application/json");
        } else {
            res.set_content(jsonError(404, "用户不存在"), "application/json");
        }
    });
}
