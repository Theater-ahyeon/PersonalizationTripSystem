// 个性化旅游系统 - 主程序
// 初始化数据、启动HTTP服务器、注册API路由

#include "core/tourism_system.h"
#include "web/api_router.h"
#include "httplib.h"

#include <iostream>
#include <cstdlib>
#include <ctime>
#include <string>

// ==================== 简单随机数生成器（固定种子保证可重复） ====================
static unsigned int seed_ = 42;

static int randInt(int min, int max) {
    seed_ = seed_ * 1103515245 + 12345;
    return min + (seed_ >> 16) % (max - min + 1);
}

static double randDouble(double min, double max) {
    return min + (double)randInt(0, 10000) / 10000.0 * (max - min);
}

// ==================== 数据名称池 ====================
static const char* SCENIC_NAMES[] = {
    "西湖风景区", "故宫博物院", "长城景区", "黄山风景区", "九寨沟风景区",
    "张家界国家森林公园", "峨眉山风景区", "泰山风景区", "武夷山风景区", "庐山风景区",
    "颐和园", "天坛公园", "圆明园遗址公园", "北海公园", "香山公园",
    "拙政园", "留园", "虎丘山风景区", "周庄古镇", "同里古镇",
    "鼓浪屿风景区", "武夷山自然保护区", "三清山风景区", "龙虎山风景区", "井冈山风景区",
    "漓江风景区", "阳朔西街景区", "龙脊梯田景区", "德天瀑布景区", "北海银滩景区",
    "丽江古城", "大理古城", "玉龙雪山景区", "泸沽湖景区", "香格里拉景区",
    "布达拉宫", "纳木错景区", "珠穆朗玛峰大本营", "雅鲁藏布大峡谷", "羊卓雍错景区",
    "敦煌莫高窟", "鸣沙山月牙泉", "嘉峪关景区", "麦积山石窟", "崆峒山景区",
    "秦始皇兵马俑", "华山风景区", "华清宫景区", "大雁塔景区", "法门寺景区",
    "黄鹤楼景区", "武当山风景区", "三峡大坝景区", "神农架景区", "东湖风景区",
    "岳麓山风景区", "凤凰古城", "衡山风景区", "张家界天门山", "橘子洲景区",
    "庐山含鄱口", "三清山南清园", "婺源江湾景区", "景德镇古窑", "龙虎山天师府",
    "千岛湖景区", "雁荡山风景区", "普陀山风景区", "天台山景区", "楠溪江景区",
    "鼓山风景区", "武夷山九曲溪", "永定土楼景区", "清源山景区", "太姥山景区",
    "白云山风景区", "丹霞山景区", "鼎湖山景区", "西樵山景区", "罗浮山景区",
    "青城山景区", "都江堰景区", "乐山大佛景区", "稻城亚丁景区", "四姑娘山景区",
    "梵净山景区", "荔波小七孔景区", "黄果树瀑布景区", "织金洞景区", "赤水丹霞景区",
    "天山天池景区", "喀纳斯景区", "那拉提草原景区", "赛里木湖景区", "吐鲁番葡萄沟",
    "青海湖景区", "塔尔寺景区", "茶卡盐湖景区", "祁连山草原景区", "可可西里保护区",
    "呼伦贝尔草原", "额济纳胡杨林", "响沙湾景区", "阿尔山景区", "满洲里国门景区",
    "长白山景区", "净月潭景区", "松花湖景区", "伪满皇宫博物院", "六鼎山景区",
    "太阳岛景区", "镜泊湖景区", "五大连池景区", "冰雪大世界", "北极村景区",
    "云台山景区", "少林寺景区", "龙门石窟景区", "清明上河园景区", "殷墟博物苑",
    "衡山南岳大庙", "岳阳楼景区", "张家界大峡谷", "韶山景区", "崀山景区",
    "西递宏村景区", "天柱山景区", "天堂寨景区", "八里河景区", "三河古镇",
    "蜈支洲岛景区", "南山文化旅游区", "天涯海角景区", "呀诺达雨林景区", "分界洲岛景区",
    "织金洞景区", "赤水大瀑布景区", "百里杜鹃景区", "万峰林景区", "马岭河峡谷",
    "沙坡头景区", "镇北堡西部影城", "水洞沟景区", "贺兰山岩画景区", "西夏王陵景区"
};

static const char* CAMPUS_NAMES[] = {
    "北京大学校园", "清华大学校园", "复旦大学校园", "上海交通大学校园", "浙江大学校园",
    "南京大学校园", "武汉大学校园", "华中科技大学校园", "中山大学校园", "四川大学校园",
    "哈尔滨工业大学校园", "西安交通大学校园", "同济大学校园", "东南大学校园", "天津大学校园",
    "南开大学校园", "厦门大学校园", "山东大学校园", "吉林大学校园", "大连理工大学校园",
    "中南大学校园", "湖南大学校园", "重庆大学校园", "电子科技大学校园", "西北工业大学校园",
    "华东师范大学校园", "北京师范大学校园", "中国人民大学校园", "北京航空航天大学校园", "北京理工大学校园",
    "华南理工大学校园", "中国海洋大学校园", "兰州大学校园", "东北大学校园", "西南大学校园",
    "郑州大学校园", "南昌大学校园", "云南大学校园", "贵州大学校园", "广西大学校园",
    "海南大学校园", "内蒙古大学校园", "新疆大学校园", "西藏大学校园", "宁夏大学校园",
    "青海大学校园", "石河子大学校园", "延边大学校园", "中央民族大学校园", "中国农业大学校园",
    "中国政法大学校园", "中央财经大学校园", "上海财经大学校园", "对外经济贸易大学校园", "西南财经大学校园",
    "中南财经政法大学校园", "北京邮电大学校园", "西安电子科技大学校园", "南京航空航天大学校园", "南京理工大学校园",
    "哈尔滨工程大学校园", "武汉理工大学校园", "合肥工业大学校园", "北京科技大学校园", "北京交通大学校园",
    "华东理工大学校园", "中国矿业大学校园", "中国地质大学校园", "中国石油大学校园", "河海大学校园",
    "江南大学校园", "东华大学校园", "苏州大学校园", "南京师范大学校园", "湖南师范大学校园",
    "华南师范大学校园", "陕西师范大学校园", "东北师范大学校园", "首都师范大学校园", "福建师范大学校园",
    "浙江师范大学校园", "安徽师范大学校园", "江西师范大学校园", "河南师范大学校园", "河北师范大学校园",
    "山东师范大学校园", "山西师范大学校园", "辽宁师范大学校园", "吉林师范大学校园", "黑龙江大学校园",
    "扬州大学校园", "南通大学校园", "江苏大学校园", "温州大学校园", "宁波大学校园",
    "深圳大学校园", "广州大学校园", "汕头大学校园", "成都理工大学校园", "西南石油大学校园",
    "昆明理工大学校园", "桂林电子科技大学校园", "贵州师范大学校园", "西藏民族大学校园", "北方民族大学校园"
};

static const char* BUILDING_TYPES[] = {
    "景点", "教学楼", "办公楼", "宿舍楼", "博物馆", "图书馆", "体育馆", "食堂", "实验楼", "行政楼"
};

static const char* SCENIC_BUILDING_NAMES[] = {
    "主入口", "观景台", "休息亭", "游客中心", "纪念亭", "古塔", "古桥", "瀑布观景台",
    "山顶亭", "湖心亭", "花园区", "竹林小径", "古建筑群", "文化展馆", "生态园",
    "观鸟台", "日出观景台", "日落观景台", "古寺庙", "名人故居", "碑林", "石刻园",
    "水榭", "长廊", "牌坊", "钟楼", "鼓楼", "戏台", "祠堂", "书院"
};

static const char* CAMPUS_BUILDING_NAMES[] = {
    "主校门", "第一教学楼", "第二教学楼", "第三教学楼", "图书馆", "行政楼", "学生活动中心",
    "实验楼A", "实验楼B", "计算机中心", "体育馆", "游泳馆", "第一食堂", "第二食堂",
    "第三食堂", "1号宿舍楼", "2号宿舍楼", "3号宿舍楼", "4号宿舍楼", "5号宿舍楼",
    "6号宿舍楼", "7号宿舍楼", "8号宿舍楼", "9号宿舍楼", "10号宿舍楼", "校医院",
    "超市", "快递中心", "创业中心", "国际交流中心"
};

static const char* FACILITY_CATEGORIES[] = {
    "商店", "饭店", "洗手间", "图书馆", "食堂", "超市", "咖啡馆", "医务室", "银行ATM", "停车场",
    "充电站", "行李寄存", "导览服务", "母婴室", "无障碍设施"
};

static const char* FACILITY_NAME_TEMPLATES[] = {
    "便利店", "纪念品店", "特产商店", "小卖部", "快餐店", "中餐厅", "西餐厅",
    "火锅店", "小吃街", "公共洗手间", "阅览室", "主食堂", "风味食堂",
    "生活超市", "星巴克", "瑞幸咖啡", "茶馆", "医务站", "ATM取款机",
    "地下停车场", "充电桩", "寄存处", "游客服务中心", "母婴休息室"
};

static const char* CUISINES[] = {
    "川菜", "粤菜", "湘菜", "鲁菜", "苏菜", "浙菜", "闽菜", "徽菜",
    "东北菜", "西北菜", "云南菜", "贵州菜", "广西菜", "海南菜", "新疆菜",
    "日料", "韩餐", "西餐", "东南亚菜", "快餐"
};

static const char* FOOD_NAMES[] = {
    "宫保鸡丁", "麻婆豆腐", "回锅肉", "水煮鱼", "鱼香肉丝",
    "红烧肉", "糖醋排骨", "北京烤鸭", "小笼包", "兰州拉面",
    "重庆火锅", "酸辣粉", "螺蛳粉", "肉夹馍", "凉皮",
    "过桥米线", "烤全羊", "大盘鸡", "海南鸡饭", "叉烧饭",
    "东坡肉", "叫花鸡", "佛跳墙", "剁椒鱼头", "臭豆腐",
    "煎饼果子", "生煎包", "蟹黄汤包", "羊肉泡馍", "手抓饭",
    "烤鱼", "酸菜鱼", "毛血旺", "辣子鸡", "口水鸡",
    "白切鸡", "烧鹅", "肠粉", "虾饺", "云吞面",
    "担担面", "热干面", "炸酱面", "刀削面", "烩面",
    "烤串", "烤鱿鱼", "烤生蚝", "烤冷面", "铁板烧"
};

static const char* PROVINCES[] = {
    "北京", "上海", "浙江", "江苏", "广东", "四川", "湖北", "湖南", "山东", "河南",
    "福建", "安徽", "江西", "云南", "贵州", "广西", "海南", "西藏", "新疆", "甘肃",
    "陕西", "山西", "河北", "辽宁", "吉林", "黑龙江", "内蒙古", "宁夏", "青海", "重庆"
};

static const char* DIARY_TITLES[] = {
    "一次难忘的旅行", "美丽的风景", "春日游记", "夏日避暑之旅", "秋日红叶行",
    "冬日温泉之旅", "古镇漫步", "山水之间", "海岛度假记", "草原骑行记",
    "文化之旅", "美食探店记", "亲子游攻略", "背包客日记", "周末短途游",
    "毕业旅行记", "蜜月旅行", "独自旅行", "自驾游日记", "徒步穿越记",
    "日出日落", "星空下的露营", "古镇夜游", "博物馆之旅", "寺庙祈福记",
    "湖光山色", "雪山之行", "沙漠探险", "森林徒步", "海钓日记",
    "骑行日记", "摄影之旅", "写生之旅", "采风之旅", "研学旅行",
    "红色之旅", "工业旅游", "乡村体验", "民俗文化节", "非遗探访"
};

static const char* DIARY_CONTENTS[] = {
    "今天天气晴朗，我们一大早就出发了。沿途的风景美不胜收，让人流连忘返。",
    "这座古城保存完好，走在石板路上仿佛穿越回了古代。每一条巷子都有故事。",
    "登上山顶的那一刻，所有的疲惫都烟消云散了。远处的云海翻涌，美得令人窒息。",
    "当地的美食让人回味无穷，特别是那道特色菜，鲜美无比，值得专程前来品尝。",
    "在这里度过了愉快的一天，孩子们玩得很开心，下次一定还会再来。",
    "清晨的阳光洒在湖面上，波光粼粼，如同一面巨大的镜子映照着蓝天白云。",
    "夜晚的古镇灯火通明，沿河的灯笼映照在水面上，别有一番韵味。",
    "这次旅行让我收获颇丰，不仅领略了壮丽的自然风光，还深入了解了当地的文化。",
    "沿着山路蜿蜒而上，两旁的树木郁郁葱葱，空气中弥漫着花草的清香。",
    "站在海边，听着浪花拍打礁石的声音，感受着海风拂面的清爽，心旷神怡。"
};

// ==================== 数据初始化 ====================
void initData(TourismSystem& sys) {
    std::cout << "正在初始化数据..." << std::endl;

    // ---- 1. 创建用户 ----
    const char* usernames[] = {
        "traveler01", "explorer02", "tourist03", "wanderer04", "adventurer05",
        "sightseer06", "backpacker07", "nomad08", "voyager09", "roamer10"
    };
    const char* nicknames[] = {
        "旅行达人", "探索者", "游客小王", "漫步者", "冒险家",
        "观光客", "背包客", "游牧人", "航海家", "漫游者"
    };

    for (int i = 0; i < 10; i++) {
        User u;
        u.id = i + 1;
        u.username = usernames[i];
        u.password = "123456";
        u.nickname = nicknames[i];
        u.avatar = "/avatars/" + std::to_string(i + 1) + ".png";
        sys.addUser(u);
    }
    std::cout << "  用户: 10" << std::endl;

    // ---- 2. 创建景区和校园 (200个) ----
    int areaId = 1;
    // 100个景区
    for (int i = 0; i < 100 && i < (int)(sizeof(SCENIC_NAMES) / sizeof(SCENIC_NAMES[0])); i++) {
        Area a;
        a.id = areaId++;
        a.name = SCENIC_NAMES[i];
        a.category = "景区";
        a.heat = randDouble(100, 10000);
        a.rating = randDouble(3.0, 5.0);
        a.description = a.name + "是一处著名的旅游胜地，拥有独特的自然风光和人文景观。";
        a.province = PROVINCES[i % 30];
        sys.addArea(a);
    }
    // 100个校园
    for (int i = 0; i < 100 && i < (int)(sizeof(CAMPUS_NAMES) / sizeof(CAMPUS_NAMES[0])); i++) {
        Area a;
        a.id = areaId++;
        a.name = CAMPUS_NAMES[i];
        a.category = "校园";
        a.heat = randDouble(50, 5000);
        a.rating = randDouble(3.5, 5.0);
        a.description = a.name + "环境优美，学术氛围浓厚，是参观游览的好去处。";
        a.province = PROVINCES[i % 30];
        sys.addArea(a);
    }
    std::cout << "  景区/校园: " << (areaId - 1) << std::endl;

    // ---- 3. 为每个景区创建建筑物、设施、图节点、道路、美食 ----
    int buildingId = 1;
    int facilityId = 1;
    int nodeId = 1;
    int foodId = 1;

    for (int aid = 1; aid < areaId; aid++) {
        auto* area = sys.getArea(aid);
        if (!area) continue;

        bool isCampus = (area->category == "校园");
        const char** bNames = isCampus ? CAMPUS_BUILDING_NAMES : SCENIC_BUILDING_NAMES;
        int bNameCount = isCampus ? (int)(sizeof(CAMPUS_BUILDING_NAMES) / sizeof(char*))
                                   : (int)(sizeof(SCENIC_BUILDING_NAMES) / sizeof(char*));

        // 创建图节点（先创建一个虚拟入口节点）
        GraphNode entrance;
        entrance.id = nodeId++;
        entrance.areaId = aid;
        entrance.name = isCampus ? "校门" : "景区入口";
        entrance.type = "entrance";
        entrance.x = 0;
        entrance.y = 0;
        sys.addGraphNode(entrance);

        int entranceNodeId = entrance.id;

        // 创建建筑物和对应图节点
        int numBuildings = 20 + randInt(0, 10); // 20-30个建筑物
        MyVector<int> areaNodeIds;
        areaNodeIds.push_back(entranceNodeId);

        for (int b = 0; b < numBuildings && b < bNameCount; b++) {
            // 建筑物
            Building bld;
            bld.id = buildingId++;
            bld.areaId = aid;
            bld.name = bNames[b];
            bld.type = BUILDING_TYPES[b % 10];
            bld.floors = 1 + randInt(0, 5);
            bld.description = bld.name + " - " + area->name;

            // 图节点
            GraphNode gn;
            gn.id = nodeId++;
            gn.areaId = aid;
            gn.name = bld.name;
            gn.type = "building";
            gn.x = randDouble(-500, 500);
            gn.y = randDouble(-500, 500);
            sys.addGraphNode(gn);

            bld.nodeId = gn.id;
            sys.addBuilding(bld);
            areaNodeIds.push_back(gn.id);

            // 仅为前3个多楼层建筑创建室内导航图（节省内存）
            if (bld.floors > 1 && b < 3) {
                int indoorNodeStart = nodeId;
                // 入口节点
                GraphNode indoorEntrance;
                indoorEntrance.id = nodeId++;
                indoorEntrance.areaId = aid;
                indoorEntrance.name = bld.name + "入口";
                indoorEntrance.type = "indoor";
                indoorEntrance.x = 0;
                indoorEntrance.y = 0;
                sys.addGraphNode(indoorEntrance);

                // 每层创建房间节点
                for (int fl = 1; fl <= bld.floors; fl++) {
                    for (int r = 0; r < 4; r++) {
                        Room room;
                        room.id = nodeId; // 使用全局唯一ID
                        room.buildingId = bld.id;
                        room.floor = fl;
                        room.name = std::to_string(fl) + "0" + std::to_string(r + 1) + "室";
                        room.nodeId = nodeId++;
                        sys.addRoom(room);

                        GraphNode rn;
                        rn.id = room.nodeId;
                        rn.areaId = aid;
                        rn.name = room.name;
                        rn.type = "indoor";
                        rn.x = r * 10.0;
                        rn.y = fl * 3.5;
                        sys.addGraphNode(rn);
                    }
                }

                // 构建室内图（使用0-based索引）
                int indoorNodeCount = nodeId - indoorNodeStart;
                MyGraph ig(indoorNodeCount);
                // 入口(0)到1楼走廊(1)
                ig.addEdge(0, 1, 5.0, 1.0, 1.0, 1);
                // 每层内部连接
                for (int fl = 0; fl < bld.floors; fl++) {
                    int flBase = fl * 4 + 1;
                    for (int r = 0; r < 3 && (flBase + r + 1) < indoorNodeCount; r++) {
                        ig.addEdge(flBase + r, flBase + r + 1, 10.0, 1.0, 1.0, 1);
                    }
                    // 电梯连接楼层
                    if (fl < bld.floors - 1 && (flBase + 4) < indoorNodeCount) {
                        ig.addEdge(flBase, flBase + 4, 3.5, 1.0, 1.0, 1);
                    }
                }
                sys.setBuildingGraph(bld.id, ig);
            }
        }

        // 创建额外的交叉路口节点
        int numIntersections = 10 + randInt(0, 10);
        for (int j = 0; j < numIntersections; j++) {
            GraphNode gn;
            gn.id = nodeId++;
            gn.areaId = aid;
            gn.name = "路口" + std::to_string(j + 1);
            gn.type = "intersection";
            gn.x = randDouble(-600, 600);
            gn.y = randDouble(-600, 600);
            sys.addGraphNode(gn);
            areaNodeIds.push_back(gn.id);
        }

        // 创建服务设施
        int numFacilities = 50 + randInt(0, 20);
        for (int f = 0; f < numFacilities; f++) {
            Facility fac;
            fac.id = facilityId++;
            fac.areaId = aid;
            fac.name = FACILITY_NAME_TEMPLATES[f % (int)(sizeof(FACILITY_NAME_TEMPLATES) / sizeof(char*))];
            fac.category = FACILITY_CATEGORIES[f % (int)(sizeof(FACILITY_CATEGORIES) / sizeof(char*))];
            // 关联到随机图节点
            fac.nodeId = areaNodeIds[randInt(0, (int)areaNodeIds.size() - 1)];
            sys.addFacility(fac);
        }

        // 创建美食
        int numFoods = 20 + randInt(0, 10);
        for (int f = 0; f < numFoods; f++) {
            Food food;
            food.id = foodId++;
            food.areaId = aid;
            food.name = FOOD_NAMES[f % (int)(sizeof(FOOD_NAMES) / sizeof(char*))];
            food.cuisine = CUISINES[f % (int)(sizeof(CUISINES) / sizeof(char*))];
            food.restaurant = (isCampus ? "食堂" : "饭店") + std::to_string(f + 1) + "号窗口";
            food.heat = randDouble(50, 5000);
            food.rating = randDouble(3.0, 5.0);
            food.distance = randDouble(10, 2000);
            sys.addFood(food);
        }

        // 构建景区图 - 创建道路（边）
        int totalNodes = (int)areaNodeIds.size();
        MyGraph graph(totalNodes);

        // 生成树：每个节点连接到前一个节点（确保连通）
        for (int i = 1; i < totalNodes; i++) {
            double dist = randDouble(50, 500);
            double congestion = randDouble(0.3, 1.0);
            double speed = isCampus ? randDouble(3, 8) : randDouble(2, 6);
            int transport = 1;
            if (isCampus) {
                transport = randInt(0, 1) ? 3 : 1;
            } else {
                transport = randInt(0, 1) ? 5 : 1;
            }
            graph.addEdge(i - 1, i, dist, congestion, speed, transport);
        }

        // 添加额外的边（确保边数>=200）
        int extraEdges = 200 - (totalNodes - 1);
        if (extraEdges < 50) extraEdges = 50;
        for (int e = 0; e < extraEdges; e++) {
            int from = randInt(0, totalNodes - 1);
            int to = randInt(0, totalNodes - 1);
            if (from == to) continue;
            double dist = randDouble(30, 400);
            double congestion = randDouble(0.3, 1.0);
            double speed = isCampus ? randDouble(3, 8) : randDouble(2, 6);
            int transport = 1;
            if (isCampus) {
                transport = randInt(0, 1) ? 3 : 1;
            } else {
                transport = randInt(0, 1) ? 5 : 1;
            }
            graph.addEdge(from, to, dist, congestion, speed, transport);
        }

        sys.setAreaGraph(aid, graph);
    }

    std::cout << "  建筑物: " << (buildingId - 1) << std::endl;
    std::cout << "  设施: " << (facilityId - 1) << std::endl;
    std::cout << "  美食: " << (foodId - 1) << std::endl;
    std::cout << "  图节点: " << (nodeId - 1) << std::endl;

    // ---- 4. 创建旅游日记 (100+) ----
    for (int i = 0; i < 120; i++) {
        Diary d;
        d.id = i + 1;
        d.userId = randInt(1, 10);
        d.title = DIARY_TITLES[i % (int)(sizeof(DIARY_TITLES) / sizeof(char*))];
        d.content = DIARY_CONTENTS[i % (int)(sizeof(DIARY_CONTENTS) / sizeof(char*))];
        // 随机关联一个景区作为目的地
        auto* area = sys.getArea(randInt(1, areaId - 1));
        if (area) d.destination = area->name;
        d.views = randInt(10, 5000);
        d.ratingSum = randDouble(10, 50);
        d.ratingCount = randInt(3, 20);
        d.rating = d.ratingSum / d.ratingCount;
        d.compressed = false;

        // 生成创建时间
        int month = randInt(1, 12);
        int day = randInt(1, 28);
        char timeBuf[32];
        snprintf(timeBuf, sizeof(timeBuf), "2026-%02d-%02d", month, day);
        d.createTime = timeBuf;

        sys.addDiary(d);
    }
    std::cout << "  日记: 120" << std::endl;

    std::cout << "数据初始化完成！" << std::endl;
}

// ==================== 主函数 ====================
int main() {
    std::cout << "====================================" << std::endl;
    std::cout << "  个性化旅游系统 - Tripsyt" << std::endl;
    std::cout << "====================================" << std::endl;

    // 初始化数据
    TourismSystem sys;
    initData(sys);

    // 创建HTTP服务器
    httplib::Server svr;

    // 注册API路由
    registerApiRoutes(svr, sys);

    // 设置静态文件服务（前端HTML/CSS/JS）
    svr.set_mount_point("/", "./frontend");

    // 根路径返回API信息
    svr.Get("/", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(jsonSuccess("{\"name\":\"Tripsyt API\",\"version\":\"1.0.0\",\"endpoints\":["
            "\"/api/areas\",\"/api/areas/:id\",\"/api/buildings\",\"/api/recommend\","
            "\"/api/route/shortest\",\"/api/route/fastest\",\"/api/route/multipoint\","
            "\"/api/route/transport\",\"/api/route/indoor\",\"/api/facilities\","
            "\"/api/diaries\",\"/api/diaries/:id\",\"/api/diaries/search\","
            "\"/api/foods\",\"/api/users/login\",\"/api/users/:id\"]}"), "application/json");
    });

    // 启动服务器
    int port = 8080;
    std::cout << "\n服务器启动在 http://localhost:" << port << std::endl;
    std::cout << "API文档: http://localhost:" << port << "/" << std::endl;
    std::cout << "按 Ctrl+C 停止服务器\n" << std::endl;

    if (!svr.listen("0.0.0.0", port)) {
        std::cerr << "无法启动服务器，端口 " << port << " 可能已被占用" << std::endl;
        return 1;
    }

    return 0;
}
