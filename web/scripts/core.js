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
    source: "课程模拟楼层图，可替换为授权平面图",
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
    source: "课程模拟服务中心室内节点，可替换为公开授权图",
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
    name: "颐和园文昌院展厅",
    source: "基于景区文昌院展陈空间进行抽象建模，后续可替换为授权平面图。",
    sourceUrl: "https://www.summerpalace-china.com/",
    floors: ["2F", "1F"],
    nodes: [
      { id: "gate", name: "文昌院入口", floor: "1F", x: 12, y: 74 },
      { id: "lobby", name: "序厅导览台", floor: "1F", x: 30, y: 74 },
      { id: "court", name: "中庭过厅", floor: "1F", x: 48, y: 74 },
      { id: "stair1", name: "楼梯/电梯", floor: "1F", x: 66, y: 74 },
      { id: "stair2", name: "二层连廊", floor: "2F", x: 66, y: 30 },
      { id: "gallery", name: "文物展厅", floor: "2F", x: 46, y: 30 },
      { id: "digital", name: "数字展映室", floor: "2F", x: 24, y: 30 },
      { id: "exit", name: "庭院出口", floor: "1F", x: 86, y: 74 }
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
    source: "参考清华大学医院官方医院示意图建模，含南楼与北楼功能分布。",
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
    id: "pku_library",
    name: "北京大学图书馆",
    source: "参考北京大学图书馆官方平面图与馆藏空间分布建模，覆盖咨询、借还、自助、阅览与楼层交通。",
    sourceUrl: "https://www.lib.pku.edu.cn/3wxbz/index.htm",
    floors: ["4F", "3F", "2F", "1F"],
    nodes: [
      { id: "east_gate", name: "东门咨询台", floor: "1F", x: 12, y: 82 },
      { id: "service", name: "借还总台", floor: "1F", x: 30, y: 82 },
      { id: "cards", name: "证卡处", floor: "1F", x: 48, y: 82 },
      { id: "lift1", name: "电梯/楼梯", floor: "1F", x: 68, y: 82 },
      { id: "lift2", name: "二层交通核", floor: "2F", x: 68, y: 58 },
      { id: "science", name: "自然科学阅览厅", floor: "2F", x: 42, y: 58 },
      { id: "philosophy", name: "哲学阅览室", floor: "2F", x: 20, y: 58 },
      { id: "lift3", name: "三层交通核", floor: "3F", x: 68, y: 34 },
      { id: "literature", name: "文学阅览室", floor: "3F", x: 42, y: 34 },
      { id: "lift4", name: "四层交通核", floor: "4F", x: 68, y: 14 },
      { id: "rare_books", name: "古籍阅览区", floor: "4F", x: 38, y: 14 }
    ],
    edges: [
      ["east_gate", "service", 12],
      ["service", "cards", 12],
      ["cards", "lift1", 14],
      ["lift1", "lift2", 9],
      ["lift2", "science", 16],
      ["science", "philosophy", 18],
      ["lift2", "lift3", 9],
      ["lift3", "literature", 16],
      ["lift3", "lift4", 9],
      ["lift4", "rare_books", 18],
      ["service", "science", 42]
    ]
  },
  {
    id: "palace_route",
    name: "故宫博物院开放区",
    source: "参考故宫博物院官方导览页的开放区域与自南向北参观动线建模，用于景点室内/半室内路线演示。",
    sourceUrl: "https://www.dpm.org.cn/Visit.html",
    floors: ["北区", "中区", "南区"],
    nodes: [
      { id: "wumen", name: "午门入口", floor: "南区", x: 12, y: 82 },
      { id: "taihemen", name: "太和门", floor: "南区", x: 30, y: 82 },
      { id: "taihedian", name: "太和殿", floor: "中区", x: 45, y: 58 },
      { id: "zhonghe", name: "中和殿", floor: "中区", x: 60, y: 58 },
      { id: "baohe", name: "保和殿", floor: "中区", x: 75, y: 58 },
      { id: "qianqing", name: "乾清宫", floor: "北区", x: 56, y: 28 },
      { id: "jiaotai", name: "交泰殿", floor: "北区", x: 72, y: 28 },
      { id: "shenwu", name: "神武门出口", floor: "北区", x: 88, y: 28 }
    ],
    edges: [
      ["wumen", "taihemen", 18],
      ["taihemen", "taihedian", 20],
      ["taihedian", "zhonghe", 12],
      ["zhonghe", "baohe", 12],
      ["baohe", "qianqing", 22],
      ["qianqing", "jiaotai", 12],
      ["jiaotai", "shenwu", 14],
      ["taihemen", "qianqing", 56]
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
    storyboard: null,
    videoUrl: ""
  }
};

let lastIndoorRoute = null;
let lastIndoorBuilding = null;

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
