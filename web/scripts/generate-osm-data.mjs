import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const dataDir = path.join(repoRoot, "cpp", "data");

const IMAGE_POOL = [
  "web/assets/spots/visitor-center.svg",
  "web/assets/spots/lakeside-plaza.svg",
  "web/assets/spots/cherry-road.svg",
  "web/assets/spots/museum.svg",
  "web/assets/spots/view-tower.svg",
  "web/assets/spots/pier.svg",
  "web/assets/spots/bamboo.svg",
  "web/assets/spots/folk-street.svg",
  "web/assets/spots/wetland.svg",
  "web/assets/spots/camp-lawn.svg",
  "web/assets/spots/bookstore.svg",
  "web/assets/spots/sports-station.svg"
];

const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

const SCENES = {
  "summer-palace": {
    label: "北京颐和园",
    bbox: [39.9850, 116.2550, 40.0120, 116.3050],
    targetRoadNodes: 208,
    namedNodes: [
      { id: 1, name: "颐和园东宫门", lat: 39.9973, lon: 116.2753, type: "gate", spot_id: 1, description: "颐和园东宫门是游客入园和路线规划的主要起点，适合连接仁寿殿、德和园和昆明湖东堤。", image: IMAGE_POOL[0] },
      { id: 2, name: "仁寿殿", lat: 39.9994, lon: 116.2740, type: "building", spot_id: 2, description: "仁寿殿是清代皇家园林的政务活动空间，适合文化类推荐和室内参观。", image: IMAGE_POOL[3] },
      { id: 3, name: "德和园", lat: 39.9987, lon: 116.2720, type: "building", spot_id: 3, description: "德和园以戏楼和园林院落著称，适合对戏曲、建筑和历史感兴趣的游客。", image: IMAGE_POOL[10] },
      { id: 4, name: "长廊东口", lat: 39.9982, lon: 116.2695, type: "path", spot_id: 4, description: "长廊连接东部建筑群和万寿山前景区，是步行游览的核心通道。", image: IMAGE_POOL[2] },
      { id: 5, name: "排云门", lat: 39.9991, lon: 116.2665, type: "junction", spot_id: 5, description: "排云门位于万寿山中轴线上，是前往佛香阁和昆明湖的重要节点。", image: IMAGE_POOL[1] },
      { id: 6, name: "佛香阁", lat: 39.9997, lon: 116.2662, type: "landmark", spot_id: 6, description: "佛香阁是颐和园标志性建筑，可俯瞰昆明湖和长堤景观。", image: IMAGE_POOL[4] },
      { id: 7, name: "石舫", lat: 40.0007, lon: 116.2630, type: "landmark", spot_id: 7, description: "石舫位于昆明湖北岸，适合拍照、休息和湖岸路线衔接。", image: IMAGE_POOL[5] },
      { id: 8, name: "苏州街入口", lat: 40.0046, lon: 116.2638, type: "poi", spot_id: 8, description: "苏州街入口连接后湖商业街区，适合文化体验、美食和文创购物推荐。", image: IMAGE_POOL[7] },
      { id: 9, name: "北宫门", lat: 40.0061, lon: 116.2636, type: "gate", spot_id: 9, description: "北宫门靠近地铁和外部服务区，适合作为返程或多点游览终点。", image: IMAGE_POOL[0] },
      { id: 10, name: "万寿山后湖", lat: 40.0048, lon: 116.2676, type: "waterfront", spot_id: 10, description: "后湖区域较安静，适合避开高峰人流的休闲路线。", image: IMAGE_POOL[8] },
      { id: 11, name: "昆明湖东堤", lat: 39.9926, lon: 116.2715, type: "path", spot_id: 11, description: "昆明湖东堤视野开阔，适合拍照、骑行和湖岸观景。", image: IMAGE_POOL[1] },
      { id: 12, name: "知春亭", lat: 39.9949, lon: 116.2739, type: "landmark", spot_id: 12, description: "知春亭临近昆明湖，是连接东宫门和湖岸景观的轻量停留点。", image: IMAGE_POOL[8] },
      { id: 13, name: "十七孔桥", lat: 39.9887, lon: 116.2772, type: "bridge", spot_id: 13, description: "十七孔桥是昆明湖最具辨识度的桥梁景观，适合夕阳和摄影路线。", image: IMAGE_POOL[4] },
      { id: 14, name: "南湖岛", lat: 39.9893, lon: 116.2753, type: "island", spot_id: 14, description: "南湖岛通过十七孔桥与东堤相连，适合安排湖区环线。", image: IMAGE_POOL[5] },
      { id: 15, name: "西堤", lat: 39.9928, lon: 116.2608, type: "path", spot_id: 15, description: "西堤横贯昆明湖西侧，适合长距离步行和低拥挤度路线。", image: IMAGE_POOL[6] },
      { id: 16, name: "谐趣园", lat: 40.0023, lon: 116.2706, type: "garden", spot_id: 16, description: "谐趣园有江南园林风格，适合文化、建筑和安静游览偏好。", image: IMAGE_POOL[6] },
      { id: 17, name: "乐寿堂", lat: 39.9989, lon: 116.2727, type: "building", spot_id: 17, description: "乐寿堂靠近核心建筑群，适合和仁寿殿、德和园一起推荐。", image: IMAGE_POOL[3] },
      { id: 18, name: "文昌院", lat: 39.9966, lon: 116.2769, type: "museum", spot_id: 18, description: "文昌院适合室内展陈、文物和雨天备选路线。", image: IMAGE_POOL[10] },
      { id: 19, name: "铜牛广场", lat: 39.9910, lon: 116.2777, type: "square", spot_id: 19, description: "铜牛广场位于湖区东南侧，可作为十七孔桥和东堤之间的休息点。", image: IMAGE_POOL[9] },
      { id: 20, name: "新建宫门", lat: 39.9904, lon: 116.2818, type: "gate", spot_id: 20, description: "新建宫门临近外部交通与服务设施，适合作为南侧入园起点。", image: IMAGE_POOL[0] }
    ],
    namedEdges: [
      [1, 2, "东宫门入园路"], [2, 17, "仁寿殿联络路"], [17, 3, "乐寿堂德和园路"],
      [3, 4, "德和园长廊路"], [4, 5, "长廊步行路"], [5, 6, "排云门登高路"],
      [6, 7, "万寿山湖岸路"], [7, 8, "后湖苏州街路"], [8, 9, "苏州街北宫门路"],
      [8, 10, "后湖环线"], [10, 16, "谐趣园后湖路"], [16, 3, "谐趣园联络路"],
      [1, 18, "东宫门文昌院路"], [18, 12, "文昌院知春亭路"], [12, 11, "知春亭东堤路"],
      [11, 19, "昆明湖东堤"], [19, 13, "铜牛十七孔桥路"], [13, 14, "十七孔桥"],
      [14, 15, "南湖岛西堤联络路"], [15, 7, "西堤石舫路"], [11, 4, "东堤长廊联络路"],
      [20, 19, "新建宫门铜牛路"], [20, 13, "新建宫门十七孔桥路"], [1, 12, "东宫门知春亭路"]
    ]
  }
};

const sceneId = process.argv[2] || "summer-palace";
const scene = SCENES[sceneId];
if (!scene) {
  throw new Error(`Unknown scene "${sceneId}". Available scenes: ${Object.keys(SCENES).join(", ")}`);
}

const [south, west, north, east] = scene.bbox;
const query = `[out:json][timeout:40];
way["highway"~"footway|path|pedestrian|cycleway|service|residential|living_street|unclassified|tertiary"](${south},${west},${north},${east});
(._;>;);
out body qt;`;

function pushBidirectional(edges, from, to, distance, mode, roadName) {
  edges.push({ from, to, distance: round(distance, 1), mode, road_name: roadName });
  edges.push({ from: to, to: from, distance: round(distance, 1), mode, road_name: roadName });
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function offsetPoint(base, index, step = 0.00018) {
  const ring = Math.floor(index / 8) + 1;
  const angle = (index % 8) * Math.PI / 4;
  return {
    lat: round(clamp(base.lat + Math.sin(angle) * step * ring, south, north), 6),
    lon: round(clamp(base.lon + Math.cos(angle) * step * ring, west, east), 6)
  };
}

function haversineM(a, b) {
  const rad = Math.PI / 180;
  const dlat = (b.lat - a.lat) * rad;
  const dlon = (b.lon - a.lon) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function fetchOverpass() {
  const body = new URLSearchParams({ data: query });
  let lastError = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": "PersonalizationTripSystem-course-demo/2.0 (local data generation)" },
        body
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${endpoint} ${response.status}: ${text.slice(0, 180)}`);
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      console.warn(`Overpass endpoint failed: ${endpoint}: ${error.message}`);
    }
  }
  throw lastError || new Error("No Overpass endpoint responded");
}

function buildRoadGraph(overpass) {
  const osmNodes = new Map();
  const osmWays = [];
  for (const element of overpass.elements || []) {
    if (element.type === "node") {
      osmNodes.set(element.id, { osmId: element.id, lat: element.lat, lon: element.lon, tags: element.tags || {} });
    } else if (element.type === "way" && Array.isArray(element.nodes) && element.tags?.highway) {
      osmWays.push(element);
    }
  }

  const graph = new Map();
  const nodeMeta = new Map();
  const segments = [];
  for (const way of osmWays) {
    const tags = way.tags || {};
    const roadName = tags.name || highwayLabel(tags.highway) || `OSM way ${way.id}`;
    const mode = tags.highway === "cycleway" ? "bike" : "both";
    for (let i = 1; i < way.nodes.length; ++i) {
      const from = way.nodes[i - 1];
      const to = way.nodes[i];
      if (!osmNodes.has(from) || !osmNodes.has(to)) continue;
      addGraphEdge(graph, from, to);
      segments.push({ from, to, roadName, mode, highway: tags.highway || "road" });
      if (!nodeMeta.has(from)) nodeMeta.set(from, { roadName, highway: tags.highway || "road" });
      if (!nodeMeta.has(to)) nodeMeta.set(to, { roadName, highway: tags.highway || "road" });
    }
  }

  return { osmNodes, graph, nodeMeta, segments };
}

function highwayLabel(highway) {
  const labels = {
    footway: "步行路",
    path: "小径",
    pedestrian: "步行街",
    cycleway: "骑行道",
    service: "服务道路",
    residential: "社区道路",
    living_street: "生活街区道路",
    unclassified: "道路",
    tertiary: "三级道路"
  };
  return labels[highway] || highway || "道路";
}

function addGraphEdge(graph, a, b) {
  if (!graph.has(a)) graph.set(a, new Set());
  if (!graph.has(b)) graph.set(b, new Set());
  graph.get(a).add(b);
  graph.get(b).add(a);
}

function largestComponent(graph) {
  const seen = new Set();
  let best = [];
  for (const start of graph.keys()) {
    if (seen.has(start)) continue;
    const component = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const current = queue.shift();
      component.push(current);
      for (const next of graph.get(current) || []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    if (component.length > best.length) best = component;
  }
  return best;
}

function selectOsmNodes(osmNodes, graph) {
  const component = largestComponent(graph);
  if (component.length < scene.targetRoadNodes) {
    throw new Error(`Only ${component.length} connected OSM nodes found; need ${scene.targetRoadNodes}`);
  }
  const center = averagePoint(scene.namedNodes);
  let seed = component[0];
  let seedDistance = Infinity;
  for (const osmId of component) {
    const distance = haversineM(center, osmNodes.get(osmId));
    if (distance < seedDistance) {
      seed = osmId;
      seedDistance = distance;
    }
  }

  const inComponent = new Set(component);
  const selected = [];
  const seen = new Set([seed]);
  const queue = [seed];
  while (queue.length && selected.length < scene.targetRoadNodes) {
    const current = queue.shift();
    selected.push(current);
    const neighbors = Array.from(graph.get(current) || [])
      .filter((id) => inComponent.has(id))
      .sort((a, b) => {
        const da = haversineM(center, osmNodes.get(a));
        const db = haversineM(center, osmNodes.get(b));
        return da - db || a - b;
      });
    for (const next of neighbors) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return selected.slice(0, scene.targetRoadNodes);
}

function buildOsmOutput(overpass) {
  const { osmNodes, graph, nodeMeta, segments } = buildRoadGraph(overpass);
  const selectedOsmIds = selectOsmNodes(osmNodes, graph);
  const selected = new Set(selectedOsmIds);
  const localIdByOsmId = new Map();
  const nodes = [...scene.namedNodes];

  selectedOsmIds.forEach((osmId, index) => {
    const localId = scene.namedNodes.length + 1 + index;
    localIdByOsmId.set(osmId, localId);
    const osmNode = osmNodes.get(osmId);
    const meta = nodeMeta.get(osmId) || {};
    nodes.push({
      id: localId,
      name: `${highwayLabel(meta.highway)}节点${index + 1}`,
      lat: round(osmNode.lat, 6),
      lon: round(osmNode.lon, 6),
      type: meta.highway || "road",
      spot_id: 0,
      description: `来自 OpenStreetMap 的真实道路节点，OSM node id ${osmId}，关联道路：${meta.roadName || "未命名道路"}。`,
      image: IMAGE_POOL[index % IMAGE_POOL.length]
    });
  });

  const edges = [];
  for (const [from, to, roadName] of scene.namedEdges) {
    const a = nodes.find((node) => node.id === from);
    const b = nodes.find((node) => node.id === to);
    pushBidirectional(edges, from, to, Math.max(30, haversineM(a, b) * 1.18), "both", roadName);
  }

  const pairSeen = new Set();
  for (const segment of segments) {
    if (!selected.has(segment.from) || !selected.has(segment.to)) continue;
    const from = localIdByOsmId.get(segment.from);
    const to = localIdByOsmId.get(segment.to);
    const key = from < to ? `${from}:${to}` : `${to}:${from}`;
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);
    const a = osmNodes.get(segment.from);
    const b = osmNodes.get(segment.to);
    pushBidirectional(edges, from, to, haversineM(a, b), segment.mode, segment.roadName);
  }

  for (const named of scene.namedNodes) {
    let nearest = null;
    let bestDistance = Infinity;
    for (const osmId of selectedOsmIds) {
      const distance = haversineM(named, osmNodes.get(osmId));
      if (distance < bestDistance) {
        nearest = localIdByOsmId.get(osmId);
        bestDistance = distance;
      }
    }
    pushBidirectional(edges, named.id, nearest, Math.max(20, bestDistance), "both", "景点接入真实路网");
  }

  return { nodes, edges };
}

function buildSpots() {
  const extra = [
    ["智慧导览服务中心", "服务", "咨询,导览,入口", 4.3, 780],
    ["长廊彩画讲解点", "文化", "彩画,讲解,历史", 4.5, 840],
    ["昆明湖观景台", "观景", "湖景,拍照,休闲", 4.7, 1010],
    ["后湖安静步道", "自然", "徒步,低拥挤,树荫", 4.4, 690]
  ];
  const base = scene.namedNodes.map((node) => ({
    id: node.spot_id,
    name: node.name,
    category: spotCategory(node.type),
    rating: round(4.1 + ((node.id * 7) % 9) / 10, 1),
    heat: 520 + ((node.id * 137) % 820),
    tags: spotTags(node)
  }));
  return base.concat(extra.map(([name, category, tags, rating, heat], index) => ({
    id: scene.namedNodes.length + index + 1,
    name,
    category,
    rating,
    heat,
    tags
  })));
}

function spotCategory(type) {
  const categories = {
    gate: "出入口",
    building: "建筑",
    landmark: "景点",
    path: "道路",
    junction: "道路",
    poi: "文化",
    waterfront: "自然",
    bridge: "景点",
    island: "自然",
    garden: "园林",
    museum: "文化",
    square: "服务"
  };
  return categories[type] || "景点";
}

function spotTags(node) {
  const tags = {
    gate: "入口,交通,服务",
    building: "建筑,历史,室内",
    landmark: "地标,拍照,观景",
    path: "步行,路线,湖景",
    junction: "路线,中转,登高",
    poi: "文化,购物,体验",
    waterfront: "湖景,安静,休闲",
    bridge: "桥梁,摄影,夕阳",
    island: "湖区,环线,拍照",
    garden: "园林,安静,文化",
    museum: "展陈,室内,文物",
    square: "休息,补给,拍照"
  };
  return tags[node.type] || "旅游,推荐";
}

function buildRoads(spots) {
  const roads = [];
  for (const [from, to] of scene.namedEdges) {
    if (from <= spots.length && to <= spots.length) {
      const a = scene.namedNodes.find((node) => node.spot_id === from);
      const b = scene.namedNodes.find((node) => node.spot_id === to);
      const distance = a && b ? Math.max(30, haversineM(a, b) * 1.18) : 180;
      roads.push({ from, to, dist_walk: round(distance, 1), dist_bike: round(distance * 0.78, 1) });
    }
  }
  roads.push(
    { from: 21, to: 1, dist_walk: 90, dist_bike: 75 },
    { from: 22, to: 4, dist_walk: 120, dist_bike: 95 },
    { from: 23, to: 11, dist_walk: 80, dist_bike: 65 },
    { from: 24, to: 10, dist_walk: 110, dist_bike: 90 }
  );
  return roads;
}

function buildFacilities(overpass) {
  const types = [
    "卫生间", "游客服务", "售票处", "纪念品店", "饮水点", "急救点",
    "停车场", "地铁站", "休息亭", "观景台", "商店", "安检口"
  ];
  const osmPois = collectPois(overpass).filter((poi) => !isFoodAmenity(poi.tags));
  const facilities = [];
  for (let i = 0; i < 60; ++i) {
    const anchor = scene.namedNodes[i % scene.namedNodes.length];
    const poi = osmPois[i % Math.max(1, osmPois.length)];
    const type = types[i % types.length];
    const point = poi && i < osmPois.length ? poi : offsetPoint(anchor, i);
    facilities.push({
      id: i + 1,
      name: poi && poi.name ? poi.name : `${anchor.name}${type}${Math.floor(i / types.length) + 1}`,
      type,
      near_spot_id: anchor.spot_id,
      lat: round(point.lat, 6),
      lon: round(point.lon, 6),
      rating: round(4.0 + ((i * 5) % 10) / 10, 1),
      heat: 260 + ((i * 73) % 620),
      tags: `${type},${anchor.name},颐和园服务设施`
    });
  }
  return facilities;
}

function buildRestaurants(overpass) {
  const cuisines = ["北京菜", "小吃", "咖啡", "面食", "甜品", "简餐", "茶饮", "烤鸭", "素食", "家常菜"];
  const foodPois = collectPois(overpass).filter((poi) => isFoodAmenity(poi.tags));
  const restaurants = [];
  for (let i = 0; i < 50; ++i) {
    const anchor = scene.namedNodes[i % scene.namedNodes.length];
    const cuisine = cuisines[i % cuisines.length];
    const poi = foodPois[i % Math.max(1, foodPois.length)];
    restaurants.push({
      id: i + 1,
      name: poi && poi.name ? poi.name : `${anchor.name}${cuisine}推荐点${Math.floor(i / cuisines.length) + 1}`,
      near_spot_id: anchor.spot_id,
      cuisine,
      rating: round(4.0 + ((i * 7) % 10) / 10, 1),
      heat: 300 + ((i * 91) % 760)
    });
  }
  return restaurants;
}

function collectPois(overpass) {
  const pois = [];
  for (const element of overpass.elements || []) {
    const tags = element.tags || {};
    if (!tags.amenity && !tags.shop && !tags.tourism && !tags.leisure) continue;
    if (typeof element.lat !== "number" || typeof element.lon !== "number") continue;
    pois.push({
      name: tags.name || "",
      lat: element.lat,
      lon: element.lon,
      tags
    });
  }
  return pois.filter((poi) => (
    poi.lat >= south && poi.lat <= north && poi.lon >= west && poi.lon <= east
  ));
}

function isFoodAmenity(tags) {
  return ["restaurant", "cafe", "fast_food", "food_court", "ice_cream", "bar"].includes(tags.amenity);
}

function buildUsers() {
  const prefs = [
    ["历史", "建筑", "室内"], ["湖景", "拍照", "夕阳"], ["安静", "园林", "低拥挤"],
    ["亲子", "服务", "轻松"], ["美食", "购物", "文化"], ["徒步", "路线", "登高"],
    ["展陈", "文物", "讲解"], ["骑行", "湖岸", "效率"], ["地标", "打卡", "热门"],
    ["自然", "树荫", "休闲"]
  ];
  return prefs.map((tags, index) => ({
    id: index + 1,
    name: `游客${String(index + 1).padStart(2, "0")}`,
    preference_tags: tags,
    preferred_categories: tags.slice(0, 2),
    route_mode: index % 3 === 1 ? "bike" : "walk",
    history_spot_ids: [1 + (index % 8), 9 + (index % 7), 16 + (index % 4)]
  }));
}

function buildDiaryIndex() {
  const titles = [
    "从东宫门到长廊的半日路线",
    "佛香阁登高和昆明湖视野",
    "十七孔桥夕阳拍照记录",
    "苏州街和后湖的慢游体验",
    "雨天文昌院室内参观",
    "亲子游客的东堤轻松路线",
    "西堤低拥挤步行日记",
    "北宫门返程前的美食补给",
    "谐趣园安静园林打卡",
    "南湖岛环线游览复盘",
    "长廊彩画讲解笔记",
    "新建宫门入园路线比较"
  ];
  return titles.map((title, index) => {
    const node = scene.namedNodes[index % scene.namedNodes.length];
    const original = 520 + index * 43;
    return {
      id: index + 1,
      title,
      user_id: (index % 10) + 1,
      destination: node.name,
      rating: round(4.1 + ((index * 3) % 9) / 10, 1),
      heat: 360 + ((index * 97) % 780),
      created_at: `2026-05-${String(10 + index).padStart(2, "0")} 09:${String((index * 7) % 60).padStart(2, "0")}:00`,
      tags: spotTags(node).split(","),
      content: `${title}：本次路线围绕${node.name}展开，结合评分、热度和个人兴趣排序，适合在答辩时展示旅游日记管理、查询、推荐和压缩统计。`,
      original_bytes: original,
      compressed_bytes: Math.round(original * (0.44 + (index % 4) * 0.04))
    };
  });
}

function averagePoint(points) {
  const sum = points.reduce((acc, point) => {
    acc.lat += point.lat;
    acc.lon += point.lon;
    return acc;
  }, { lat: 0, lon: 0 });
  return { lat: sum.lat / points.length, lon: sum.lon / points.length };
}

async function writeJson(relativePath, value) {
  const filePath = path.join(dataDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  const overpass = await fetchOverpass();
  const { nodes, edges } = buildOsmOutput(overpass);
  const spots = buildSpots();
  const roads = buildRoads(spots);
  const restaurants = buildRestaurants(overpass);
  const facilities = buildFacilities(overpass);
  const users = buildUsers();
  const diaries = buildDiaryIndex();

  if (nodes.length < 220) throw new Error(`Expected at least 220 nodes, got ${nodes.length}`);
  if (edges.length < 400) throw new Error(`Expected at least 400 directed edges, got ${edges.length}`);
  if (spots.length < 20) throw new Error(`Expected at least 20 spots, got ${spots.length}`);
  if (restaurants.length < 50) throw new Error(`Expected at least 50 restaurants, got ${restaurants.length}`);
  if (facilities.length < 50) throw new Error(`Expected at least 50 facilities, got ${facilities.length}`);

  await writeJson("osm_nodes.json", nodes);
  await writeJson("osm_edges.json", edges);
  await writeJson("spots.json", spots);
  await writeJson("roads.json", roads);
  await writeJson("restaurants.json", restaurants);
  await writeJson("facilities.json", facilities);
  await writeJson("users.json", users);
  await writeJson(path.join("diaries", "index.json"), diaries);

  console.log(`Generated ${scene.label}: ${nodes.length} OSM nodes, ${edges.length} directed edges, ${spots.length} spots, ${restaurants.length} restaurants, ${facilities.length} facilities.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
