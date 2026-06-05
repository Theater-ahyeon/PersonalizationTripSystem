import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const dataRoots = [
  path.join(repoRoot, "cpp", "data"),
  path.join(repoRoot, "web", "data")
];

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

const REAL_IMAGES = {
  summerTower: "web/assets/spots/real/tower-buddhist-incense.jpg",
  summerBridge: "web/assets/spots/real/summer-seventeen-arch-bridge.jpg",
  summerCorridor: "web/assets/spots/real/summer-long-corridor-commons.jpg"
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];
const OSM_MAP_ENDPOINT = "https://api.openstreetmap.org/api/0.6/map";

const ROAD_HIGHWAYS = "footway|path|pedestrian|cycleway|service|residential|living_street|unclassified|tertiary";
const FETCH_TIMEOUT_MS = 25_000;
const MAX_TILE_SPLIT_DEPTH = 2;

const SCENES = {
  "summer-palace": {
    label: "北京颐和园",
    outputSubdir: "",
    bbox: [39.9850, 116.2550, 40.0120, 116.3050],
    minRoadNodes: 400,
    maxRoadNodes: 700,
    maxSegmentM: 120,
    minEdges: 400,
    sampleRoutes: [[1, 8], [9, 13], [20, 6]],
    namedNodes: [
      node(1, "颐和园东宫门", 39.9973, 116.2753, "gate", "颐和园东宫门是游客入园和路线规划的主要起点，适合连接仁寿殿、德和园和昆明湖东堤。", REAL_IMAGES.summerTower),
      node(2, "仁寿殿", 39.9994, 116.2740, "building", "仁寿殿是清代皇家园林的政务活动空间，适合文化类推荐和室内参观。", REAL_IMAGES.summerTower),
      node(3, "德和园", 39.9987, 116.2720, "building", "德和园以戏楼和园林院落著称，适合对戏曲、建筑和历史感兴趣的游客。", REAL_IMAGES.summerTower),
      node(4, "长廊东口", 39.9982, 116.2695, "path", "长廊连接东部建筑群和万寿山前景区，是步行游览的核心通道。", REAL_IMAGES.summerCorridor),
      node(5, "排云门", 39.9991, 116.2665, "junction", "排云门位于万寿山中轴线上，是前往佛香阁和昆明湖的重要节点。", REAL_IMAGES.summerTower),
      node(6, "佛香阁", 39.9997, 116.2662, "landmark", "佛香阁是颐和园标志性建筑，可俯瞰昆明湖和长堤景观。", REAL_IMAGES.summerTower),
      node(7, "石舫", 40.0007, 116.2630, "landmark", "石舫位于昆明湖北岸，适合拍照、休息和湖岸路线衔接。", REAL_IMAGES.summerCorridor),
      node(8, "苏州街入口", 40.0046, 116.2638, "poi", "苏州街入口连接后湖商业街区，适合文化体验、美食和文创购物推荐。", IMAGE_POOL[7]),
      node(9, "北宫门", 40.0061, 116.2636, "gate", "北宫门靠近地铁和外部服务区，适合作为返程或多点游览终点。", IMAGE_POOL[0]),
      node(10, "万寿山后湖", 40.0048, 116.2676, "waterfront", "后湖区域较安静，适合避开高峰人流的休闲路线。", IMAGE_POOL[8]),
      node(11, "昆明湖东堤", 39.9926, 116.2715, "path", "昆明湖东堤视野开阔，适合拍照、骑行和湖岸观景。", REAL_IMAGES.summerBridge),
      node(12, "知春亭", 39.9949, 116.2739, "landmark", "知春亭临近昆明湖，是连接东宫门和湖岸景观的轻量停留点。", IMAGE_POOL[8]),
      node(13, "十七孔桥", 39.9887, 116.2772, "bridge", "十七孔桥是昆明湖最具辨识度的桥梁景观，适合夕阳和摄影路线。", REAL_IMAGES.summerBridge),
      node(14, "南湖岛", 39.9893, 116.2753, "island", "南湖岛通过十七孔桥与东堤相连，适合安排湖区环线。", REAL_IMAGES.summerBridge),
      node(15, "西堤", 39.9928, 116.2608, "path", "西堤横贯昆明湖西侧，适合长距离步行和低拥挤度路线。", IMAGE_POOL[6]),
      node(16, "谐趣园", 40.0023, 116.2706, "garden", "谐趣园有江南园林风格，适合文化、建筑和安静游览偏好。", IMAGE_POOL[6]),
      node(17, "乐寿堂", 39.9989, 116.2727, "building", "乐寿堂靠近核心建筑群，适合和仁寿殿、德和园一起推荐。", REAL_IMAGES.summerTower),
      node(18, "文昌院", 39.9966, 116.2769, "museum", "文昌院适合室内展陈、文物和雨天备选路线。", IMAGE_POOL[10]),
      node(19, "铜牛广场", 39.9910, 116.2777, "square", "铜牛广场位于湖区东南侧，可作为十七孔桥和东堤之间的休息点。", REAL_IMAGES.summerBridge),
      node(20, "新建宫门", 39.9904, 116.2818, "gate", "新建宫门临近外部交通与服务设施，适合作为南侧入园起点。", IMAGE_POOL[0])
    ],
    highLevelEdges: [
      [1, 2], [2, 17], [17, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
      [8, 10], [10, 16], [16, 3], [1, 18], [18, 12], [12, 11], [11, 19], [19, 13],
      [13, 14], [14, 15], [15, 7], [11, 4], [20, 19], [20, 13], [1, 12]
    ],
    facilityCount: 60,
    restaurantCount: 50,
    usersCount: 10,
    diariesCount: 12
  },
  "tsinghua-campus": {
    label: "清华大学",
    source: "local-pack",
    sourceSubdir: "regions/tsinghua_campus",
    outputSubdir: "regions/tsinghua_campus",
    minRoadNodes: 400,
    maxRoadNodes: 700,
    maxSegmentM: 120,
    minEdges: 400,
    sampleRoutes: [[1, 4], [14, 10], [3, 8]],
    diariesCount: 10
  }
};

function node(id, name, lat, lon, type, description, image) {
  return { id, name, lat, lon, type, spot_id: id, description, image };
}

function spot(id, name, category, tags, rating, heat) {
  return { id, name, category, rating, heat, tags };
}

const sceneArg = process.argv[2] || "summer-palace";
const sceneIds = sceneArg === "all" ? Object.keys(SCENES) : [sceneArg];
for (const id of sceneIds) {
  if (!SCENES[id]) {
    throw new Error(`Unknown scene "${id}". Available scenes: all, ${Object.keys(SCENES).join(", ")}`);
  }
}

function overpassQueryForBbox(bbox) {
  const [south, west, north, east] = bbox;
  return `[out:json][timeout:45];
way["highway"~"${ROAD_HIGHWAYS}"](${south},${west},${north},${east});
out body qt;
>;
out skel qt;`;
}

async function fetchOverpass(scene) {
  const boxes = sceneBboxes(scene);
  const responses = [];
  for (let index = 0; index < boxes.length; ++index) {
    const label = `${scene.label} tile ${index + 1}/${boxes.length}`;
    responses.push(scene.source === "osm-api"
      ? await fetchOsmApiMapWithSplit(boxes[index], label)
      : await fetchOverpassBboxWithSplit(boxes[index], label));
  }
  return mergeOverpassResponses(responses);
}

function sceneBboxes(scene) {
  if (!scene.tiles) return [scene.bbox];
  const [rows, cols] = Array.isArray(scene.tiles) ? scene.tiles : [scene.tiles, scene.tiles];
  const [south, west, north, east] = scene.bbox;
  const boxes = [];
  const overlap = 0.00008;
  for (let row = 0; row < rows; ++row) {
    const tileSouth = south + (north - south) * row / rows;
    const tileNorth = south + (north - south) * (row + 1) / rows;
    for (let col = 0; col < cols; ++col) {
      const tileWest = west + (east - west) * col / cols;
      const tileEast = west + (east - west) * (col + 1) / cols;
      boxes.push([
        clamp(tileSouth - overlap, south, north),
        clamp(tileWest - overlap, west, east),
        clamp(tileNorth + overlap, south, north),
        clamp(tileEast + overlap, west, east)
      ]);
    }
  }
  return boxes;
}

async function fetchOverpassBbox(bbox, label) {
  const body = new URLSearchParams({ data: overpassQueryForBbox(bbox) });
  let lastError = null;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": "PersonalizationTripSystem-course-demo/3.0 (local data generation)" },
        body,
        signal: controller.signal
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${endpoint} ${response.status}: ${text.slice(0, 180)}`);
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      console.warn(`Overpass endpoint failed for ${label}: ${endpoint}: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("No Overpass endpoint responded");
}

async function fetchOverpassBboxWithSplit(bbox, label, depth = 0) {
  try {
    return await fetchOverpassBbox(bbox, label);
  } catch (error) {
    if (depth >= MAX_TILE_SPLIT_DEPTH) throw error;
    const subtiles = splitBbox(bbox);
    console.warn(`Splitting ${label} into ${subtiles.length} smaller Overpass tiles.`);
    const responses = [];
    for (let index = 0; index < subtiles.length; ++index) {
      responses.push(await fetchOverpassBboxWithSplit(
        subtiles[index],
        `${label}.${index + 1}`,
        depth + 1
      ));
    }
    return mergeOverpassResponses(responses);
  }
}

async function fetchOsmApiMapWithSplit(bbox, label, depth = 0) {
  try {
    return await fetchOsmApiMap(bbox, label);
  } catch (error) {
    if (depth >= MAX_TILE_SPLIT_DEPTH) throw error;
    const subtiles = splitBbox(bbox);
    console.warn(`Splitting ${label} into ${subtiles.length} smaller OSM API tiles.`);
    const responses = [];
    for (let index = 0; index < subtiles.length; ++index) {
      responses.push(await fetchOsmApiMapWithSplit(
        subtiles[index],
        `${label}.${index + 1}`,
        depth + 1
      ));
    }
    return mergeOverpassResponses(responses);
  }
}

async function fetchOsmApiMap(bbox, label) {
  const [south, west, north, east] = bbox;
  const url = `${OSM_MAP_ENDPOINT}?bbox=${west},${south},${east},${north}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PersonalizationTripSystem-course-demo/3.0 (local data generation)" },
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${label} ${response.status}: ${text.slice(0, 180)}`);
    }
    return parseOsmMapXml(text);
  } catch (error) {
    console.warn(`OSM API tile failed for ${label}: ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseOsmMapXml(xml) {
  const elements = [];
  const nodeRegex = /<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g;
  for (const match of xml.matchAll(nodeRegex)) {
    const attrs = parseXmlAttributes(match[1]);
    if (!attrs.id || !attrs.lat || !attrs.lon) continue;
    elements.push({
      type: "node",
      id: Number(attrs.id),
      lat: Number(attrs.lat),
      lon: Number(attrs.lon),
      tags: parseXmlTags(match[2] || "")
    });
  }

  const wayRegex = /<way\b([^>]*?)>([\s\S]*?)<\/way>/g;
  for (const match of xml.matchAll(wayRegex)) {
    const attrs = parseXmlAttributes(match[1]);
    if (!attrs.id) continue;
    const body = match[2] || "";
    const nodes = Array.from(body.matchAll(/<nd\b[^>]*\bref="([^"]+)"/g), (item) => Number(item[1]))
      .filter((value) => Number.isFinite(value));
    elements.push({
      type: "way",
      id: Number(attrs.id),
      nodes,
      tags: parseXmlTags(body)
    });
  }
  return { elements };
}

function parseXmlTags(xml) {
  const tags = {};
  const tagRegex = /<tag\b([^>]*?)\/>/g;
  for (const match of xml.matchAll(tagRegex)) {
    const attrs = parseXmlAttributes(match[1]);
    if (attrs.k) tags[attrs.k] = attrs.v || "";
  }
  return tags;
}

function parseXmlAttributes(input) {
  const attrs = {};
  for (const match of input.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    attrs[match[1]] = decodeXml(match[2]);
  }
  return attrs;
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function splitBbox(bbox) {
  const [south, west, north, east] = bbox;
  const midLat = (south + north) / 2;
  const midLon = (west + east) / 2;
  const overlap = 0.00005;
  return [
    [south, west, clamp(midLat + overlap, south, north), clamp(midLon + overlap, west, east)],
    [south, clamp(midLon - overlap, west, east), clamp(midLat + overlap, south, north), east],
    [clamp(midLat - overlap, south, north), west, north, clamp(midLon + overlap, west, east)],
    [clamp(midLat - overlap, south, north), clamp(midLon - overlap, west, east), north, east]
  ];
}

function mergeOverpassResponses(responses) {
  const elementsByKey = new Map();
  for (const response of responses) {
    for (const element of response.elements || []) {
      elementsByKey.set(`${element.type}:${element.id}`, element);
    }
  }
  return { elements: Array.from(elementsByKey.values()) };
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
    const mode = edgeMode(tags.highway);
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

function edgeMode(highway) {
  if (["footway", "path", "pedestrian", "cycleway"].includes(highway)) return "both";
  return "both";
}

function highwayLabel(highway) {
  const labels = {
    footway: "步行路",
    path: "小径",
    pedestrian: "步行街",
    cycleway: "骑行道",
    service: "服务道路",
    residential: "生活区道路",
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

function selectOsmNodes(scene, osmNodes, graph) {
  const component = largestComponent(graph);
  if (component.length < scene.minRoadNodes) {
    throw new Error(`${scene.label}: only ${component.length} connected OSM nodes found; need ${scene.minRoadNodes}`);
  }
  if (!scene.maxRoadNodes && component.length <= scene.minRoadNodes) {
    return component;
  }

  if (scene.maxRoadNodes) {
    return selectKeyRouteOsmNodes(scene, component, osmNodes, graph);
  }

  return component;
}

function selectKeyRouteOsmNodes(scene, component, osmNodes, graph) {
  const center = averagePoint(scene.namedNodes);
  const seedSet = new Set();
  for (const poi of scene.namedNodes) {
    nearestOsmIds(poi, component, osmNodes, 2).forEach((id) => seedSet.add(id));
  }

  const poiById = new Map(scene.namedNodes.map((poi) => [poi.id, poi]));
  const routePairs = [...(scene.highLevelEdges || []), ...(scene.sampleRoutes || [])];
  for (const [fromId, toId] of routePairs) {
    const from = poiById.get(fromId);
    const to = poiById.get(toId);
    if (!from || !to) continue;
    const start = nearestOsmIds(from, component, osmNodes, 1)[0];
    const goal = nearestOsmIds(to, component, osmNodes, 1)[0];
    const path = shortestOsmPath(start, goal, graph, osmNodes);
    if (!path.length) {
      throw new Error(`${scene.label}: key route ${fromId}->${toId} could not be traced through OSM roads`);
    }
    path.forEach((id) => seedSet.add(id));
  }

  const selected = [...seedSet].sort((a, b) => {
    const da = haversineM(center, osmNodes.get(a));
    const db = haversineM(center, osmNodes.get(b));
    return da - db || a - b;
  });
  if (selected.length > scene.maxRoadNodes) {
    throw new Error(`${scene.label}: key route node set has ${selected.length} transition nodes; max is ${scene.maxRoadNodes}`);
  }

  const seen = new Set(seedSet);
  const componentSet = new Set(component);
  const queue = [...selected].sort((a, b) => {
    const da = haversineM(center, osmNodes.get(a));
    const db = haversineM(center, osmNodes.get(b));
    return da - db || a - b;
  });
  while (queue.length && selected.length < scene.minRoadNodes) {
    const current = queue.shift();
    const neighbors = Array.from(graph.get(current) || [])
      .filter((id) => componentSet.has(id))
      .sort((a, b) => {
        const da = haversineM(center, osmNodes.get(a));
        const db = haversineM(center, osmNodes.get(b));
        return da - db || a - b;
      });
    for (const next of neighbors) {
      if (!seen.has(next)) {
        seen.add(next);
        selected.push(next);
        queue.push(next);
      }
    }
  }
  return selected;
}

function shortestOsmPath(start, goal, graph, osmNodes) {
  if (start == null || goal == null) return [];
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const queue = [{ node: start, distance: 0 }];
  const seen = new Set();
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (seen.has(current.node)) continue;
    seen.add(current.node);
    if (current.node === goal) break;
    for (const next of graph.get(current.node) || []) {
      const a = osmNodes.get(current.node);
      const b = osmNodes.get(next);
      if (!a || !b) continue;
      const nextDistance = current.distance + haversineM(a, b);
      if (!dist.has(next) || nextDistance < dist.get(next)) {
        dist.set(next, nextDistance);
        prev.set(next, current.node);
        queue.push({ node: next, distance: nextDistance });
      }
    }
  }
  if (!dist.has(goal)) return [];
  const path = [];
  for (let node = goal; node != null; node = prev.get(node)) {
    path.unshift(node);
    if (node === start) break;
  }
  return path;
}

function buildOsmOutput(scene, overpass) {
  const { osmNodes, graph, nodeMeta, segments } = buildRoadGraph(overpass);
  const selectedOsmIds = selectOsmNodes(scene, osmNodes, graph);
  const selected = new Set(selectedOsmIds);
  const localIdByOsmId = new Map();
  const nodes = [...scene.namedNodes];
  const reservedNodeIds = [...scene.namedNodes, ...(scene.displayNodes || [])].map((item) => Number(item.id));
  const roadIdStart = Math.max(...reservedNodeIds) + 1;
  let nextVirtualRoadId = roadIdStart + selectedOsmIds.length;

  selectedOsmIds.forEach((osmId, index) => {
    const localId = roadIdStart + index;
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
      description: `来自 OpenStreetMap 的真实道路过渡节点，OSM node id ${osmId}，关联道路：${meta.roadName || "未命名道路"}。`,
      image: IMAGE_POOL[index % IMAGE_POOL.length]
    });
  });

  const edges = [];
  const nodeById = new Map(nodes.map((node) => [Number(node.id), node]));
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
    nextVirtualRoadId = pushSegmentedBidirectional({
      nodes,
      nodeById,
      edges,
      from,
      to,
      distance: haversineM(a, b),
      mode: segment.mode,
      roadName: segment.roadName,
      maxSegmentM: scene.maxSegmentM,
      nextVirtualRoadId
    });
  }

  for (const poi of scene.namedNodes) {
    const nearest = nearestOsmIds(poi, selectedOsmIds, osmNodes, 2);
    for (const osmId of nearest) {
      const localRoadId = localIdByOsmId.get(osmId);
      const roadNode = osmNodes.get(osmId);
      nextVirtualRoadId = pushSegmentedBidirectional({
        nodes,
        nodeById,
        edges,
        from: poi.id,
        to: localRoadId,
        distance: Math.max(8, haversineM(poi, roadNode)),
        mode: "both",
        roadName: "景点接入真实路网",
        maxSegmentM: scene.maxSegmentM,
        nextVirtualRoadId
      });
    }
  }

  if (scene.displayNodes?.length) {
    nodes.push(...scene.displayNodes);
  }

  return { nodes, edges };
}

async function generateLocalScene(scene) {
  const sourceDir = path.join(dataRoots[1], scene.sourceSubdir);
  const source = {
    nodes: await readJson(path.join(sourceDir, "osm_nodes.json")),
    edges: await readJson(path.join(sourceDir, "osm_edges.json")),
    spots: await readJson(path.join(sourceDir, "spots.json")),
    roads: await readJson(path.join(sourceDir, "roads.json")),
    facilities: await readJson(path.join(sourceDir, "facilities.json")),
    restaurants: await readJson(path.join(sourceDir, "restaurants.json"))
  };
  const localScene = {
    ...scene,
    namedNodes: source.nodes
      .filter((node) => Number(node.spot_id) > 0)
      .map((node) => ({ ...node })),
    highLevelEdges: source.roads.map((road) => [Number(road.from), Number(road.to)])
  };

  const { nodes, edges } = buildLocalPackOutput(localScene, source.nodes, source.edges);
  const roads = buildRoads(localScene, nodes, edges);
  const diaries = buildCampusDiaryIndex(localScene);
  validateScene(localScene, nodes, edges, source.spots);
  await writeScene(localScene, {
    nodes,
    edges,
    spots: source.spots,
    roads,
    facilities: source.facilities,
    restaurants: source.restaurants,
    diaries
  });
  console.log(`Generated ${scene.label}: ${nodes.length} nodes, ${edges.length} directed edges, ${source.spots.length} spots.`);
}

function buildLocalPackOutput(scene, sourceNodes, sourceEdges) {
  const nodeById = new Map(sourceNodes.map((node) => [Number(node.id), node]));
  const roadNodeIds = sourceNodes
    .filter((node) => Number(node.spot_id) === 0)
    .map((node) => Number(node.id));
  const roadNodeSet = new Set(roadNodeIds);
  const selected = selectLocalRoadNodes(scene, sourceNodes, sourceEdges);
  const outputNodes = [
    ...scene.namedNodes.map((node) => ({ ...node })),
    ...Array.from(selected)
      .sort((a, b) => a - b)
      .map((id) => ({ ...nodeById.get(id) }))
  ];
  const outputNodeById = new Map(outputNodes.map((node) => [Number(node.id), node]));
  const outputEdges = [];
  const pairSeen = new Set();
  let nextVirtualRoadId = Math.max(...sourceNodes.map((node) => Number(node.id))) + 1;

  for (const edge of sourceEdges) {
    const from = Number(edge.from);
    const to = Number(edge.to);
    const fromNode = nodeById.get(from);
    const toNode = nodeById.get(to);
    if (!fromNode || !toNode) continue;
    if (Number(fromNode.spot_id) > 0 && Number(toNode.spot_id) > 0) continue;
    const fromAllowed = Number(fromNode.spot_id) > 0 || (roadNodeSet.has(from) && selected.has(from));
    const toAllowed = Number(toNode.spot_id) > 0 || (roadNodeSet.has(to) && selected.has(to));
    if (!fromAllowed || !toAllowed) continue;
    const key = from < to ? `${from}:${to}:${edge.mode}` : `${to}:${from}:${edge.mode}`;
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);
    nextVirtualRoadId = pushSegmentedBidirectional({
      nodes: outputNodes,
      nodeById: outputNodeById,
      edges: outputEdges,
      from,
      to,
      distance: Number(edge.distance || haversineM(fromNode, toNode)),
      mode: edge.mode || "both",
      roadName: edge.road_name || "校园道路",
      maxSegmentM: scene.maxSegmentM,
      nextVirtualRoadId
    });
  }

  return { nodes: outputNodes, edges: outputEdges };
}

function selectLocalRoadNodes(scene, sourceNodes, sourceEdges) {
  const nodeById = new Map(sourceNodes.map((node) => [Number(node.id), node]));
  const roadNodeSet = new Set(sourceNodes.filter((node) => Number(node.spot_id) === 0).map((node) => Number(node.id)));
  const selected = new Set();
  const center = averagePoint(scene.namedNodes);

  for (const poi of scene.namedNodes) {
    const accessIds = [];
    sourceEdges
      .filter((edge) => Number(edge.from) === Number(poi.id) || Number(edge.to) === Number(poi.id))
      .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))
      .forEach((edge) => {
        const id = Number(edge.from) === Number(poi.id) ? Number(edge.to) : Number(edge.from);
        if (roadNodeSet.has(id) && !accessIds.includes(id)) accessIds.push(id);
      });
    accessIds.slice(0, 2).forEach((id) => selected.add(id));
  }

  const routePairs = [...(scene.highLevelEdges || []), ...(scene.sampleRoutes || [])];
  for (const [from, to] of routePairs) {
    const path = shortestPathNodeIdsFromEdges(sourceEdges, Number(from), Number(to), "walk");
    if (!path.length) {
      throw new Error(`${scene.label}: local key route ${from}->${to} could not be traced`);
    }
    path.filter((id) => roadNodeSet.has(id)).forEach((id) => selected.add(id));
  }

  if (selected.size > scene.maxRoadNodes) {
    throw new Error(`${scene.label}: selected ${selected.size} local road nodes; max is ${scene.maxRoadNodes}`);
  }

  const graph = buildLocalRoadGraph(sourceEdges, roadNodeSet);
  const queue = Array.from(selected).sort((a, b) => {
    const da = haversineM(center, nodeById.get(a));
    const db = haversineM(center, nodeById.get(b));
    return da - db || a - b;
  });
  while (queue.length && selected.size < scene.minRoadNodes) {
    const current = queue.shift();
    const neighbors = Array.from(graph.get(current) || []).sort((a, b) => {
      const da = haversineM(center, nodeById.get(a));
      const db = haversineM(center, nodeById.get(b));
      return da - db || a - b;
    });
    for (const next of neighbors) {
      if (!selected.has(next)) {
        selected.add(next);
        queue.push(next);
        if (selected.size >= scene.minRoadNodes) break;
      }
    }
  }

  return selected;
}

function buildLocalRoadGraph(edges, roadNodeSet) {
  const graph = new Map();
  for (const edge of edges) {
    const from = Number(edge.from);
    const to = Number(edge.to);
    if (!roadNodeSet.has(from) || !roadNodeSet.has(to)) continue;
    if (!graph.has(from)) graph.set(from, new Set());
    if (!graph.has(to)) graph.set(to, new Set());
    graph.get(from).add(to);
    graph.get(to).add(from);
  }
  return graph;
}

function shortestPathNodeIdsFromEdges(edges, start, goal, mode) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (edge.mode !== "both" && edge.mode !== mode) continue;
    const from = Number(edge.from);
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(edge);
  }
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const queue = [{ node: start, distance: 0 }];
  const seen = new Set();
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (seen.has(current.node)) continue;
    seen.add(current.node);
    if (current.node === goal) break;
    for (const edge of adjacency.get(current.node) || []) {
      const to = Number(edge.to);
      const nextDistance = current.distance + Number(edge.distance || 0);
      if (!dist.has(to) || nextDistance < dist.get(to)) {
        dist.set(to, nextDistance);
        prev.set(to, current.node);
        queue.push({ node: to, distance: nextDistance });
      }
    }
  }
  if (!dist.has(goal)) return [];
  const path = [];
  for (let node = goal; node != null; node = prev.get(node)) {
    path.unshift(node);
    if (node === start) break;
  }
  return path;
}

function nearestOsmIds(point, ids, osmNodes, count) {
  return ids
    .map((osmId) => ({ osmId, distance: haversineM(point, osmNodes.get(osmId)) }))
    .sort((a, b) => a.distance - b.distance || a.osmId - b.osmId)
    .slice(0, count)
    .map((item) => item.osmId);
}

function pushBidirectional(edges, from, to, distance, mode, roadName) {
  if (from == null || to == null || from === to) return;
  edges.push({ from, to, distance: round(distance, 1), mode, road_name: roadName });
  edges.push({ from: to, to: from, distance: round(distance, 1), mode, road_name: roadName });
}

function pushSegmentedBidirectional({
  nodes,
  nodeById,
  edges,
  from,
  to,
  distance,
  mode,
  roadName,
  maxSegmentM,
  nextVirtualRoadId
}) {
  if (!maxSegmentM || distance <= maxSegmentM) {
    pushBidirectional(edges, from, to, distance, mode, roadName);
    return nextVirtualRoadId;
  }
  const start = nodeById.get(Number(from));
  const end = nodeById.get(Number(to));
  if (!start || !end) {
    pushBidirectional(edges, from, to, distance, mode, roadName);
    return nextVirtualRoadId;
  }

  const pieces = Math.ceil(distance / maxSegmentM);
  const chain = [from];
  for (let index = 1; index < pieces; index += 1) {
    const t = index / pieces;
    const id = nextVirtualRoadId;
    nextVirtualRoadId += 1;
    const virtualNode = {
      id,
      name: `Road transition node ${id}`,
      lat: round(start.lat + (end.lat - start.lat) * t, 6),
      lon: round(start.lon + (end.lon - start.lon) * t, 6),
      type: "road_transition",
      spot_id: 0,
      description: `Interpolated transition node for ${roadName || "road"}; keeps route drawing below ${maxSegmentM}m per segment.`,
      image: IMAGE_POOL[id % IMAGE_POOL.length]
    };
    nodes.push(virtualNode);
    nodeById.set(id, virtualNode);
    chain.push(id);
  }
  chain.push(to);

  for (let index = 0; index < chain.length - 1; index += 1) {
    pushBidirectional(edges, chain[index], chain[index + 1], distance / pieces, mode, roadName);
  }
  return nextVirtualRoadId;
}

function buildSpots(scene) {
  const base = scene.namedNodes.map((item) => ({
    id: item.spot_id,
    name: item.name,
    category: spotCategory(item.type),
    rating: round(4.1 + ((item.id * 7) % 9) / 10, 1),
    heat: 520 + ((item.id * 137) % 820),
    tags: spotTags(item)
  }));
  return base.concat(scene.extraSpots || []);
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
    museum: "文化展馆",
    square: "服务"
  };
  return categories[type] || "景点";
}

function spotTags(item) {
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
    museum: "展览,室内,文化",
    square: "休息,补给,拍照"
  };
  return tags[item.type] || "旅游,推荐";
}

function buildRoads(scene, nodes, edges) {
  return scene.highLevelEdges.map(([from, to]) => {
    const walk = shortestDistance(edges, from, to, "walk");
    const bike = shortestDistance(edges, from, to, "bike");
    return {
      from,
      to,
      dist_walk: round(Number.isFinite(walk) ? walk : fallbackDistance(nodes, from, to), 1),
      dist_bike: Number.isFinite(bike) ? round(bike, 1) : 9999
    };
  });
}

function buildFacilities(scene) {
  const types = scene.outputSubdir
    ? ["游客服务", "卫生间", "图书馆", "咖啡馆", "休息区", "售票处", "商店", "饮水点"]
    : ["卫生间", "游客服务", "售票处", "纪念品店", "饮水点", "急救点", "停车场", "地铁站", "休息亭", "观景台", "商店", "安检口"];
  const facilities = [];
  for (let i = 0; i < scene.facilityCount; ++i) {
    const anchor = scene.namedNodes[i % scene.namedNodes.length];
    const type = types[i % types.length];
    const point = offsetPoint(anchor, i, scene.outputSubdir ? 0.000045 : 0.00018);
    facilities.push({
      id: i + 1,
      name: `${anchor.name}${type}${Math.floor(i / types.length) + 1}`,
      type,
      near_spot_id: anchor.spot_id,
      lat: point.lat,
      lon: point.lon,
      rating: round(4.0 + ((i * 5) % 10) / 10, 1),
      heat: 260 + ((i * 73) % 620),
      tags: `${type},${anchor.name},服务设施`
    });
  }
  return facilities;
}

function buildRestaurants(scene) {
  const cuisines = scene.outputSubdir
    ? ["校园食堂", "面食", "咖啡", "简餐", "轻食", "茶饮"]
    : ["北京菜", "小吃", "咖啡", "面食", "甜品", "简餐", "茶饮", "烤鸭", "素食", "家常菜"];
  const restaurants = [];
  for (let i = 0; i < scene.restaurantCount; ++i) {
    const anchor = scene.namedNodes[(i + 2) % scene.namedNodes.length];
    const cuisine = cuisines[i % cuisines.length];
    restaurants.push({
      id: i + 1,
      name: `${anchor.name}${cuisine}推荐点${Math.floor(i / cuisines.length) + 1}`,
      near_spot_id: anchor.spot_id,
      cuisine,
      rating: round(4.0 + ((i * 7) % 10) / 10, 1),
      heat: 300 + ((i * 91) % 760)
    });
  }
  return restaurants;
}

function buildUsers(scene) {
  if (!scene.usersCount) return null;
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

function buildDiaryIndex(scene) {
  if (!scene.diariesCount) return null;
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
    const item = scene.namedNodes[index % scene.namedNodes.length];
    const original = 520 + index * 43;
    return {
      id: index + 1,
      title,
      user_id: (index % 10) + 1,
      destination: item.name,
      rating: round(4.1 + ((index * 3) % 9) / 10, 1),
      heat: 360 + ((index * 97) % 780),
      created_at: `2026-05-${String(10 + index).padStart(2, "0")} 09:${String((index * 7) % 60).padStart(2, "0")}:00`,
      tags: spotTags(item).split(","),
      content: `${title}：本次路线围绕${item.name}展开，结合评分、热度和个人兴趣排序，适合在答辩时展示旅游日记管理、查询、推荐和压缩统计。`,
      original_bytes: original,
      compressed_bytes: Math.round(original * (0.44 + (index % 4) * 0.04))
    };
  });
}

function buildCampusDiaryIndex(scene) {
  const titles = [
    "二校门到主楼的校园步行路线",
    "图书馆老馆和大礼堂的建筑打卡",
    "荷塘到水木清华的安静散步",
    "艺术博物馆半日参观记录",
    "校医院到紫荆公寓区服务路线",
    "清芬园食堂午餐推荐",
    "教学楼区到综合体育馆通勤体验",
    "近春园和荷塘的校园慢游",
    "学生服务中心办事路线",
    "主楼到艺术博物馆的东区路线"
  ];
  return titles.slice(0, scene.diariesCount || titles.length).map((title, index) => {
    const item = scene.namedNodes[index % scene.namedNodes.length];
    const original = 460 + index * 37;
    return {
      id: index + 1,
      title,
      user_id: (index % 10) + 1,
      destination: item.name,
      rating: round(4.1 + ((index * 5) % 8) / 10, 1),
      heat: 320 + ((index * 83) % 640),
      created_at: `2026-05-${String(12 + index).padStart(2, "0")} 10:${String((index * 9) % 60).padStart(2, "0")}:00`,
      tags: ["校园", "路线", item.type],
      content: `${title}：本次路线围绕${item.name}展开，适合展示清华大学区域的路线规划、设施查询、美食推荐和日记检索。`,
      original_bytes: original,
      compressed_bytes: Math.round(original * (0.45 + (index % 3) * 0.05))
    };
  });
}

function shortestDistance(edges, start, goal, mode) {
  const dist = new Map([[start, 0]]);
  const queue = [{ node: start, distance: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (current.distance !== dist.get(current.node)) continue;
    if (current.node === goal) break;
    for (const edge of edges) {
      if (Number(edge.from) !== Number(current.node)) continue;
      if (!(edge.mode === "both" || edge.mode === mode)) continue;
      const next = current.distance + Number(edge.distance || 0);
      if (!dist.has(edge.to) || next < dist.get(edge.to)) {
        dist.set(edge.to, next);
        queue.push({ node: edge.to, distance: next });
      }
    }
  }
  return dist.get(goal) ?? Infinity;
}

function fallbackDistance(nodes, from, to) {
  const a = nodes.find((item) => item.id === from);
  const b = nodes.find((item) => item.id === to);
  return a && b ? Math.max(30, haversineM(a, b) * 1.18) : 9999;
}

function validateScene(scene, nodes, edges, spots) {
  const roadNodes = nodes.filter((item) => Number(item.spot_id) === 0);
  if (roadNodes.length < scene.minRoadNodes) {
    throw new Error(`${scene.label}: expected at least ${scene.minRoadNodes} transition nodes, got ${roadNodes.length}`);
  }
  if (scene.maxRoadNodes && roadNodes.length > scene.maxRoadNodes) {
    throw new Error(`${scene.label}: expected at most ${scene.maxRoadNodes} transition nodes, got ${roadNodes.length}`);
  }
  if (edges.length < scene.minEdges) {
    throw new Error(`${scene.label}: expected at least ${scene.minEdges} directed edges, got ${edges.length}`);
  }
  if (spots.length < scene.namedNodes.length) {
    throw new Error(`${scene.label}: expected at least ${scene.namedNodes.length} spots, got ${spots.length}`);
  }
  const byId = new Map(nodes.map((item) => [Number(item.id), item]));
  const directPoi = edges.find((edge) => {
    const from = byId.get(Number(edge.from));
    const to = byId.get(Number(edge.to));
    return from && to && Number(from.spot_id) > 0 && Number(to.spot_id) > 0;
  });
  if (directPoi) {
    throw new Error(`${scene.label}: direct POI edge remains: ${directPoi.from}->${directPoi.to}`);
  }
  for (const poi of scene.namedNodes) {
    const hasAccess = edges.some((edge) => {
      if (Number(edge.from) !== poi.id && Number(edge.to) !== poi.id) return false;
      const other = byId.get(Number(edge.from) === poi.id ? Number(edge.to) : Number(edge.from));
      return other && Number(other.spot_id) === 0;
    });
    if (!hasAccess) {
      throw new Error(`${scene.label}: POI has no road access edge: ${poi.name}`);
    }
  }
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function offsetPoint(base, index, step) {
  const ring = Math.floor(index / 8) + 1;
  const angle = (index % 8) * Math.PI / 4;
  return {
    lat: round(clamp(base.lat + Math.sin(angle) * step * ring, base.lat - 0.0012, base.lat + 0.0012), 6),
    lon: round(clamp(base.lon + Math.cos(angle) * step * ring, base.lon - 0.0012, base.lon + 0.0012), 6)
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

function averagePoint(points) {
  const sum = points.reduce((acc, point) => {
    acc.lat += point.lat;
    acc.lon += point.lon;
    return acc;
  }, { lat: 0, lon: 0 });
  return { lat: sum.lat / points.length, lon: sum.lon / points.length };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeScene(scene, output) {
  const relativeBase = scene.outputSubdir || "";
  for (const root of dataRoots) {
    await writeJson(root, path.join(relativeBase, "osm_nodes.json"), output.nodes);
    await writeJson(root, path.join(relativeBase, "osm_edges.json"), output.edges);
    await writeJson(root, path.join(relativeBase, "spots.json"), output.spots);
    await writeJson(root, path.join(relativeBase, "roads.json"), output.roads);
    await writeJson(root, path.join(relativeBase, "facilities.json"), output.facilities);
    await writeJson(root, path.join(relativeBase, "restaurants.json"), output.restaurants);
    if (output.users) await writeJson(root, "users.json", output.users);
    if (output.diaries) await writeJson(root, path.join(relativeBase, "diaries", "index.json"), output.diaries);
  }
}

async function writeManifest() {
  const manifests = new Map([
    [path.join(repoRoot, "web", "data"), [
      regionManifestEntry("summer_palace", "颐和园", "./data"),
      regionManifestEntry("tsinghua_campus", "清华大学", "./data/regions/tsinghua_campus")
    ]],
    [path.join(repoRoot, "cpp", "data"), [
      regionManifestEntry("summer_palace", "颐和园", "../cpp/data"),
      regionManifestEntry("tsinghua_campus", "清华大学", "../cpp/data/regions/tsinghua_campus")
    ]]
  ]);
  for (const [root, manifest] of manifests) {
    await writeJson(root, path.join("regions", "manifest.json"), manifest);
  }
}

function regionManifestEntry(id, name, basePath) {
  return {
    id,
    name,
    city: "北京",
    status: "active",
    map_region: "dataset",
    description: `${name}旅行区域，包含可选目的地、真实路网过渡节点、设施、美食和日记数据。`,
    nodes_path: `${basePath}/osm_nodes.json`,
    edges_path: `${basePath}/osm_edges.json`,
    spots_path: `${basePath}/spots.json`,
    roads_path: `${basePath}/roads.json`,
    facilities_path: `${basePath}/facilities.json`,
    restaurants_path: `${basePath}/restaurants.json`,
    diaries_path: `${basePath}/diaries/index.json`
  };
}

async function generateScene(scene) {
  if (scene.source === "local-pack") {
    await generateLocalScene(scene);
    return;
  }
  const overpass = await fetchOverpass(scene);
  const { nodes, edges } = buildOsmOutput(scene, overpass);
  const spots = buildSpots(scene);
  const roads = buildRoads(scene, nodes, edges);
  const facilities = buildFacilities(scene);
  const restaurants = buildRestaurants(scene);
  const users = buildUsers(scene);
  const diaries = buildDiaryIndex(scene);
  validateScene(scene, nodes, edges, spots);
  await writeScene(scene, { nodes, edges, spots, roads, facilities, restaurants, users, diaries });
  console.log(`Generated ${scene.label}: ${nodes.length} nodes, ${edges.length} directed edges, ${spots.length} spots.`);
}

async function main() {
  for (const id of sceneIds) {
    await generateScene(SCENES[id]);
  }
  await writeManifest();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
