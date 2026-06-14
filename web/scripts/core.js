const DATA_PATHS = {
  nodes: ["./data/osm_nodes.json", "../cpp/data/osm_nodes.json"],
  edges: ["./data/osm_edges.json", "../cpp/data/osm_edges.json"],
  roads: ["./data/roads.json", "../cpp/data/roads.json"],
  spots: ["./data/spots.json", "../cpp/data/spots.json"],
  restaurants: ["./data/restaurants.json", "../cpp/data/restaurants.json"],
  facilities: ["./data/facilities.json", "../cpp/data/facilities.json"],
  users: ["./data/users.json", "../cpp/data/users.json"],
  diaries: ["./data/diaries/index.json", "../cpp/data/diaries/index.json"],
  regions: ["./data/regions/manifest.json", "../cpp/data/regions/manifest.json"]
};

const FALLBACK_IMAGE = "./assets/spots/real/long-corridor.jpg";
const BUILDING_IMAGE = "./assets/spots/real/tower-buddhist-incense.jpg";
const LANDSCAPE_IMAGE = "./assets/spots/real/long-corridor.jpg";
const WATER_IMAGE = "./assets/spots/real/summer-seventeen-arch-bridge.jpg";
const CAMPUS_IMAGE = "./assets/spots/real/summer-long-corridor-commons.jpg";
const DIARY_IMAGES = [
  "./assets/spots/real/summer-seventeen-arch-bridge.jpg",
  "./assets/spots/real/summer-long-corridor-commons.jpg",
  "./assets/spots/real/tower-buddhist-incense.jpg",
  "./assets/spots/real/long-corridor.jpg"
];
const STORAGE_KEYS = {
  users: "vagabond.localUsers",
  currentUserId: "vagabond.currentUserId",
  settings: "vagabond.settings",
  diaryScope: "vagabond.diaryScope",
  aigcConfig: "vagabond.aigcConfig"
};
const AIGC_API_BASE = window.AIGC_API_BASE || "http://127.0.0.1:5174";
const ROUTE_STRATEGIES = {
  distance: {
    label: "最短距离",
    algorithm: "优先选择步行距离更短的道路",
    color: "#0058bc"
  },
  time: {
    label: "最短时间",
    algorithm: "优先选择预计用时更短的道路",
    color: "#0070eb"
  },
  recommend: {
    label: "推荐路线",
    algorithm: "综合预计用时、距离和游览舒适度",
    color: "#008733"
  }
};
const ROUTE_STRATEGY_KEYS = Object.keys(ROUTE_STRATEGIES);
const ROUTE_MODE_KEYS = ["walk", "bike", "mixed"];

function normalizeRouteStrategy(value) {
  const routeStrategy = String(value || "").trim();
  if (routeStrategy === "transport" || routeStrategy === "congestion") return "time";
  return ROUTE_STRATEGY_KEYS.includes(routeStrategy) ? routeStrategy : "distance";
}

function normalizeTravelMode(value) {
  const routeMode = String(value || "").trim();
  if (["cart"].includes(routeMode)) return "bike";
  return ROUTE_MODE_KEYS.includes(routeMode) ? routeMode : "walk";
}
const INDOOR_ASSET_ROOT = "./assets/indoor";
const INDOOR_ASSET_SOURCE_NOTE = "web/assets/indoor";
const INDOOR_NODES = [
  { id: "gate", name: "文昌院大门", floor: "1F" },
  { id: "lobby", name: "前厅导览台", floor: "1F" },
  { id: "elevator1", name: "一层电梯厅", floor: "1F" },
  { id: "elevator2", name: "二层电梯厅", floor: "2F" },
  { id: "gallery", name: "文物展厅", floor: "2F" },
  { id: "room", name: "数字展映室", floor: "2F" }
];
const INDOOR_EDGES = [
  ["gate", "lobby", 18],
  ["lobby", "elevator1", 12],
  ["elevator1", "elevator2", 8],
  ["elevator2", "gallery", 16],
  ["gallery", "room", 14],
  ["lobby", "gallery", 42]
];
const INDOOR_BUILDINGS = [
  {
    id: "wenchang",
    name: "颐和园文昌院",
    source: "示例楼层图建模，可替换为授权平面图",
    nodes: [
      { id: "gate", name: "文昌院大门", floor: "1F", x: 14, y: 72 },
      { id: "lobby", name: "前厅导览台", floor: "1F", x: 34, y: 72 },
      { id: "elevator1", name: "一层电梯厅", floor: "1F", x: 52, y: 72 },
      { id: "elevator2", name: "二层电梯厅", floor: "2F", x: 52, y: 30 },
      { id: "gallery", name: "文物展厅", floor: "2F", x: 72, y: 30 },
      { id: "room", name: "数字展映室", floor: "2F", x: 88, y: 30 }
    ],
    edges: [
      ["gate", "lobby", 18],
      ["lobby", "elevator1", 12],
      ["elevator1", "elevator2", 8],
      ["elevator2", "gallery", 16],
      ["gallery", "room", 14],
      ["lobby", "gallery", 42]
    ]
  },
  {
    id: "tsinghua_hospital",
    name: "清华大学校医院",
    source: "参考清华大学校医院公开导览信息抽象为演示节点",
    nodes: [
      { id: "entrance", name: "入口大厅", floor: "1F", x: 12, y: 70 },
      { id: "registration", name: "挂号收费", floor: "1F", x: 30, y: 70 },
      { id: "pharmacy", name: "药房", floor: "1F", x: 50, y: 70 },
      { id: "stairs1", name: "楼梯/电梯", floor: "1F", x: 68, y: 70 },
      { id: "stairs2", name: "二层楼梯/电梯", floor: "2F", x: 68, y: 32 },
      { id: "clinic", name: "内科诊室", floor: "2F", x: 48, y: 32 },
      { id: "emergency", name: "急诊观察", floor: "1F", x: 86, y: 70 }
    ],
    edges: [
      ["entrance", "registration", 14],
      ["registration", "pharmacy", 16],
      ["pharmacy", "stairs1", 12],
      ["stairs1", "stairs2", 9],
      ["stairs2", "clinic", 18],
      ["stairs1", "emergency", 16],
      ["registration", "clinic", 45]
    ]
  },
  {
    id: "tsinghua_service",
    name: "清华学生服务中心",
    source: "示例服务中心室内节点，可替换为公开授权图",
    nodes: [
      { id: "door", name: "南侧入口", floor: "1F", x: 14, y: 68 },
      { id: "desk", name: "咨询台", floor: "1F", x: 34, y: 68 },
      { id: "cards", name: "校园卡窗口", floor: "1F", x: 56, y: 68 },
      { id: "stairs1", name: "楼梯", floor: "1F", x: 76, y: 68 },
      { id: "stairs2", name: "二层楼梯", floor: "2F", x: 76, y: 30 },
      { id: "visa", name: "事务办理区", floor: "2F", x: 50, y: 30 },
      { id: "meeting", name: "自助打印区", floor: "2F", x: 26, y: 30 }
    ],
    edges: [
      ["door", "desk", 12],
      ["desk", "cards", 18],
      ["cards", "stairs1", 14],
      ["stairs1", "stairs2", 8],
      ["stairs2", "visa", 15],
      ["visa", "meeting", 20],
      ["desk", "meeting", 48]
    ]
  }
];

INDOOR_BUILDINGS.splice(0, INDOOR_BUILDINGS.length, ...[
  {
    id: "wenchang",
    name: "颐和园文昌院片区",
    source: "使用 Wikimedia Commons 公开颐和园平面图作为底图，节点覆盖文昌院及东宫门片区。",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:1950_Chinese_Map_of_the_Summer_Palace_or_Yihe_Yuan,_Beijing_-_Geographicus_-_SummerPalace-china-1950.jpg",
    floorPlanImage: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/1950_Chinese_Map_of_the_Summer_Palace_or_Yihe_Yuan%2C_Beijing_-_Geographicus_-_SummerPalace-china-1950.jpg/1280px-1950_Chinese_Map_of_the_Summer_Palace_or_Yihe_Yuan%2C_Beijing_-_Geographicus_-_SummerPalace-china-1950.jpg",
    floorPlanCredit: "1950 Yihe Yuan map, Wikimedia Commons / Geographicus",
    floorPlanFit: "contain",
    floors: ["文昌院片区"],
    nodes: [
      { id: "gate", name: "东宫门入口", floor: "文昌院片区", x: 76, y: 72 },
      { id: "lobby", name: "仁寿殿前广场", floor: "文昌院片区", x: 69, y: 63 },
      { id: "court", name: "文昌院入口", floor: "文昌院片区", x: 74, y: 54 },
      { id: "stair1", name: "序厅导览台", floor: "文昌院片区", x: 66, y: 50 },
      { id: "stair2", name: "展厅连廊", floor: "文昌院片区", x: 58, y: 46 },
      { id: "gallery", name: "文物展厅", floor: "文昌院片区", x: 50, y: 42 },
      { id: "digital", name: "数字展映室", floor: "文昌院片区", x: 42, y: 38 },
      { id: "exit", name: "庭院出口", floor: "文昌院片区", x: 82, y: 50 }
    ],
    edges: [
      ["gate", "lobby", 18],
      ["lobby", "court", 14],
      ["court", "stair1", 12],
      ["stair1", "stair2", 9],
      ["stair2", "gallery", 16],
      ["gallery", "digital", 14],
      ["stair1", "exit", 15],
      ["lobby", "gallery", 44]
    ]
  },
  {
    id: "tsinghua_hospital",
    name: "清华大学医院",
    source: "参考清华大学医院官方“医院示意图”文本楼层信息建模。",
    sourceUrl: "https://xyy.tsinghua.edu.cn/yugs/yysyt.htm",
    floors: ["4F", "3F", "2F", "1F"],
    nodes: [
      { id: "entrance", name: "入口服务台", floor: "1F", x: 10, y: 82 },
      { id: "registration", name: "挂号收费处", floor: "1F", x: 28, y: 82 },
      { id: "pharmacy", name: "药剂科/药房", floor: "1F", x: 48, y: 82 },
      { id: "emergency", name: "内外科急诊", floor: "1F", x: 70, y: 82 },
      { id: "lift1", name: "南楼电梯厅", floor: "1F", x: 88, y: 82 },
      { id: "lift2", name: "二层电梯厅", floor: "2F", x: 88, y: 58 },
      { id: "clinic", name: "内科门诊", floor: "2F", x: 64, y: 58 },
      { id: "tcm", name: "中医科/理疗室", floor: "2F", x: 42, y: 58 },
      { id: "health", name: "健康管理中心", floor: "2F", x: 20, y: 58 },
      { id: "exam", name: "体检中心", floor: "3F", x: 34, y: 34 },
      { id: "eye", name: "眼科/耳鼻喉", floor: "4F", x: 60, y: 14 },
      { id: "surgery", name: "手术室", floor: "4F", x: 82, y: 14 }
    ],
    edges: [
      ["entrance", "registration", 14],
      ["registration", "pharmacy", 16],
      ["pharmacy", "emergency", 18],
      ["emergency", "lift1", 14],
      ["lift1", "lift2", 10],
      ["lift2", "clinic", 16],
      ["clinic", "tcm", 18],
      ["tcm", "health", 16],
      ["lift2", "exam", 28],
      ["exam", "eye", 30],
      ["eye", "surgery", 14],
      ["registration", "clinic", 48]
    ]
  },
  {
    id: "legacy_teaching_building",
    name: "清华大学教学楼模拟结构",
    source: "按教学楼常见结构建模：入口门厅、一层服务台、电梯/楼梯核心、各楼层走廊、教室、实验室和报告厅。",
    sourceUrl: "https://www.tsinghua.edu.cn/",
    floors: ["1F", "2F", "3F", "4F"],
    nodes: [
      { id: "tb_gate", name: "教学楼大门", floor: "1F", x: 10, y: 80, role: "entrance" },
      { id: "tb_security", name: "门厅值班台", floor: "1F", x: 25, y: 80, role: "service" },
      { id: "tb_lobby", name: "一层大厅", floor: "1F", x: 42, y: 80, role: "hall" },
      { id: "tb_lift1", name: "一层电梯/楼梯厅", floor: "1F", x: 58, y: 80, role: "elevator" },
      { id: "tb_101", name: "101 阶梯教室", floor: "1F", x: 78, y: 70, role: "room" },
      { id: "tb_lab1", name: "一层开放实验室", floor: "1F", x: 78, y: 88, role: "room" },
      { id: "tb_lift2", name: "二层电梯/楼梯厅", floor: "2F", x: 58, y: 56, role: "elevator" },
      { id: "tb_corridor2", name: "二层主走廊", floor: "2F", x: 44, y: 56, role: "corridor" },
      { id: "tb_201", name: "201 研讨教室", floor: "2F", x: 22, y: 47, role: "room" },
      { id: "tb_205", name: "205 多媒体教室", floor: "2F", x: 22, y: 65, role: "room" },
      { id: "tb_lift3", name: "三层电梯/楼梯厅", floor: "3F", x: 58, y: 32, role: "elevator" },
      { id: "tb_corridor3", name: "三层主走廊", floor: "3F", x: 44, y: 32, role: "corridor" },
      { id: "tb_301", name: "301 计算机实验室", floor: "3F", x: 22, y: 23, role: "room" },
      { id: "tb_306", name: "306 智慧教室", floor: "3F", x: 22, y: 41, role: "room" },
      { id: "tb_lift4", name: "四层电梯/楼梯厅", floor: "4F", x: 58, y: 14, role: "elevator" },
      { id: "tb_corridor4", name: "四层主走廊", floor: "4F", x: 44, y: 14, role: "corridor" },
      { id: "tb_report", name: "学术报告厅", floor: "4F", x: 22, y: 8, role: "room" },
      { id: "tb_office", name: "教师办公室", floor: "4F", x: 22, y: 20, role: "room" }
    ],
    edges: [
      ["tb_gate", "tb_security", 10],
      ["tb_security", "tb_lobby", 12],
      ["tb_lobby", "tb_lift1", 12],
      ["tb_lobby", "tb_101", 22],
      ["tb_101", "tb_lab1", 12],
      ["tb_lift1", "tb_lab1", 18],
      ["tb_lift1", "tb_lift2", 8],
      ["tb_lift2", "tb_corridor2", 10],
      ["tb_corridor2", "tb_201", 16],
      ["tb_corridor2", "tb_205", 16],
      ["tb_lift2", "tb_lift3", 8],
      ["tb_lift3", "tb_corridor3", 10],
      ["tb_corridor3", "tb_301", 16],
      ["tb_corridor3", "tb_306", 16],
      ["tb_lift3", "tb_lift4", 8],
      ["tb_lift4", "tb_corridor4", 10],
      ["tb_corridor4", "tb_report", 16],
      ["tb_corridor4", "tb_office", 16]
    ]
  },
  {
    id: "legacy_palace_route",
    name: "故宫博物院开放区",
    source: "使用故宫博物院官网“开放区域”导览图作为底图，叠加自南向北参观动线。",
    sourceUrl: "https://www.dpm.org.cn/Visit.html",
    floorPlanImage: "https://img.dpm.org.cn/static/themes/image/xf/map3.jpg",
    floorPlanCredit: "故宫博物院官网开放区域导览图",
    floorPlanFit: "contain",
    floors: ["北区", "东区", "中区", "西区", "南区"],
    nodes: [
      { id: "wumen", name: "午门入口", floor: "南区", x: 50, y: 91 },
      { id: "duanmen", name: "端门", floor: "南区", x: 50, y: 83, minor: true },
      { id: "taihemen", name: "太和门", floor: "南区", x: 50, y: 74 },
      { id: "hongyi", name: "弘义阁", floor: "西区", x: 33, y: 73, minor: true },
      { id: "tirenge", name: "体仁阁", floor: "东区", x: 67, y: 73, minor: true },
      { id: "taihedian", name: "太和殿", floor: "中区", x: 50, y: 62 },
      { id: "zhonghe", name: "中和殿", floor: "中区", x: 50, y: 54 },
      { id: "baohe", name: "保和殿", floor: "中区", x: 50, y: 47 },
      { id: "xihuamen", name: "西华门", floor: "西区", x: 13, y: 52 },
      { id: "donghuamen", name: "东华门", floor: "东区", x: 87, y: 52 },
      { id: "longzongmen", name: "隆宗门", floor: "西区", x: 39, y: 42, minor: true },
      { id: "jingyunmen", name: "景运门", floor: "东区", x: 61, y: 42, minor: true },
      { id: "qianqingmen", name: "乾清门", floor: "北区", x: 50, y: 40 },
      { id: "qianqing", name: "乾清宫", floor: "北区", x: 50, y: 34 },
      { id: "jiaotai", name: "交泰殿", floor: "北区", x: 50, y: 29 },
      { id: "kunning", name: "坤宁宫", floor: "北区", x: 50, y: 24 },
      { id: "yuhuayuan", name: "御花园", floor: "北区", x: 50, y: 16 },
      { id: "shenwu", name: "神武门出口", floor: "北区", x: 50, y: 8 },
      { id: "cining", name: "慈宁宫", floor: "西区", x: 25, y: 35 },
      { id: "shoukang", name: "寿康宫", floor: "西区", x: 24, y: 27, minor: true },
      { id: "yongshou", name: "永寿宫", floor: "西区", x: 39, y: 34, minor: true },
      { id: "taiji", name: "太极殿", floor: "西区", x: 34, y: 30, minor: true },
      { id: "changchun", name: "长春宫", floor: "西区", x: 34, y: 24, minor: true },
      { id: "xianfu", name: "咸福宫", floor: "西区", x: 38, y: 20, minor: true },
      { id: "yikun", name: "翊坤宫", floor: "西区", x: 42, y: 24, minor: true },
      { id: "chuxiu", name: "储秀宫", floor: "西区", x: 42, y: 18, minor: true },
      { id: "jingren", name: "景仁宫", floor: "东区", x: 60, y: 34, minor: true },
      { id: "chengqian", name: "承乾宫", floor: "东区", x: 64, y: 30, minor: true },
      { id: "zhongcui", name: "钟粹宫", floor: "东区", x: 64, y: 24, minor: true },
      { id: "yanxi", name: "延禧宫", floor: "东区", x: 68, y: 20, minor: true },
      { id: "yonghe", name: "永和宫", floor: "东区", x: 60, y: 24, minor: true },
      { id: "jingyang", name: "景阳宫", floor: "东区", x: 60, y: 18, minor: true },
      { id: "zhaigong", name: "斋宫", floor: "东区", x: 72, y: 35, minor: true },
      { id: "fengxian", name: "奉先殿", floor: "东区", x: 76, y: 30 },
      { id: "huangji", name: "皇极殿", floor: "东区", x: 82, y: 24 },
      { id: "zhenbao", name: "珍宝馆", floor: "东区", x: 84, y: 19 },
      { id: "jiulongbi", name: "九龙壁", floor: "东区", x: 82, y: 14, minor: true },
      { id: "wuying", name: "武英殿", floor: "西区", x: 28, y: 68 },
      { id: "wenhua", name: "文华殿", floor: "东区", x: 72, y: 68 }
    ],
    edges: [
      ["wumen", "duanmen"], ["duanmen", "taihemen"], ["taihemen", "taihedian"],
      ["taihedian", "zhonghe"], ["zhonghe", "baohe"], ["baohe", "qianqingmen"],
      ["qianqingmen", "qianqing"], ["qianqing", "jiaotai"], ["jiaotai", "kunning"],
      ["kunning", "yuhuayuan"], ["yuhuayuan", "shenwu"],
      ["taihemen", "hongyi"], ["hongyi", "wuying"], ["hongyi", "taihedian"],
      ["taihemen", "tirenge"], ["tirenge", "wenhua"], ["tirenge", "taihedian"],
      ["baohe", "longzongmen"], ["longzongmen", "xihuamen"], ["baohe", "jingyunmen"],
      ["jingyunmen", "donghuamen"], ["longzongmen", "qianqingmen"], ["jingyunmen", "qianqingmen"],
      ["longzongmen", "cining"], ["cining", "shoukang"], ["longzongmen", "yongshou"],
      ["yongshou", "taiji"], ["taiji", "changchun"], ["changchun", "xianfu"],
      ["xianfu", "chuxiu"], ["chuxiu", "yuhuayuan"], ["changchun", "yikun"],
      ["yikun", "chuxiu"], ["qianqingmen", "jingren"], ["jingren", "chengqian"],
      ["chengqian", "zhongcui"], ["zhongcui", "yanxi"], ["yanxi", "jingyang"],
      ["jingyang", "yuhuayuan"], ["zhongcui", "yonghe"], ["yonghe", "jingyang"],
      ["jingyunmen", "zhaigong"], ["zhaigong", "fengxian"], ["fengxian", "huangji"],
      ["huangji", "zhenbao"], ["zhenbao", "jiulongbi"], ["jiulongbi", "shenwu"],
      ["donghuamen", "fengxian"], ["xihuamen", "wuying"], ["wumen", "wuying"], ["wumen", "wenhua"]
    ]
  }
]);

INDOOR_BUILDINGS.splice(0, INDOOR_BUILDINGS.length, ...[
  {
    id: "wenchang",
    name: "颐和园文昌院展厅",
    source: "使用颐和园文昌院展厅平面图校准节点，覆盖综合馆、玉器馆、铜器馆、瓷器馆等展厅。",
    floorPlanImage: `${INDOOR_ASSET_ROOT}/wenchang-gallery.png`,
    floorPlanCredit: "颐和园文昌院展厅图",
    floorPlanFit: "contain",
    floors: ["1F"],
    nodes: [
      { id: "wc_J0", name: "入口", floor: "1F", role: "entrance", x: 50.0, y: 91.7 },
      { id: "wc_J1", name: "路径1", floor: "1F", role: "path", x: 49.8, y: 69.8, visible: false },
      { id: "wc_J2", name: "综合馆", floor: "1F", role: "room", x: 50.0, y: 44.7 },
      { id: "wc_J3", name: "玉器馆", floor: "1F", role: "room", x: 77.8, y: 23.0 },
      { id: "wc_J4", name: "铜器馆", floor: "1F", role: "room", x: 21.0, y: 23.0 },
      { id: "wc_J5", name: "聚珍馆", floor: "1F", role: "room", x: 5.3, y: 63.2 },
      { id: "wc_J6", name: "书斋", floor: "1F", role: "room", x: 77.6, y: 61.3 },
      { id: "wc_J7", name: "瓷器馆", floor: "1F", role: "room", x: 93.4, y: 61.0 },
      { id: "wc_J8", name: "出口", floor: "1F", role: "entrance", x: 50.2, y: 6.3 },
      { id: "wc_J9", name: "室内1", floor: "1F", role: "room", x: 82.9, y: 6.3 },
      { id: "wc_J10", name: "室内2", floor: "1F", role: "room", x: 93.2, y: 19.8 },
      { id: "wc_J11", name: "室内3", floor: "1F", role: "room", x: 17.3, y: 6.2 },
      { id: "wc_J12", name: "室内4", floor: "1F", role: "room", x: 8.0, y: 19.7 },
      { id: "wc_J13", name: "室内5", floor: "1F", role: "room", x: 8.0, y: 30.3 },
      { id: "wc_J14", name: "室内6", floor: "1F", role: "room", x: 7.8, y: 42.5 },
      { id: "wc_J15", name: "路径2", floor: "1F", role: "path", x: 28.6, y: 69.7, visible: false },
      { id: "wc_J16", name: "路径3", floor: "1F", role: "path", x: 70.0, y: 69.8, visible: false },
      { id: "wc_J17", name: "室内7", floor: "1F", role: "room", x: 93.4, y: 43.8 },
      { id: "wc_J18", name: "室内8", floor: "1F", role: "room", x: 93.4, y: 30.5 },
      { id: "wc_J19", name: "路径4", floor: "1F", role: "path", x: 85.0, y: 60.5, visible: false },
      { id: "wc_J20", name: "路径5", floor: "1F", role: "path", x: 85.4, y: 43.3, visible: false },
      { id: "wc_J21", name: "路径6", floor: "1F", role: "path", x: 85.6, y: 30.2, visible: false },
      { id: "wc_J22", name: "路径7", floor: "1F", role: "path", x: 85.4, y: 20.0, visible: false },
      { id: "wc_J23", name: "路径8", floor: "1F", role: "path", x: 82.7, y: 12.5, visible: false },
      { id: "wc_J24", name: "路径9", floor: "1F", role: "path", x: 49.8, y: 23.0, visible: false },
      { id: "wc_J25", name: "路径10", floor: "1F", role: "path", x: 14.4, y: 20.5, visible: false },
      { id: "wc_J26", name: "路径11", floor: "1F", role: "path", x: 17.3, y: 11.8, visible: false },
      { id: "wc_J27", name: "路径12", floor: "1F", role: "path", x: 13.4, y: 30.8, visible: false },
      { id: "wc_J28", name: "路径13", floor: "1F", role: "path", x: 16.5, y: 70.3, visible: false },
      { id: "wc_J29", name: "路径14", floor: "1F", role: "path", x: 16.1, y: 63.0, visible: false },
      { id: "wc_J30", name: "路径15", floor: "1F", role: "path", x: 16.5, y: 42.7, visible: false },
      { id: "wc_J31", name: "路径16", floor: "1F", role: "path", x: 33.1, y: 34.3, visible: false },
      { id: "wc_J32", name: "路径17", floor: "1F", role: "path", x: 66.9, y: 34.3, visible: false },
      { id: "wc_J33", name: "路径18", floor: "1F", role: "path", x: 66.7, y: 50.5, visible: false },
      { id: "wc_J34", name: "路径19", floor: "1F", role: "path", x: 32.7, y: 51.5, visible: false },
      { id: "wc_J35", name: "路径20", floor: "1F", role: "path", x: 49.8, y: 58.8, visible: false },
      { id: "wc_J36", name: "路径21", floor: "1F", role: "path", x: 60.9, y: 58.8, visible: false },
      { id: "wc_J37", name: "路径22", floor: "1F", role: "path", x: 38.3, y: 58.7, visible: false },
      { id: "wc_J38", name: "路径23", floor: "1F", role: "path", x: 27.0, y: 33.7, visible: false },
      { id: "wc_J39", name: "路径24", floor: "1F", role: "path", x: 72.2, y: 31.7, visible: false },
      { id: "wc_J40", name: "路径25", floor: "1F", role: "path", x: 27.2, y: 23.2, visible: false },
      { id: "wc_J41", name: "路径26", floor: "1F", role: "path", x: 72.0, y: 23.3, visible: false },
      { id: "wc_J42", name: "路径27", floor: "1F", role: "path", x: 73.2, y: 52.0, visible: false },
      { id: "wc_J43", name: "路径28", floor: "1F", role: "path", x: 27.2, y: 51.2, visible: false },
      { id: "wc_J44", name: "路径29", floor: "1F", role: "path", x: 59.9, y: 51.3, visible: false },
      { id: "wc_J45", name: "路径30", floor: "1F", role: "path", x: 39.1, y: 51.0, visible: false },
      { id: "wc_J46", name: "路径31", floor: "1F", role: "path", x: 72.2, y: 61.2, visible: false },
    ],
    edges: [
      ["wc_J0", "wc_J1", 131],
      ["wc_J1", "wc_J15", 109],
      ["wc_J1", "wc_J16", 104],
      ["wc_J16", "wc_J6", 64],
      ["wc_J6", "wc_J19", 38],
      ["wc_J19", "wc_J7", 43],
      ["wc_J19", "wc_J20", 103],
      ["wc_J20", "wc_J17", 41],
      ["wc_J20", "wc_J21", 79],
      ["wc_J21", "wc_J18", 40],
      ["wc_J3", "wc_J21", 59],
      ["wc_J3", "wc_J22", 43],
      ["wc_J22", "wc_J10", 40],
      ["wc_J22", "wc_J23", 47],
      ["wc_J23", "wc_J9", 37],
      ["wc_J2", "wc_J24", 130],
      ["wc_J4", "wc_J25", 37],
      ["wc_J25", "wc_J12", 33],
      ["wc_J25", "wc_J26", 54],
      ["wc_J26", "wc_J11", 34],
      ["wc_J8", "wc_J11", 169],
      ["wc_J9", "wc_J8", 168],
      ["wc_J8", "wc_J24", 100],
      ["wc_J25", "wc_J27", 62],
      ["wc_J27", "wc_J13", 28],
      ["wc_J30", "wc_J27", 73],
      ["wc_J30", "wc_J14", 45],
      ["wc_J30", "wc_J29", 122],
      ["wc_J29", "wc_J5", 56],
      ["wc_J29", "wc_J28", 44],
      ["wc_J28", "wc_J15", 62],
      ["wc_J1", "wc_J35", 66],
      ["wc_J35", "wc_J37", 59],
      ["wc_J35", "wc_J36", 57],
      ["wc_J36", "wc_J44", 45],
      ["wc_J44", "wc_J33", 35],
      ["wc_J33", "wc_J42", 34],
      ["wc_J42", "wc_J46", 55],
      ["wc_J46", "wc_J6", 28],
      ["wc_J33", "wc_J32", 97],
      ["wc_J32", "wc_J39", 31],
      ["wc_J39", "wc_J41", 50],
      ["wc_J41", "wc_J3", 30],
      ["wc_J24", "wc_J41", 114],
      ["wc_J24", "wc_J40", 116],
      ["wc_J35", "wc_J2", 85],
      ["wc_J37", "wc_J45", 46],
      ["wc_J45", "wc_J34", 33],
      ["wc_J34", "wc_J43", 28],
      ["wc_J34", "wc_J31", 103],
      ["wc_J31", "wc_J38", 31],
      ["wc_J15", "wc_J43", 111],
      ["wc_J38", "wc_J40", 63],
      ["wc_J40", "wc_J4", 32],
    ]
  },
  {
    id: "tsinghua_hospital",
    name: "清华大学医院",
    source: "基于实景平面图校准：F1 60节点62边 + F2 62节点61边",
    floorPlanFit: "contain",
    floorPlans: {
      "F1": { image: `${INDOOR_ASSET_ROOT}/医院一层简化导航图.png`, credit: "清华大学医院F1实景平面图" },
      "F2": { image: `${INDOOR_ASSET_ROOT}/医院二层简化导航图.png`, credit: "清华大学医院F2简化导航图" },
      "F3": { image: `${INDOOR_ASSET_ROOT}/清华大学医院F3简化.png`, credit: "清华大学医院F3简化导航图" },
      "F4": { image: `${INDOOR_ASSET_ROOT}/清华大学医院F4简化.png`, credit: "清华大学医院F4简化导航图" },
    },
    floors: ["F1", "F2", "F3", "F4"],
    displayRules: { showOnlySelectedRoute: true },
    recommendedDisplay: { defaultMode: { showEdges: false }, navigationMode: { showOnlyRouteEdges: true } },
    nodes: [
      { id: "J0", name: "入口", floor: "F1", role: "entrance", x: 57.0, y: 80.5, displayLevel: 1 },
      { id: "J1", name: "中庭1", floor: "F1", role: "hall", x: 57.5, y: 68.8, displayLevel: 1 },
      { id: "J3", name: "病理科", floor: "F1", role: "room", x: 43.1, y: 68.4, displayLevel: 2 },
      { id: "J4", name: "超声科", floor: "F1", role: "room", x: 42.0, y: 79.9, displayLevel: 2 },
      { id: "J5", name: "心电图室", floor: "F1", role: "room", x: 35.7, y: 79.6, displayLevel: 2 },
      { id: "J8", name: "导诊台", floor: "F1", role: "service", x: 63.3, y: 49.3, displayLevel: 1 },
      { id: "J9", name: "医保服务", floor: "F1", role: "service", x: 63.6, y: 43.3, displayLevel: 1 },
      { id: "J10", name: "路径1", floor: "F1", role: "path", x: 74.6, y: 48.6, visible: false },
      { id: "J11", name: "路径2", floor: "F1", role: "path", x: 75.1, y: 70.2, visible: false },
      { id: "J12", name: "路径3", floor: "F1", role: "path", x: 82.7, y: 70.0, visible: false },
      { id: "J13", name: "路径4", floor: "F1", role: "path", x: 82.1, y: 62.0, visible: false },
      { id: "J14", name: "路径5", floor: "F1", role: "path", x: 82.5, y: 44.6, visible: false },
      { id: "J15", name: "路径6", floor: "F1", role: "path", x: 82.2, y: 22.4, visible: false },
      { id: "J18", name: "门诊治疗区", floor: "F1", role: "room", x: 88.9, y: 43.9, displayLevel: 2 },
      { id: "J19", name: "输液大厅", floor: "F1", role: "room", x: 89.5, y: 62.5, displayLevel: 2 },
      { id: "J20", name: "路径7", floor: "F1", role: "path", x: 92.1, y: 70.5, visible: false },
      { id: "J21", name: "药房", floor: "F1", role: "room", x: 92.6, y: 79.4, displayLevel: 1 },
      { id: "J23", name: "路径8", floor: "F1", role: "path", x: 74.6, y: 23.1, visible: false },
      { id: "J24", name: "CT室", floor: "F1", role: "room", x: 74.6, y: 14.2, displayLevel: 2 },
      { id: "J25", name: "影像检查区", floor: "F1", role: "room", x: 60.6, y: 14.2, displayLevel: 2 },
      { id: "J27", name: "路径9", floor: "F1", role: "path", x: 63.2, y: 23.5, visible: false },
      { id: "J29", name: "磁共振", floor: "F1", role: "room", x: 63.1, y: 18.6, displayLevel: 2 },
      { id: "J30", name: "路径10", floor: "F1", role: "path", x: 44.9, y: 23.3, visible: false },
      { id: "J31", name: "路径11", floor: "F1", role: "path", x: 44.9, y: 17.1, visible: false },
      { id: "J32", name: "路径12", floor: "F1", role: "path", x: 44.9, y: 32.0, visible: false },
      { id: "J33", name: "医学影像科", floor: "F1", role: "room", x: 37.8, y: 33.1, displayLevel: 2 },
      { id: "J34", name: "急诊医学科", floor: "F1", role: "room", x: 37.8, y: 17.3, displayLevel: 2 },
      { id: "J37", name: "D区楼梯", floor: "F1", role: "elevator", x: 81.7, y: 12.3, displayLevel: 1 },
      { id: "J38", name: "E区洗手间", floor: "F1", role: "service", x: 89.1, y: 12.7, displayLevel: 1 },
      { id: "J39", name: "药房楼梯", floor: "F1", role: "elevator", x: 92.3, y: 66.4, displayLevel: 1 },
      { id: "J40", name: "大厅电梯", floor: "F1", role: "elevator", x: 47.4, y: 54.8, displayLevel: 1 },
      { id: "J41", name: "大厅洗手间", floor: "F1", role: "service", x: 52.5, y: 55.1, displayLevel: 1 },
      { id: "J42", name: "中庭2", floor: "F1", role: "hall", x: 63.2, y: 68.8, displayLevel: 1 },
      { id: "J43", name: "路径13", floor: "F1", role: "path", x: 44.4, y: 49.3, visible: false },
      { id: "J44", name: "C区楼梯", floor: "F1", role: "elevator", x: 44.4, y: 43.5, displayLevel: 1 },
      { id: "J45", name: "C区电梯", floor: "F1", role: "elevator", x: 37.0, y: 43.5, displayLevel: 1 },
      { id: "J46", name: "B区电梯", floor: "F1", role: "elevator", x: 36.8, y: 23.1, displayLevel: 1 },
      { id: "J47", name: "B区洗手间", floor: "F1", role: "service", x: 42.0, y: 22.9, displayLevel: 1 },
      { id: "J48", name: "路径14", floor: "F1", role: "path", x: 37.0, y: 49.0, visible: false },
      { id: "J49", name: "检验科", floor: "F1", role: "room", x: 37.2, y: 55.5, displayLevel: 2 },
      { id: "J50", name: "路径15", floor: "F1", role: "path", x: 26.7, y: 49.3, visible: false },
      { id: "J52", name: "中医科", floor: "F1", role: "room", x: 26.7, y: 35.2, displayLevel: 2 },
      { id: "J53", name: "预防接种门诊", floor: "F1", role: "room", x: 26.7, y: 62.0, displayLevel: 2 },
      { id: "J54", name: "门诊洗手间", floor: "F1", role: "service", x: 26.9, y: 69.8, displayLevel: 1 },
      { id: "J55", name: "F区楼梯", floor: "F1", role: "elevator", x: 19.3, y: 21.5, displayLevel: 1 },
      { id: "J56", name: "设备用房", floor: "F1", role: "room", x: 19.2, y: 14.7, displayLevel: 2 },
      { id: "J57", name: "污染处理", floor: "F1", role: "room", x: 11.3, y: 20.5, displayLevel: 2 },
      { id: "J58", name: "高压氧舱", floor: "F1", role: "room", x: 11.0, y: 28.5, displayLevel: 2 },
      { id: "J59", name: "儿科门诊", floor: "F1", role: "room", x: 11.0, y: 37.7, displayLevel: 2 },
      { id: "J60", name: "门诊大厅", floor: "F1", role: "hall", x: 19.5, y: 49.0, displayLevel: 1 },
      { id: "J61", name: "A区洗手间", floor: "F1", role: "service", x: 8.1, y: 48.4, displayLevel: 1 },
      { id: "J62", name: "路径16", floor: "F1", role: "path", x: 15.5, y: 49.0, visible: false },
      { id: "J63", name: "路径17", floor: "F1", role: "path", x: 15.7, y: 60.0, visible: false },
      { id: "J64", name: "路径18", floor: "F1", role: "path", x: 15.5, y: 70.3, visible: false },
      { id: "J65", name: "皮肤科", floor: "F1", role: "room", x: 10.2, y: 59.8, displayLevel: 2 },
      { id: "J66", name: "眼科", floor: "F1", role: "room", x: 10.4, y: 70.3, displayLevel: 2 },
      { id: "J67", name: "耳鼻喉科", floor: "F1", role: "room", x: 15.2, y: 79.8, displayLevel: 2 },
      { id: "J68", name: "路径19", floor: "F1", role: "path", x: 19.3, y: 27.9, visible: false },
      { id: "J69", name: "路径20", floor: "F1", role: "path", x: 19.3, y: 36.9, visible: false },
      { id: "J70", name: "路径21", floor: "F1", role: "path", x: 52.9, y: 68.2, visible: false },
      { id: "J71", name: "路径22", floor: "F1", role: "path", x: 47.5, y: 68.2, visible: false },
      { id: "F2_J0", name: "入口", floor: "F2", role: "entrance", x: 57.1, y: 80.5, displayLevel: 1 },
      { id: "F2_J1", name: "营养科", floor: "F2", role: "room", x: 77.7, y: 79.5, displayLevel: 2 },
      { id: "F2_J2", name: "心电图室", floor: "F2", role: "room", x: 40.4, y: 79.8, displayLevel: 2 },
      { id: "F2_J3", name: "超声科", floor: "F2", role: "room", x: 33.9, y: 78.9, displayLevel: 2 },
      { id: "F2_J4", name: "产科门诊", floor: "F2", role: "room", x: 37.1, y: 67.9, displayLevel: 2 },
      { id: "F2_J5", name: "妇科门诊", floor: "F2", role: "room", x: 37.3, y: 58.0, displayLevel: 2 },
      { id: "F2_J7", name: "大厅电梯", floor: "F2", role: "elevator", x: 46.0, y: 57.6, displayLevel: 1 },
      { id: "F2_J8", name: "大厅洗手间", floor: "F2", role: "service", x: 51.6, y: 57.9, displayLevel: 1 },
      { id: "F2_J9", name: "大厅", floor: "F2", role: "hall", x: 56.9, y: 68.2, displayLevel: 1 },
      { id: "F2_J10", name: "护士站", floor: "F2", role: "service", x: 63.1, y: 40.9, displayLevel: 1 },
      { id: "F2_J11", name: "大厅2", floor: "F2", role: "hall", x: 62.3, y: 67.9, displayLevel: 1 },
      { id: "F2_J12", name: "路径1", floor: "F2", role: "path", x: 46.1, y: 67.9, visible: false },
      { id: "F2_J13", name: "路径2", floor: "F2", role: "path", x: 51.8, y: 67.9, visible: false },
      { id: "F2_J14", name: "内镜中心", floor: "F2", role: "room", x: 63.2, y: 32.7, displayLevel: 2 },
      { id: "F2_J15", name: "内科诊区", floor: "F2", role: "room", x: 51.3, y: 40.7, displayLevel: 2 },
      { id: "F2_J16", name: "外科诊区", floor: "F2", role: "room", x: 74.9, y: 40.9, displayLevel: 2 },
      { id: "F2_J17", name: "手术室", floor: "F2", role: "room", x: 75.5, y: 54.4, displayLevel: 2 },
      { id: "F2_J18", name: "住院服务中心", floor: "F2", role: "room", x: 77.6, y: 70.7, displayLevel: 2 },
      { id: "F2_J19", name: "E楼梯", floor: "F2", role: "elevator", x: 92.3, y: 65.4, displayLevel: 1 },
      { id: "F2_J20", name: "药房", floor: "F2", role: "room", x: 92.6, y: 79.8, displayLevel: 1 },
      { id: "F2_J21", name: "路径3", floor: "F2", role: "path", x: 87.1, y: 79.8, visible: false },
      { id: "F2_J22", name: "路径4", floor: "F2", role: "path", x: 86.5, y: 70.5, visible: false },
      { id: "F2_J23", name: "路径5", floor: "F2", role: "path", x: 92.6, y: 70.3, visible: false },
      { id: "F2_J24", name: "住院病房区", floor: "F2", role: "room", x: 90.9, y: 42.0, displayLevel: 2 },
      { id: "F2_J25", name: "E洗手间", floor: "F2", role: "service", x: 90.7, y: 14.0, displayLevel: 1 },
      { id: "F2_J26", name: "D楼梯", floor: "F2", role: "elevator", x: 83.4, y: 13.6, displayLevel: 1 },
      { id: "F2_J27", name: "眼科门诊", floor: "F2", role: "room", x: 76.3, y: 13.8, displayLevel: 2 },
      { id: "F2_J28", name: "整形美容门诊", floor: "F2", role: "room", x: 66.3, y: 13.8, displayLevel: 2 },
      { id: "F2_J29", name: "外科门诊", floor: "F2", role: "room", x: 53.1, y: 13.8, displayLevel: 2 },
      { id: "F2_J30", name: "耳鼻咽喉科", floor: "F2", role: "room", x: 53.1, y: 21.3, displayLevel: 2 },
      { id: "F2_J31", name: "检验科", floor: "F2", role: "room", x: 72.1, y: 21.5, displayLevel: 2 },
      { id: "F2_J32", name: "路径6", floor: "F2", role: "path", x: 83.6, y: 41.1, visible: false },
      { id: "F2_J33", name: "路径7", floor: "F2", role: "path", x: 83.3, y: 54.4, visible: false },
      { id: "F2_J34", name: "路径8", floor: "F2", role: "path", x: 83.1, y: 26.8, visible: false },
      { id: "F2_J35", name: "路径9", floor: "F2", role: "path", x: 72.3, y: 26.6, visible: false },
      { id: "F2_J36", name: "路径10", floor: "F2", role: "path", x: 53.1, y: 26.6, visible: false },
      { id: "F2_J37", name: "B洗手间", floor: "F2", role: "service", x: 40.4, y: 26.1, displayLevel: 1 },
      { id: "F2_J38", name: "B电梯", floor: "F2", role: "elevator", x: 34.3, y: 25.4, displayLevel: 1 },
      { id: "F2_J39", name: "急诊医学科", floor: "F2", role: "room", x: 36.9, y: 14.2, displayLevel: 2 },
      { id: "F2_J40", name: "内科门诊", floor: "F2", role: "room", x: 37.1, y: 35.5, displayLevel: 2 },
      { id: "F2_J41", name: "C洗手间", floor: "F2", role: "service", x: 43.3, y: 46.8, displayLevel: 1 },
      { id: "F2_J42", name: "C电梯", floor: "F2", role: "elevator", x: 35.4, y: 46.4, displayLevel: 1 },
      { id: "F2_J43", name: "A区", floor: "F2", role: "hall", x: 15.1, y: 45.1, displayLevel: 1 },
      { id: "F2_J44", name: "路径11", floor: "F2", role: "path", x: 45.0, y: 26.1, visible: false },
      { id: "F2_J45", name: "路径12", floor: "F2", role: "path", x: 44.7, y: 15.0, visible: false },
      { id: "F2_J46", name: "路径13", floor: "F2", role: "path", x: 45.0, y: 35.1, visible: false },
      { id: "F2_J48", name: "路径14", floor: "F2", role: "path", x: 51.6, y: 51.1, visible: false },
      { id: "F2_J49", name: "路径15", floor: "F2", role: "path", x: 43.3, y: 51.5, visible: false },
      { id: "F2_J50", name: "路径16", floor: "F2", role: "path", x: 35.7, y: 51.7, visible: false },
      { id: "F2_J51", name: "心血管科", floor: "F2", role: "room", x: 22.6, y: 55.8, displayLevel: 2 },
      { id: "F2_J52", name: "A洗手间1", floor: "F2", role: "service", x: 19.1, y: 67.0, displayLevel: 1 },
      { id: "F2_J53", name: "A洗手间2", floor: "F2", role: "service", x: 7.8, y: 40.2, displayLevel: 1 },
      { id: "F2_J54", name: "皮肤科", floor: "F2", role: "room", x: 10.4, y: 28.1, displayLevel: 2 },
      { id: "F2_J56", name: "康复医学科", floor: "F2", role: "room", x: 8.1, y: 55.8, displayLevel: 2 },
      { id: "F2_J57", name: "口腔综合治疗区", floor: "F2", role: "room", x: 8.5, y: 75.6, displayLevel: 2 },
      { id: "F2_J58", name: "中医科", floor: "F2", role: "room", x: 17.3, y: 78.9, displayLevel: 2 },
      { id: "F2_J59", name: "路径17", floor: "F2", role: "path", x: 22.3, y: 50.4, visible: false },
      { id: "F2_J60", name: "路径18", floor: "F2", role: "path", x: 14.8, y: 50.5, visible: false },
      { id: "F2_J61", name: "路径19", floor: "F2", role: "path", x: 8.0, y: 50.0, visible: false },
      { id: "F2_J62", name: "路径20", floor: "F2", role: "path", x: 14.7, y: 62.9, visible: false },
      { id: "F2_J63", name: "路径21", floor: "F2", role: "path", x: 8.0, y: 62.9, visible: false },
      { id: "F2_J64", name: "路径22", floor: "F2", role: "path", x: 14.8, y: 67.9, visible: false },
    
      { id: "F3_J0", name: "入口", floor: "F3", role: "entrance", x: 54.8, y: 78.3, displayLevel: 1 },
      { id: "F3_J1", name: "中庭", floor: "F3", role: "hall", x: 54.6, y: 53.1, displayLevel: 1 },
      { id: "F3_J3", name: "外科病房区", floor: "F3", role: "room", x: 54.1, y: 12.0, displayLevel: 2 },
      { id: "F3_J5", name: "内科病房区", floor: "F3", role: "room", x: 84.8, y: 40.7, displayLevel: 2 },
      { id: "F3_J7", name: "路径1", floor: "F3", role: "path", x: 54.6, y: 40.7, visible: false },
      { id: "F3_J10", name: "B洗手间", floor: "F3", role: "service", x: 44.7, y: 53.9, displayLevel: 1 },
      { id: "F3_J11", name: "B楼梯", floor: "F3", role: "elevator", x: 39.4, y: 53.9, displayLevel: 1 },
      { id: "F3_J12", name: "B电梯", floor: "F3", role: "elevator", x: 32.7, y: 53.9, displayLevel: 1 },
      { id: "F3_J13", name: "检验科", floor: "F3", role: "room", x: 34.8, y: 77.5, displayLevel: 2 },
      { id: "F3_J15", name: "D楼梯", floor: "F3", role: "elevator", x: 79.4, y: 12.3, displayLevel: 1 },
      { id: "F3_J16", name: "E洗手间1", floor: "F3", role: "service", x: 88.4, y: 12.0, displayLevel: 1 },
      { id: "F3_J17", name: "E洗手间2", floor: "F3", role: "service", x: 92.3, y: 75.5, displayLevel: 1 },
      { id: "F3_J18", name: "E楼梯", floor: "F3", role: "elevator", x: 92.3, y: 67.1, displayLevel: 1 },
      { id: "F3_J19", name: "路径2", floor: "F3", role: "path", x: 85.2, y: 66.4, visible: false },
      { id: "F3_J20", name: "路径3", floor: "F3", role: "path", x: 85.2, y: 75.9, visible: false },
      { id: "F3_J21", name: "路径4", floor: "F3", role: "path", x: 84.0, y: 12.2, visible: false },
      { id: "F3_J22", name: "路径5", floor: "F3", role: "path", x: 54.6, y: 22.9, visible: false },
      { id: "F3_J23", name: "B洗手间2", floor: "F3", role: "service", x: 38.2, y: 22.4, displayLevel: 1 },
      { id: "F3_J24", name: "B电梯2", floor: "F3", role: "elevator", x: 32.2, y: 22.0, displayLevel: 1 },
      { id: "F3_J25", name: "学术报告区", floor: "F3", role: "room", x: 34.9, y: 12.9, displayLevel: 2 },
      { id: "F3_J26", name: "设备用房区", floor: "F3", role: "room", x: 13.7, y: 12.5, displayLevel: 2 },
      { id: "F3_J27", name: "污染处理", floor: "F3", role: "room", x: 11.9, y: 22.4, displayLevel: 2 },
      { id: "F3_J28", name: "F楼梯", floor: "F3", role: "elevator", x: 20.5, y: 22.4, displayLevel: 1 },
      { id: "F3_J29", name: "体检中心", floor: "F3", role: "room", x: 13.5, y: 36.8, displayLevel: 2 },
      { id: "F3_J30", name: "A洗手间", floor: "F3", role: "service", x: 9.7, y: 48.1, displayLevel: 1 },
      { id: "F3_J31", name: "行政办公区", floor: "F3", role: "room", x: 13.3, y: 65.1, displayLevel: 2 },
      { id: "F3_J32", name: "路径6", floor: "F3", role: "path", x: 26.0, y: 12.2, visible: false },
      { id: "F3_J33", name: "路径7", floor: "F3", role: "path", x: 26.0, y: 22.4, visible: false },
      { id: "F3_J34", name: "路径8", floor: "F3", role: "path", x: 25.9, y: 36.5, visible: false },
      { id: "F3_J35", name: "病理科", floor: "F3", role: "room", x: 35.8, y: 37.0, displayLevel: 2 },
      { id: "F3_J36", name: "路径9", floor: "F3", role: "path", x: 25.8, y: 48.1, visible: false },
      { id: "F3_J37", name: "路径10", floor: "F3", role: "path", x: 26.0, y: 54.2, visible: false },
      { id: "F3_J38", name: "路径11", floor: "F3", role: "path", x: 26.0, y: 64.9, visible: false },
      { id: "F3_J39", name: "路径12", floor: "F3", role: "path", x: 84.8, y: 23.1, visible: false },

      { id: "F4_J1", name: "路径1", floor: "F4", role: "path", x: 84.9, y: 76.2, visible: false },
      { id: "F4_J2", name: "入口", floor: "F4", role: "entrance", x: 51.5, y: 75.7, displayLevel: 1 },
      { id: "F4_J3", name: "路径2", floor: "F4", role: "path", x: 38.2, y: 75.1, visible: false },
      { id: "F4_J5", name: "设备室", floor: "F4", role: "room", x: 84.7, y: 16.6, displayLevel: 2 },
      { id: "F4_J6", name: "路径4", floor: "F4", role: "path", x: 38.2, y: 48.3, visible: false },
      { id: "F4_J7", name: "路径3", floor: "F4", role: "path", x: 38.3, y: 55.2, visible: false },
      { id: "F4_J8", name: "更衣室", floor: "F4", role: "room", x: 48.5, y: 47.7, displayLevel: 2 },
      { id: "F4_J9", name: "谈话间", floor: "F4", role: "room", x: 48.1, y: 55.0, displayLevel: 2 },
      { id: "F4_J10", name: "电梯", floor: "F4", role: "elevator", x: 38.1, y: 38.7, displayLevel: 1 },
      { id: "F4_J11", name: "洗手间", floor: "F4", role: "service", x: 29.4, y: 38.7, displayLevel: 1 },
      { id: "F4_J12", name: "楼梯", floor: "F4", role: "elevator", x: 48.9, y: 38.9, displayLevel: 1 },
      { id: "F4_J13", name: "物品室", floor: "F4", role: "room", x: 48.5, y: 31.8, displayLevel: 2 },
      { id: "F4_J14", name: "准备间", floor: "F4", role: "room", x: 48.5, y: 25.7, displayLevel: 2 },
      { id: "F4_J15", name: "手术室", floor: "F4", role: "room", x: 37.8, y: 15.1, displayLevel: 2 },
],
    edges: [
      ["J0", "J1", 127],
      ["J1", "J42", 82],
      ["J0", "J4", 216],
      ["J4", "J5", 91],
      ["J42", "J8", 211],
      ["J1", "J70", 67],
      ["J70", "J71", 78],
      ["J71", "J3", 65],
      ["J40", "J71", 146],
      ["J41", "J70", 142],
      ["J8", "J9", 66],
      ["J8", "J10", 162],
      ["J10", "J11", 234],
      ["J11", "J12", 110],
      ["J12", "J20", 137],
      ["J20", "J39", 45],
      ["J20", "J21", 96],
      ["J12", "J13", 87],
      ["J13", "J19", 107],
      ["J13", "J14", 189],
      ["J14", "J18", 93],
      ["J14", "J15", 241],
      ["J15", "J37", 109],
      ["J37", "J38", 107],
      ["J15", "J23", 112],
      ["J23", "J24", 97],
      ["J24", "J25", 204],
      ["J23", "J27", 164],
      ["J27", "J29", 53],
      ["J27", "J30", 264],
      ["J30", "J31", 67],
      ["J31", "J34", 104],
      ["J30", "J47", 44],
      ["J47", "J46", 74],
      ["J30", "J32", 94],
      ["J8", "J43", 274],
      ["J43", "J44", 64],
      ["J43", "J48", 106],
      ["J48", "J49", 71],
      ["J48", "J45", 60],
      ["J48", "J50", 151],
      ["J50", "J52", 153],
      ["J50", "J53", 137],
      ["J53", "J54", 85],
      ["J50", "J60", 103],
      ["J60", "J62", 59],
      ["J62", "J61", 108],
      ["J62", "J63", 119],
      ["J63", "J65", 80],
      ["J63", "J64", 113],
      ["J64", "J66", 74],
      ["J64", "J67", 102],
      ["J60", "J69", 132],
      ["J69", "J59", 119],
      ["J68", "J58", 119],
      ["J69", "J68", 97],
      ["J68", "J55", 70],
      ["J55", "J57", 115],
      ["J55", "J56", 73],
      ["F2_J0", "F2_J9", 129],
      ["F2_J9", "F2_J11", 78],
      ["F2_J9", "F2_J13", 73],
      ["F2_J13", "F2_J12", 80],
      ["F2_J12", "F2_J4", 129],
      ["F2_J0", "F2_J2", 240],
      ["F2_J2", "F2_J3", 93],
      ["F2_J12", "F2_J7", 108],
      ["F2_J8", "F2_J13", 106],
      ["F2_J11", "F2_J10", 285],
      ["F2_J10", "F2_J15", 167],
      ["F2_J15", "F2_J48", 110],
      ["F2_J48", "F2_J49", 119],
      ["F2_J49", "F2_J41", 50],
      ["F2_J49", "F2_J50", 109],
      ["F2_J50", "F2_J42", 56],
      ["F2_J50", "F2_J5", 71],
      ["F2_J10", "F2_J14", 87],
      ["F2_J10", "F2_J16", 170],
      ["F2_J16", "F2_J17", 143],
      ["F2_J17", "F2_J33", 112],
      ["F2_J33", "F2_J32", 141],
      ["F2_J32", "F2_J24", 105],
      ["F2_J33", "F2_J22", 176],
      ["F2_J22", "F2_J21", 97],
      ["F2_J22", "F2_J23", 88],
      ["F2_J23", "F2_J19", 52],
      ["F2_J23", "F2_J20", 99],
      ["F2_J22", "F2_J18", 127],
      ["F2_J21", "F2_J1", 133],
      ["F2_J32", "F2_J34", 151],
      ["F2_J34", "F2_J26", 139],
      ["F2_J26", "F2_J25", 103],
      ["F2_J34", "F2_J35", 153],
      ["F2_J35", "F2_J31", 54],
      ["F2_J26", "F2_J27", 102],
      ["F2_J27", "F2_J28", 143],
      ["F2_J28", "F2_J29", 190],
      ["F2_J35", "F2_J36", 276],
      ["F2_J36", "F2_J30", 56],
      ["F2_J36", "F2_J44", 115],
      ["F2_J44", "F2_J45", 117],
      ["F2_J45", "F2_J39", 112],
      ["F2_J44", "F2_J37", 66],
      ["F2_J37", "F2_J38", 87],
      ["F2_J44", "F2_J46", 96],
      ["F2_J46", "F2_J40", 112],
      ["F2_J50", "F2_J59", 192],
      ["F2_J59", "F2_J51", 57],
      ["F2_J59", "F2_J60", 107],
      ["F2_J60", "F2_J43", 58],
      ["F2_J43", "F2_J54", 191],
      ["F2_J60", "F2_J61", 98],
      ["F2_J61", "F2_J53", 104],
      ["F2_J61", "F2_J56", 61],
      ["F2_J60", "F2_J62", 131],
      ["F2_J62", "F2_J64", 52],
      ["F2_J64", "F2_J58", 122],
      ["F2_J64", "F2_J52", 62],
      ["F2_J62", "F2_J63", 96],
      ["F2_J63", "F2_J57", 133],
      ["J40", "F2_J7", 10],
      ["J46", "F2_J38", 10],
      ["J45", "F2_J42", 10],
      ["J37", "F2_J26", 10],
      ["J39", "F2_J19", 10],
    
      ["F3_J0", "F3_J1", 273],
      ["F3_J1", "F3_J7", 135],
      ["F3_J7", "F3_J22", 193],
      ["F3_J22", "F3_J3", 119],
      ["F3_J22", "F3_J23", 237],
      ["F3_J23", "F3_J24", 87],
      ["F3_J3", "F3_J25", 278],
      ["F3_J22", "F3_J39", 438],
      ["F3_J39", "F3_J21", 120],
      ["F3_J21", "F3_J15", 67],
      ["F3_J21", "F3_J16", 64],
      ["F3_J39", "F3_J5", 191],
      ["F3_J5", "F3_J19", 279],
      ["F3_J19", "F3_J18", 103],
      ["F3_J19", "F3_J20", 103],
      ["F3_J20", "F3_J17", 103],
      ["F3_J25", "F3_J32", 129],
      ["F3_J32", "F3_J33", 111],
      ["F3_J33", "F3_J34", 153],
      ["F3_J34", "F3_J35", 143],
      ["F3_J34", "F3_J29", 179],
      ["F3_J28", "F3_J33", 80],
      ["F3_J28", "F3_J27", 125],
      ["F3_J27", "F3_J26", 110],
      ["F3_J34", "F3_J36", 126],
      ["F3_J36", "F3_J30", 233],
      ["F3_J36", "F3_J37", 67],
      ["F3_J37", "F3_J12", 97],
      ["F3_J12", "F3_J11", 97],
      ["F3_J11", "F3_J10", 76],
      ["F3_J37", "F3_J38", 116],
      ["F3_J38", "F3_J31", 185],
      ["F3_J0", "F3_J13", 289],
      ["F2_J38", "F3_J11", 10],
      ["F2_J38", "F3_J12", 10],
      ["F2_J26", "F3_J15", 10],
      ["F2_J19", "F3_J18", 10],

      ["F4_J2", "F4_J1", 484],
      ["F4_J5", "F4_J1", 648],
      ["F4_J2", "F4_J3", 193],
      ["F4_J3", "F4_J7", 217],
      ["F4_J7", "F4_J6", 75],
      ["F4_J6", "F4_J8", 149],
      ["F4_J7", "F4_J9", 141],
      ["F4_J6", "F4_J10", 104],
      ["F4_J10", "F4_J11", 125],
      ["F4_J10", "F4_J12", 157],
      ["F4_J12", "F4_J13", 77],
      ["F4_J13", "F4_J14", 66],
      ["F4_J10", "F4_J15", 256],
      ["F4_J2", "F4_J5", 802],
      ["F3_J12", "F4_J10", 10],
      ["F3_J11", "F4_J12", 10],
]
  }
]);

const state = {
  map: null,
  nodes: [],
  edges: [],
  roads: [],
  spots: [],
  restaurants: [],
  facilities: [],
  users: [],
  diaries: [],
  regionPacks: [],
  currentUserId: null,
  appSettings: {
    theme: "light",
    compactCards: false,
    defaultView: "recommendView",
    defaultRouteMode: "walk",
    defaultDiarySort: "heat"
  },
  aigcConfig: {
    enabled: false,
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    apiKey: ""
  },
  diaryScope: "all",
  diaryPage: 1,
  diaryPageSize: 10,
  markers: new Map(),
  facilityGeoIndex: new Map(),
  spotLshIndex: new Map(),
  diaryLshIndex: new Map(),
  spotInvertedIndex: new Map(),
  diaryInvertedIndex: new Map(),
  diaryTitleIndex: new Map(),
  searchCache: new Map(),
  edgeLayers: [],
  routeLayers: [],
  lastRouteResult: null,
  congestionSeed: "acceptance-20260607",
  userCongestionOverride: new Map(),
  congestionPanelOpen: false,
  poiLayers: [],
  facilityLayers: [],
  selectedNodeId: null,
  mode: "walk",
  routeStrategy: "distance",
  mapBounds: null,
  mapFitted: false,
  mapRegion: "dataset",
  currentRegionPackId: "summer_palace",
  aigc: {
    ready: false,
    configured: false,
    proxyReady: false,
    proxyConfigured: false,
    directConfigured: false,
    storyboard: null,
    videoUrl: ""
  }
};

let lastIndoorRoute = null;
let lastIndoorBuilding = null;
let indoorPlanView = {
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0
};

const byId = (id) => document.getElementById(id);

function recommendationImage(spot, node) {
  const image = resolveAssetPath(node?.image || "");
  if (!image || image.endsWith(".svg")) return fallbackImageForSpot(spot);
  return image;
}

function restaurantCardImage(restaurant, nearNode) {
  if (restaurant?.image) return resolveAssetPath(restaurant.image);
  const image = resolveAssetPath(nearNode?.image || "");
  if (!image || image.endsWith(".svg")) return fallbackImageForSpot(findSpot(restaurant?.near_spot_id) || {});
  return image;
}

function fallbackImageForSpot(spot) {
  const text = `${spot.category || ""} ${spot.tags || ""}`;
  if (/建筑|历史|文化|室内|讲解|展览|地标/.test(text)) return BUILDING_IMAGE;
  return LANDSCAPE_IMAGE;
}

function focusNode(id) {
  const node = findNode(id);
  if (!node) return;
  showNodeDetail(node);
  const marker = state.markers.get(node.id);
  if (state.map) state.map.setView([node.lat, node.lon], 17);
  if (marker) marker.openPopup();
}

function selectedUser() {
  const userIdRaw = state.currentUserId || byId("userSelect").value;
  const id = userIdRaw !== "" ? Number(userIdRaw) : 1;
  return state.users.find((user) => Number(user.id) === id);
}

function matchesSpotSearch(spot, keyword) {
  if (!keyword) return true;
  return keyword
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => kmpContains(spotSearchText(spot), token));
}

function spotSearchText(spot) {
  return textOfSpot(spot).toLowerCase();
}

function textOfSpot(spot) {
  const node = findNodeBySpot(spot.id);
  return [
    spot.name,
    spot.category,
    spot.tags,
    node?.name,
    node?.type,
    node?.description
  ].filter(Boolean).join(" ");
}

function spotSortScore(sortMode, compositeScore, ratingScore, heatScore, interestScore) {
  if (sortMode === "heat") return heatScore;
  if (sortMode === "rating") return ratingScore;
  if (sortMode === "interest") return interestScore;
  return compositeScore;
}

function recommendSortLabel(sortMode) {
  if (sortMode === "heat") return "人气优先";
  if (sortMode === "rating") return "口碑优先";
  if (sortMode === "interest") return "偏好优先";
  return "综合推荐";
}

function topK(items, limit, scoreOf) {
  const heap = [];
  items.forEach((item) => {
    const score = scoreOf(item);
    if (heap.length < limit) {
      heapPush(heap, { item, score });
    } else if (score > heap[0].score) {
      heap[0] = { item, score };
      heapSink(heap, 0);
    }
  });
  return heap
    .map((entry) => entry.item)
    .sort((a, b) => scoreOf(b) - scoreOf(a));
}

function heapPush(heap, entry) {
  heap.push(entry);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].score <= heap[index].score) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function heapSink(heap, index) {
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let smallest = index;
    if (left < heap.length && heap[left].score < heap[smallest].score) smallest = left;
    if (right < heap.length && heap[right].score < heap[smallest].score) smallest = right;
    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
}

function buildSimilarityIndexes() {
  state.searchCache.clear();
  state.spotLshIndex = buildLshIndex(state.spots, (spot) => `${spot.name} ${spot.category} ${spot.tags}`);
  state.diaryLshIndex = buildLshIndex(state.diaries, textOfDiary);
  state.spotInvertedIndex = buildInvertedIndex(state.spots, textOfSpot);
  state.diaryInvertedIndex = buildInvertedIndex(state.diaries, textOfDiary);
  buildDiaryTitleIndex();
}

function buildDiaryTitleIndex() {
  state.diaryTitleIndex.clear();
  state.diaries.forEach((diary) => {
    const key = String(diary.title || "").trim().toLowerCase();
    if (!key) return;
    if (!state.diaryTitleIndex.has(key)) state.diaryTitleIndex.set(key, []);
    state.diaryTitleIndex.get(key).push(diary);
  });
}

function buildLshIndex(items, textOfItem) {
  const index = new Map();
  items.forEach((item) => {
    const signature = simhashSignature(textOfItem(item));
    lshBandKeys(signature).forEach((key) => {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(item);
    });
  });
  return index;
}

function buildInvertedIndex(items, textOfItem) {
  const index = new Map();
  items.forEach((item) => {
    tokenizeFeatureText(textOfItem(item)).forEach((token) => {
      if (!index.has(token)) index.set(token, []);
      index.get(token).push(item);
    });
  });
  return index;
}

function invertedIndexCandidates(index, query, fallbackItems) {
  const tokens = tokenizeFeatureText(query);
  if (!tokens.length || !index.size) return fallbackItems;
  const fallbackKey = fallbackItems.map((item) => item.id ?? item.filename ?? `${item.title}|${item.destination}`).join(",");
  const cacheKey = `${index === state.spotInvertedIndex ? "spot" : "diary"}:${tokens.join("|")}:${fallbackKey}`;
  if (state.searchCache.has(cacheKey)) return state.searchCache.get(cacheKey);
  const counts = new Map();
  tokens.forEach((token) => {
    (index.get(token) || []).forEach((item) => {
      const id = item.id ?? `${item.title}|${item.destination}`;
      counts.set(id, { item, count: (counts.get(id)?.count || 0) + 1 });
    });
  });
  const candidates = Array.from(counts.values())
    .filter((entry) => entry.count >= Math.min(tokens.length, 2))
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.item);
  const result = candidates.length ? candidates : fallbackItems;
  state.searchCache.set(cacheKey, result);
  return result;
}

function getLshCandidates(index, query, fallbackItems, minimum = 10) {
  const tokens = tokenizeInterest(query);
  if (!tokens.length || !index.size) return fallbackItems;
  const signature = simhashSignature(tokens.join(" "));
  const seen = new Set();
  const candidates = [];
  lshBandKeys(signature).forEach((key) => {
    (index.get(key) || []).forEach((item) => {
      const id = item.id ?? `${item.title}|${item.destination}`;
      if (seen.has(id)) return;
      seen.add(id);
      candidates.push(item);
    });
  });
  return candidates.length >= minimum ? candidates : fallbackItems;
}

function simhashSignature(text) {
  const weights = Array(32).fill(0);
  const tokens = tokenizeFeatureText(text);
  if (!tokens.length) return 0;
  tokens.forEach((token) => {
    const hash = hashString32(token);
    for (let bit = 0; bit < 32; bit += 1) {
      weights[bit] += (hash >>> bit) & 1 ? 1 : -1;
    }
  });
  return weights.reduce((signature, weight, bit) => (
    weight >= 0 ? (signature | (1 << bit)) : signature
  ), 0) >>> 0;
}

function lshBandKeys(signature) {
  const keys = [];
  for (let band = 0; band < 4; band += 1) {
    const value = (signature >>> (band * 8)) & 0xff;
    keys.push(`b${band}:${value.toString(16).padStart(2, "0")}`);
  }
  return keys;
}

function tokenizeFeatureText(value) {
  const tokens = tokenizeInterest(value);
  const compact = String(value || "").replace(/\s+/g, "");
  for (let index = 0; index < compact.length - 1; index += 1) {
    tokens.push(compact.slice(index, index + 2).toLowerCase());
  }
  return tokens.filter((token, index, list) => list.indexOf(token) === index);
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function kmpContains(text, pattern) {
  if (!pattern) return true;
  const next = kmpTable(pattern);
  for (let index = 0, matched = 0; index < text.length; index += 1) {
    while (matched > 0 && text[index] !== pattern[matched]) matched = next[matched - 1];
    if (text[index] === pattern[matched]) matched += 1;
    if (matched === pattern.length) return true;
  }
  return false;
}

function kmpTable(pattern) {
  const next = Array(pattern.length).fill(0);
  for (let index = 1, matched = 0; index < pattern.length; index += 1) {
    while (matched > 0 && pattern[index] !== pattern[matched]) matched = next[matched - 1];
    if (pattern[index] === pattern[matched]) matched += 1;
    next[index] = matched;
  }
  return next;
}

const INTEREST_AFFINITY_GROUPS = [
  {
    keys: ["历史", "建筑", "室内", "宫殿", "古建"],
    related: ["文化", "展览", "地标", "遗址", "院落", "古典"]
  },
  {
    keys: ["湖景", "拍照", "夕阳", "观景", "地标"],
    related: ["自然", "水域", "桥", "长廊", "山景", "昆明湖", "视野"]
  },
  {
    keys: ["安静", "园林", "低拥挤", "休闲"],
    related: ["自然", "花园", "步行", "树荫", "院落", "慢游"]
  },
  {
    keys: ["亲子", "服务", "轻松", "入口", "交通"],
    related: ["休息", "餐饮", "卫生间", "补给", "游客服务", "无障碍"]
  },
  {
    keys: ["购物", "体验", "文化", "美食"],
    related: ["街区", "餐饮", "店铺", "市集", "互动", "文创"]
  }
];

function spotInterestScore(spot, preference, categoryPreference = "") {
  const text = `${spot.name} ${spot.category} ${spot.tags}`;
  const directScore = tagScore(text, preference);
  const categoryScore = categoryPreference ? tagScore(`${spot.category} ${spot.tags}`, categoryPreference) : 0.55;
  const categoryEcho = tokenizeInterest(`${preference} ${categoryPreference}`)
    .some((token) => String(spot.category || "").toLowerCase().includes(token) || String(spot.tags || "").toLowerCase().includes(token))
    ? 0.78
    : 0.48;

  return clamp(0.72 * directScore + 0.18 * categoryScore + 0.1 * categoryEcho, 0.24, 0.98);
}

function recommendationIntentScore(spot, query) {
  const tokens = tokenizeInterest(query);
  if (!tokens.length) return 0.55;
  const text = spotSearchText(spot);
  const exactHits = tokens.filter((token) => text.includes(token)).length;
  const partialHits = tokens.filter((token) =>
    String(spot.name || "").toLowerCase().includes(token)
    || String(spot.category || "").toLowerCase().includes(token)
    || String(spot.tags || "").toLowerCase().includes(token)
  ).length;
  const relatedHits = tokens.reduce((total, token) => total + relatedInterestHit(token, text), 0);
  const exactRatio = exactHits / tokens.length;
  const partialRatio = partialHits / tokens.length;
  const relatedRatio = relatedHits / tokens.length;
  const texture = stableFraction(`${spot.id}|${query}`) * 0.04;
  return clamp(0.2 + 0.46 * exactRatio + 0.22 * partialRatio + 0.12 * relatedRatio + texture, 0.16, 0.99);
}

function tagScore(text, preference) {
  const tokens = tokenizeInterest(preference);
  if (!tokens.length) return 0.55;

  const source = String(text || "").toLowerCase();
  const exactHits = tokens.filter((token) => source.includes(token)).length;
  const exactRatio = exactHits / tokens.length;
  const affinityRatio = tokens.reduce((total, token) => total + relatedInterestHit(token, source), 0) / tokens.length;
  const coverage = Math.min(1, (exactHits + affinityRatio) / 3);
  const texture = stableFraction(`${source}|${tokens.join("|")}`) - 0.5;
  const rawScore = 0.3 + 0.42 * exactRatio + 0.18 * affinityRatio + 0.08 * coverage + texture * 0.06;

  return clamp(rawScore, 0.24, 0.98);
}

function tokenizeInterest(value) {
  return String(value || "")
    .split(/[\s,\uFF0C\u3001/;；|]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .filter((token, index, tokens) => tokens.indexOf(token) === index);
}

function relatedInterestHit(token, source) {
  const group = INTEREST_AFFINITY_GROUPS.find((item) =>
    item.keys.some((key) => token.includes(key.toLowerCase()) || key.toLowerCase().includes(token))
  );
  if (!group) return 0;
  if (group.keys.some((key) => source.includes(key.toLowerCase()))) return 0.8;
  if (group.related.some((key) => source.includes(key.toLowerCase()))) return 0.55;
  return 0;
}

function stableFraction(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function textOfNode(node) {
  return `${node.name} ${node.type} ${node.description || ""}`;
}

function textOfFacility(facility) {
  return `${facility.name} ${facility.type} ${facility.tags || ""}`;
}

function facilityIconText(type) {
  const iconMap = {
    "卫生间": "卫",
    "商店": "店",
    "游客服务": "服",
    "饮水点": "水",
    "休息亭": "休",
    "停车场": "停",
    "售票处": "票",
    "安检口": "检",
    "急救点": "医",
    "纪念品店": "礼",
    "观景台": "景",
    "地铁站": "站"
  };
  return iconMap[type] || "设";
}

function facilityMarkerClass(type) {
  if (["卫生间", "饮水点", "急救点"].includes(type)) return "facility-blue";
  if (["商店", "纪念品店", "售票处"].includes(type)) return "facility-orange";
  if (["游客服务", "休息亭", "观景台"].includes(type)) return "facility-green";
  return "facility-neutral";
}

function textOfRestaurant(restaurant) {
  const spot = findSpot(restaurant.near_spot_id);
  return `${restaurant.name} ${restaurant.cuisine} ${spot?.name || ""}`;
}

function textOfDiary(diary) {
  return `${diary.title} ${diary.destination} ${(diary.tags || []).join(" ")} ${diary.content}`;
}

function averageLatLng(nodes) {
  if (!nodes || nodes.length === 0) return [39.9, 116.4]; // default: Beijing center
  const sum = nodes.reduce((acc, node) => {
    acc.lat += Number(node.lat || 0);
    acc.lon += Number(node.lon || 0);
    return acc;
  }, { lat: 0, lon: 0 });
  return [sum.lat / nodes.length, sum.lon / nodes.length];
}

function findNode(id) {
  return state.nodes.find((node) => Number(node.id) === Number(id));
}

function findSpot(id) {
  return state.spots.find((spot) => Number(spot.id) === Number(id));
}

function findNodeBySpot(spotId) {
  return state.nodes.find((node) => Number(node.spot_id) === Number(spotId));
}

function formatCoordinate(value) {
  return Number(value).toFixed(5);
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && value !== "")));
}

function resolveAssetPath(image) {
  if (!image) return FALLBACK_IMAGE;
  if (image.startsWith("web/")) return `./${image.slice(4)}`;
  if (image.startsWith("assets/")) return `./${image}`;
  if (image.startsWith("./") || image.startsWith("../") || image.startsWith("http")) return image;
  return `./${image}`;
}

function haversineM(a, b) {
  const rad = Math.PI / 180;
  const dlat = (Number(b.lat) - Number(a.lat)) * rad;
  const dlon = (Number(b.lon) - Number(a.lon)) * rad;
  const lat1 = Number(a.lat) * rad;
  const lat2 = Number(b.lat) * rad;
  const h = Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function offlineTileUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#eef4ff"/>
      <path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#dce6f7" stroke-width="1"/>
      <path d="M18 214C70 170 96 184 132 148C169 112 199 120 238 82" fill="none" stroke="#b9d2cc" stroke-width="8" stroke-linecap="round" opacity=".62"/>
      <path d="M-10 96C42 70 73 80 112 55C152 30 190 34 266 20" fill="none" stroke="#c8e0da" stroke-width="6" stroke-linecap="round" opacity=".45"/>
      <circle cx="78" cy="126" r="3" fill="#8aa2b7" opacity=".65"/>
      <circle cx="168" cy="92" r="3" fill="#8aa2b7" opacity=".65"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
