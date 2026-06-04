const DATA_PATHS = {
  nodes: ["./data/osm_nodes.json", "../cpp/data/osm_nodes.json"],
  edges: ["./data/osm_edges.json", "../cpp/data/osm_edges.json"],
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
const ROUTE_STRATEGIES = {
  distance: {
    label: "最短距离",
    algorithm: "Dijkstra 以道路长度作为边权",
    color: "#e35d3f"
  },
  time: {
    label: "最短时间",
    algorithm: "Dijkstra 以理想速度换算时间作为边权",
    color: "#fd8b00"
  },
  congestion: {
    label: "拥挤度时间",
    algorithm: "Dijkstra 以 拥挤度 * 理想速度 换算真实时间",
    color: "#008733"
  },
  transport: {
    label: "交通工具策略",
    algorithm: "Dijkstra 自动在步行/骑行可达边中选择时间更短的交通方式",
    color: "#0058bc"
  }
};
const MAP_REGIONS = {
  china: { center: [35.8617, 104.1954], zoom: 4 },
  beijing: { center: [39.9042, 116.4074], zoom: 11 },
  shanghai: { center: [31.2304, 121.4737], zoom: 11 },
  guangzhou: { center: [23.1291, 113.2644], zoom: 11 },
  shenzhen: { center: [22.5431, 114.0579], zoom: 11 },
  chengdu: { center: [30.5728, 104.0668], zoom: 11 },
  xian: { center: [34.3416, 108.9398], zoom: 11 },
  hangzhou: { center: [30.2741, 120.1551], zoom: 11 },
  wuhan: { center: [30.5928, 114.3055], zoom: 11 },
  chongqing: { center: [29.563, 106.5516], zoom: 10 }
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

const state = {
  map: null,
  nodes: [],
  edges: [],
  spots: [],
  restaurants: [],
  facilities: [],
  users: [],
  diaries: [],
  regionPacks: [],
  markers: new Map(),
  facilityGeoIndex: new Map(),
  spotLshIndex: new Map(),
  diaryLshIndex: new Map(),
  diaryTitleIndex: new Map(),
  edgeLayers: [],
  routeLayers: [],
  poiLayers: [],
  facilityLayers: [],
  selectedNodeId: null,
  mode: "walk",
  routeStrategy: "distance",
  mapBounds: null,
  mapFitted: false,
  mapRegion: "dataset"
};

const byId = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  loadAuthState(); // now safe — DOM is ready
  bindStaticControls();
  bindAuthEvents();
  bindAdminEvents();
  try {
    const [nodes, edges, spots, restaurants, facilities, users, diaries, regionPacks] = await Promise.all([
      loadJson(DATA_PATHS.nodes),
      loadJson(DATA_PATHS.edges),
      loadJson(DATA_PATHS.spots),
      loadJson(DATA_PATHS.restaurants),
      loadJson(DATA_PATHS.facilities),
      loadJson(DATA_PATHS.users),
      loadJson(DATA_PATHS.diaries),
      loadOptionalJson(DATA_PATHS.regions, [])
    ]);
    state.nodes = nodes;
    state.edges = edges;
    state.spots = spots;
    state.restaurants = restaurants;
    state.facilities = facilities;
    state.users = users;
    state.diaries = diaries;
    state.regionPacks = regionPacks;

    initializeMap();
    populateControls();
    renderNodeList(state.nodes);
    buildFacilityGeoIndex();
    buildSimilarityIndexes();
    renderNodeMarkers();
    renderRoadNetwork();
    renderFacilityMapMarkers();
    showNodeDetail(state.nodes[0]);
    recommendSpots();
    searchFacilities();
    renderDiaryList();
    recommendFood();
    byId("loadingState").classList.add("hidden");
  } catch (error) {
    const errMsg = error && error.message ? error.message : String(error || "未知错误");
    byId("loadingState").textContent = `数据加载失败：${errMsg}`;
    byId("mapFallback").hidden = false;
  }
});

async function loadJson(paths) {
  const candidates = Array.isArray(paths) ? paths : [paths];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (!response.ok) throw new Error(`${candidate} ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("数据路径不可用");
}

async function loadOptionalJson(paths, fallback) {
  try {
    return await loadJson(paths);
  } catch {
    return fallback;
  }
}

function bindStaticControls() {
  document.querySelectorAll("[data-view]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      switchView(trigger.dataset.view);
    });
  });

  byId("nodeSearchInput").addEventListener("input", (event) => {
    const keyword = event.target.value.trim().toLowerCase();
    const filtered = state.nodes.filter((node) => textOfNode(node).toLowerCase().includes(keyword));
    renderNodeList(filtered);
  });
  byId("mapRegionSelect").addEventListener("change", (event) => {
    focusMapRegion(event.target.value);
  });
  byId("datasetMapButton").addEventListener("click", () => {
    byId("mapRegionSelect").value = "dataset";
    focusMapRegion("dataset", true);
  });
  byId("regionPackSelect").addEventListener("change", (event) => {
    selectRegionPack(event.target.value);
  });

  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      document.querySelectorAll(".mode-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderRoadNetwork();
    });
  });

  byId("recommendButton").addEventListener("click", recommendSpots);
  byId("userSelect").addEventListener("change", () => {
    const user = selectedUser();
    byId("preferenceInput").value = user ? user.preference_tags.join(" ") : "";
    recommendSpots();
    renderDiaryList();
  });
  byId("recommendCategory").addEventListener("change", recommendSpots);
  byId("recommendCategory").addEventListener("change", syncCategoryChips);
  byId("preferenceInput").addEventListener("input", debounce(recommendSpots, 180));
  byId("recommendKeyword").addEventListener("input", debounce(recommendSpots, 180));
  byId("recommendSort").addEventListener("change", recommendSpots);
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      byId("recommendCategory").value = button.dataset.category;
      syncCategoryChips();
      recommendSpots();
    });
  });

  byId("routeButton").addEventListener("click", runShortestPath);
  byId("routeStrategySelect").addEventListener("change", (event) => {
    state.routeStrategy = event.target.value;
  });
  byId("clearRouteButton").addEventListener("click", clearRouteLayers);
  byId("runMultiButton").addEventListener("click", runMultiStopRoute);
  document.querySelectorAll(".facility-chip").forEach((button) => {
    button.addEventListener("click", () => {
      byId("facilityKeyword").value = button.dataset.facility;
      byId("facilityTypeSelect").value = "";
      searchFacilities();
      switchView("queryView");
    });
  });

  byId("facilitySearchButton").addEventListener("click", searchFacilities);
  byId("facilityKeyword").addEventListener("input", debounce(searchFacilities, 180));
  byId("facilityTypeSelect").addEventListener("change", searchFacilities);
  byId("facilityOriginSelect").addEventListener("change", searchFacilities);
  byId("facilityRangeSelect").addEventListener("change", searchFacilities);

  byId("diarySearchButton").addEventListener("click", renderDiaryList);
  byId("diaryKeyword").addEventListener("input", debounce(renderDiaryList, 180));
  byId("diarySort").addEventListener("change", renderDiaryList);
  byId("diarySearchMode").addEventListener("change", renderDiaryList);
  byId("diaryCreateButton").addEventListener("click", createDiaryEntry);
  byId("indoorRouteButton").addEventListener("click", runIndoorRoute);
  byId("aigcDraftButton").addEventListener("click", generateDiaryDraft);
  byId("aigcAnimationButton").addEventListener("click", generateAigcStoryboard);

  byId("foodRecommendButton").addEventListener("click", recommendFood);
  byId("foodSpotSelect").addEventListener("change", recommendFood);
  byId("cuisineSelect").addEventListener("change", recommendFood);
  byId("foodSortSelect").addEventListener("change", recommendFood);
  byId("foodKeyword").addEventListener("input", debounce(recommendFood, 180));
}

function switchView(viewId) {
  document.querySelectorAll(".tab-button, .mobile-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === viewId);
  });
  if (state.map) {
    setTimeout(() => {
      state.map.invalidateSize();
      if (viewId === "routeView" && state.mapRegion === "dataset") fitMapToData();
    }, 80);
  }
}

function initializeMap() {
  if (!window.L) {
    byId("mapFallback").hidden = false;
    byId("map").hidden = true;
    return;
  }
  byId("mapFallback").hidden = true;

  state.mapBounds = L.latLngBounds(state.nodes.map((node) => [node.lat, node.lon]));
  state.map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
    worldCopyJump: true,
    minZoom: 4,
    maxZoom: 18
  }).setView(averageLatLng(state.nodes), 15);

  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 4,
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors · 本地道路/设施数据"
  }).addTo(state.map);

  let tileErrorCount = 0;
  tileLayer.on("tileerror", () => {
    tileErrorCount++;
    if (tileErrorCount >= 3) {
      byId("loadingState").classList.remove("hidden");
      byId("loadingState").style.background = "rgba(253, 139, 0, 0.12)";
      byId("loadingState").textContent = "在线地图瓦片暂不可用，正在使用本地道路、建筑和设施数据。";
    }
  });
  tileLayer.on("load", () => {
    tileErrorCount = 0;
    byId("loadingState").classList.add("hidden");
  });

  addMapResetControl();
  state.map.on("zoomend moveend", updateLocalOverlayVisibility);
  updateMapDataNotice();
  setTimeout(() => state.map.invalidateSize(), 0);
  setTimeout(() => state.map.invalidateSize(), 300);
}

function fitMapToData(force = false) {
  if (!state.map || !state.mapBounds || (!force && state.mapFitted)) return;
  state.map.fitBounds(state.mapBounds, { padding: [44, 44], maxZoom: 16 });
  state.mapFitted = true;
  state.mapRegion = "dataset";
  updateMapDataNotice();
}

function focusMapRegion(region, force = false) {
  if (!state.map) return;
  if (region === "dataset") {
    fitMapToData(true);
    return;
  }
  const preset = MAP_REGIONS[region];
  if (!preset) return;
  state.mapRegion = region;
  state.mapFitted = false;
  state.map.setView(preset.center, preset.zoom, { animate: !force });
  updateLocalOverlayVisibility();
  updateMapDataNotice();
}

function updateLocalOverlayVisibility() {
  if (!state.map) return;
  const showLocal = state.map.getZoom() >= 13;
  [...state.edgeLayers, ...state.facilityLayers, ...state.markers.values()].forEach((layer) => {
    if (!layer) return;
    if (showLocal && !state.map.hasLayer(layer)) layer.addTo(state.map);
    if (!showLocal && state.map.hasLayer(layer)) layer.remove();
  });
}

function updateMapDataNotice() {
  const notice = byId("mapDataNotice");
  if (!notice) return;
  notice.textContent = state.mapRegion === "dataset"
    ? `当前数据包：颐和园内部 ${state.nodes.length} 个节点、${state.edges.length} 条有向边，支持路线/设施图上距离计算。`
    : "全国底图可浏览；路线、设施和多点游览算法会在切回“颐和园数据集”后使用本地道路图。";
}

function addMapResetControl() {
  if (!state.map || !window.L) return;
  const ResetControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const button = L.DomUtil.create("button", "leaflet-control map-reset-control");
      button.type = "button";
      button.title = "复位地图视野";
      button.setAttribute("aria-label", "复位地图视野");
      button.textContent = "↺";
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.preventDefault(event);
        fitMapToData(true);
      });
      return button;
    }
  });
  state.map.addControl(new ResetControl());
}

function populateControls() {
  fillNodeSelect(byId("startSelect"), state.nodes);
  fillNodeSelect(byId("goalSelect"), state.nodes);
  fillNodeSelect(byId("facilityOriginSelect"), state.nodes);
  fillSpotSelect(byId("foodSpotSelect"), state.spots);
  fillUserSelect();
  fillCategorySelect();
  fillFacilityTypeSelect();
  fillCuisineSelect();
  fillIndoorSelects();
  fillRegionPackSelect();
  renderMultiStopList();

  byId("startSelect").value = "1";
  byId("goalSelect").value = "8";
  byId("facilityOriginSelect").value = "1";
  byId("foodSpotSelect").value = "8";
  const user = selectedUser();
  byId("preferenceInput").value = user ? user.preference_tags.join(" ") : "";

  if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
}

function fillRegionPackSelect() {
  const select = byId("regionPackSelect");
  if (!select) return;
  const packs = state.regionPacks.length ? state.regionPacks : [{
    id: "summer_palace",
    name: "颐和园数据包",
    city: "北京",
    status: "active",
    map_region: "dataset",
    description: "当前可运行的算法数据包。"
  }];
  select.innerHTML = "";
  packs.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = `${pack.name} · ${regionPackStatusLabel(pack.status)}`;
    select.appendChild(option);
  });
  select.value = packs.find((pack) => pack.status === "active")?.id || packs[0]?.id || "";
  renderRegionPackStatus(select.value);
}

function selectRegionPack(packId) {
  const pack = findRegionPack(packId);
  if (!pack) return;
  if (pack.map_region && byId("mapRegionSelect")) {
    byId("mapRegionSelect").value = pack.map_region;
    focusMapRegion(pack.map_region, true);
  }
  renderRegionPackStatus(pack.id);
}

function renderRegionPackStatus(packId) {
  const container = byId("regionPackStatus");
  if (!container) return;
  const pack = findRegionPack(packId);
  if (!pack) {
    container.textContent = "区域数据包清单未加载。";
    return;
  }
  const active = pack.status === "active";
  container.innerHTML = `
    <div class="pack-row">
      <strong>${escapeHtml(regionPackStatusLabel(pack.status))}</strong>
      <span>${escapeHtml(pack.city || "区域")}</span>
    </div>
    <p>${escapeHtml(pack.description || "")}</p>
    <small>${active ? `${state.nodes.length} 节点 · ${state.edges.length} 有向边 · ${state.facilities.length} 设施` : "已预留数据包接口，接入路网 JSON 后即可复用现有算法。"}</small>
  `;
}

function findRegionPack(packId) {
  return state.regionPacks.find((pack) => pack.id === packId);
}

function regionPackStatusLabel(status) {
  if (status === "active") return "已激活";
  if (status === "template") return "模板";
  return "待接入";
}

function fillNodeSelect(select, nodes) {
  select.innerHTML = "";
  nodes.forEach((node) => {
    const option = document.createElement("option");
    option.value = node.id;
    option.textContent = `${node.id}. ${node.name}`;
    select.appendChild(option);
  });
}

function fillSpotSelect(select, spots) {
  select.innerHTML = "";
  spots.forEach((spot) => {
    const option = document.createElement("option");
    option.value = spot.id;
    option.textContent = `${spot.id}. ${spot.name}`;
    select.appendChild(option);
  });
}

function fillUserSelect() {
  const select = byId("userSelect");
  select.innerHTML = "";
  state.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.name} · ${user.preference_tags.join("/")}`;
    select.appendChild(option);
  });
}

function fillCategorySelect() {
  const select = byId("recommendCategory");
  const categories = unique(state.spots.map((spot) => spot.category));
  select.innerHTML = '<option value="">全部分类</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
  syncCategoryChips();
}

function fillFacilityTypeSelect() {
  const select = byId("facilityTypeSelect");
  select.innerHTML = '<option value="">全部设施</option>';
  unique(state.facilities.map((facility) => facility.type)).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

function fillCuisineSelect() {
  const select = byId("cuisineSelect");
  select.innerHTML = '<option value="">全部菜系</option>';
  unique(state.restaurants.map((restaurant) => restaurant.cuisine)).forEach((cuisine) => {
    const option = document.createElement("option");
    option.value = cuisine;
    option.textContent = cuisine;
    select.appendChild(option);
  });
}

function fillIndoorSelects() {
  const start = byId("indoorStartSelect");
  const goal = byId("indoorGoalSelect");
  [start, goal].forEach((select) => {
    select.innerHTML = "";
    INDOOR_NODES.forEach((node) => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} · ${node.floor}`;
      select.appendChild(option);
    });
  });
  start.value = "gate";
  goal.value = "room";
}

function runIndoorRoute() {
  const start = byId("indoorStartSelect").value;
  const goal = byId("indoorGoalSelect").value;
  const result = shortestIndoorPath(start, goal);
  const container = byId("indoorRouteResult");
  if (!result) {
    container.textContent = "当前室内节点不可达。";
    return;
  }
  container.innerHTML = `
    <strong>室内最短路径 ${result.distance}m</strong>
    <ol>${result.path.map((id) => {
      const node = INDOOR_NODES.find((item) => item.id === id);
      return `<li>${escapeHtml(node.name)} · ${escapeHtml(node.floor)}</li>`;
    }).join("")}</ol>
  `;
}

function shortestIndoorPath(start, goal) {
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const queue = [{ node: start, distance: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (current.distance !== dist.get(current.node)) continue;
    if (current.node === goal) break;
    indoorNeighbors(current.node).forEach(([next, weight]) => {
      const nextDistance = current.distance + weight;
      if (!dist.has(next) || nextDistance < dist.get(next)) {
        dist.set(next, nextDistance);
        prev.set(next, current.node);
        queue.push({ node: next, distance: nextDistance });
      }
    });
  }
  if (!dist.has(goal)) return null;
  const path = [];
  for (let node = goal; node !== undefined; node = prev.get(node)) {
    path.push(node);
    if (node === start) break;
  }
  path.reverse();
  return { path, distance: dist.get(goal) };
}

function indoorNeighbors(id) {
  const neighbors = [];
  INDOOR_EDGES.forEach(([from, to, weight]) => {
    if (from === id) neighbors.push([to, weight]);
    if (to === id) neighbors.push([from, weight]);
  });
  return neighbors;
}

function renderNodeList(nodes) {
  const container = byId("nodeList");
  container.innerHTML = "";
  nodes.forEach((node) => {
    const item = document.createElement("div");
    item.className = "node-item";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = node.name;
    button.addEventListener("click", () => focusNode(node.id));

    const meta = document.createElement("small");
    meta.textContent = `${node.type} · ${formatCoordinate(node.lat)}, ${formatCoordinate(node.lon)}`;

    const left = document.createElement("div");
    left.append(button, meta);

    const add = document.createElement("input");
    add.type = "checkbox";
    add.className = "stop-check";
    add.title = "加入多点游览";
    add.dataset.nodeId = node.id;
    add.checked = isMultiStopChecked(node.id);
    add.addEventListener("change", () => setMultiStopChecked(node.id, add.checked));

    item.append(left, add);
    container.appendChild(item);
  });
}

function renderMultiStopList() {
  const container = byId("multiStopList");
  container.innerHTML = "";
  state.nodes.filter((node) => Number(node.spot_id) > 0).forEach((node) => {
    const label = document.createElement("label");
    label.className = "stop-item";
    label.innerHTML = `
      <input class="stop-check" type="checkbox" data-node-id="${node.id}">
      <span>${escapeHtml(node.name)}<small>${escapeHtml(node.description || node.type)}</small></span>
    `;
    const checkBox = label.querySelector("input");
    checkBox.checked = isMultiStopChecked(node.id);
    checkBox.addEventListener("change", () => setMultiStopChecked(node.id, checkBox.checked));
    container.appendChild(label);
  });
}

function renderNodeMarkers() {
  if (!state.map) return;
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();

  state.nodes.forEach((node) => {
    const isSpotNode = Number(node.spot_id) > 0;
    const marker = L.circleMarker([node.lat, node.lon], {
      title: node.name,
      radius: isSpotNode ? 7 : 3.2,
      color: isSpotNode ? "#0b4f42" : "#56625e",
      weight: isSpotNode ? 2.4 : 1.1,
      fillColor: isSpotNode ? "#f4b942" : "#f8fbf9",
      fillOpacity: isSpotNode ? 0.92 : 0.66
    }).addTo(state.map);
    marker.bindPopup(`<p class="popup-title">${escapeHtml(node.name)}</p><p class="popup-text">${escapeHtml(node.description || node.type)}</p>`);
    if (isSpotNode) {
      marker.bindTooltip(node.name, {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        className: "map-label spot-label"
      });
    }
    marker.on("click", () => showNodeDetail(node));
    state.markers.set(node.id, marker);
  });
}

function renderFacilityMapMarkers() {
  if (!state.map) return;
  state.facilityLayers.forEach((layer) => layer.remove());
  state.facilityLayers = [];

  state.facilities.forEach((facility) => {
    const marker = L.marker([facility.lat, facility.lon], {
      title: facility.name,
      icon: L.divIcon({
        className: `facility-map-marker ${facilityMarkerClass(facility.type)}`,
        html: `<span>${escapeHtml(facilityIconText(facility.type))}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      })
    }).addTo(state.map);
    marker.bindTooltip(`${facility.name} · ${facility.type}`, {
      direction: "top",
      offset: [0, -10],
      className: "map-label facility-label"
    });
    marker.bindPopup(`
      <p class="popup-title">${escapeHtml(facility.name)}</p>
      <p class="popup-text">${escapeHtml(facility.type)} · 评分 ${Number(facility.rating || 0).toFixed(1)}</p>
    `);
    state.facilityLayers.push(marker);
  });
}

function renderRoadNetwork() {
  if (!state.map) return;
  state.edgeLayers.forEach((layer) => layer.remove());
  state.edgeLayers = [];

  state.edges
    .filter((edge) => edge.from < edge.to && edgeSupportsMode(edge, state.mode))
    .forEach((edge) => {
      const from = findNode(edge.from);
      const to = findNode(edge.to);
      if (!from || !to) return;
      const layer = L.polyline([[from.lat, from.lon], [to.lat, to.lon]], {
        color: edge.mode === "bike" ? "#175c9f" : "#2f6856",
        weight: edge.mode === "bike" ? 3.4 : 3,
        opacity: 0.68,
        dashArray: edge.mode === "both" ? null : "6 8"
      }).addTo(state.map);
      layer.bindTooltip(`${edge.road_name} · ${edge.distance}m · ${edge.mode}`);
      state.edgeLayers.push(layer);
    });
}

function showNodeDetail(node) {
  if (!node) return;
  state.selectedNodeId = node.id;
  const spot = findSpot(node.spot_id);
  const image = resolveAssetPath(node.image);
  const detail = byId("detail-panel");
  detail.innerHTML = `
    <img class="detail-image" src="${image}" alt="${escapeHtml(node.name)}">
    <p class="eyebrow">Node ${node.id} · ${escapeHtml(node.type)}</p>
    <h2>${escapeHtml(node.name)}</h2>
    <p>${escapeHtml(node.description || "暂无简介。")}</p>
    <div class="detail-meta">
      <div class="meta-pill"><span>关联景点</span><strong>${spot ? escapeHtml(spot.name) : "真实路网节点"}</strong></div>
      <div class="meta-pill"><span>评分</span><strong>${spot ? Number(spot.rating).toFixed(1) : "-"}</strong></div>
      <div class="meta-pill"><span>热度</span><strong>${spot ? spot.heat : "-"}</strong></div>
      <div class="meta-pill"><span>坐标</span><strong>${formatCoordinate(node.lat)}, ${formatCoordinate(node.lon)}</strong></div>
    </div>
    <div class="detail-actions">
      <button class="node-action" type="button" data-action="start">设为起点</button>
      <button class="node-action" type="button" data-action="goal">设为终点</button>
      <button class="node-action full" type="button" data-action="multi">加入多点游览</button>
    </div>
  `;
  const img = detail.querySelector("img");
  img.addEventListener("error", () => {
    img.src = FALLBACK_IMAGE;
  }, { once: true });
  detail.querySelector('[data-action="start"]').addEventListener("click", () => {
    byId("startSelect").value = node.id;
    byId("facilityOriginSelect").value = node.id;
    summarize(`已将 ${node.name} 设为当前位置。`);
  });
  detail.querySelector('[data-action="goal"]').addEventListener("click", () => {
    byId("goalSelect").value = node.id;
    switchView("routeView");
    summarize(`已将 ${node.name} 设为终点。`);
  });
  detail.querySelector('[data-action="multi"]').addEventListener("click", () => {
    setMultiStopChecked(node.id, true);
    switchView("routeView");
    summarize(`已将 ${node.name} 加入多点游览。`);
  });
}

function recommendSpots() {
  const user = selectedUser();
  const category = byId("recommendCategory").value;
  const sortMode = byId("recommendSort").value;
  const preferenceInput = byId("preferenceInput").value.trim().toLowerCase();
  const keywordInput = byId("recommendKeyword").value.trim().toLowerCase();
  // Tokenize preference tokens for OR-match filtering (each token filters independently)
  const preferenceTokens = preferenceInput.split(/\s+/).filter(Boolean);
  // keywordInput is a single search phrase (substring match), preference tokens are OR-matched
  const effectiveKeyword = keywordInput || preferenceTokens.join(" ");
  const preference = `${preferenceInput} ${(user?.preference_tags || []).join(" ")}`.trim();
  const categoryPreference = (user?.preferred_categories || []).join(" ");
  const maxHeat = Math.max(...state.spots.map((spot) => Number(spot.heat) || 0), 1);
  const lshCandidates = getLshCandidates(state.spotLshIndex, preference || effectiveKeyword || categoryPreference, state.spots, 36);
  let scopedCandidates = lshCandidates
    .filter((spot) => (!category || spot.category === category) && matchesSpotSearch(spot, effectiveKeyword, preferenceTokens));
  if (scopedCandidates.length < 10) {
    scopedCandidates = state.spots.filter((spot) => (!category || spot.category === category) && matchesSpotSearch(spot, effectiveKeyword, preferenceTokens));
  }
  const scored = scopedCandidates
    .map((spot) => {
      const match = spotInterestScore(spot, preference, categoryPreference);
      const ratingScore = Number(spot.rating) / 5;
      const heatScore = Number(spot.heat) / maxHeat;
      const score = 0.34 * ratingScore + 0.28 * heatScore + 0.38 * match;
      return { spot, score, match, ratingScore, heatScore, sortScore: spotSortScore(sortMode, score, ratingScore, heatScore, match) };
    });
  const results = topK(scored, 10, (item) => item.sortScore);

  renderRecommendationCards(results, {
    totalCount: state.spots.length,
    candidateCount: scopedCandidates.length,
    lshBucketCount: lshCandidates.length,
    category,
    keyword,
    sortMode
  });
}

function renderRecommendationCards(results, meta = {}) {
  const container = byId("recommendResults");
  const note = byId("recommendAlgorithmNote");
  if (note) {
    note.innerHTML = `
      <span>LSH 兴趣候选 ${meta.lshBucketCount || 0}/${meta.totalCount || 0}</span>
      <span>${meta.category ? `分类过滤后 ${meta.candidateCount || 0} 条` : `候选参与评分 ${meta.candidateCount || 0} 条`}</span>
      <span>${meta.keyword ? "名称/类别/关键字查询" : "个性化推荐"}</span>
      <span>${recommendSortLabel(meta.sortMode)} · 固定容量最小堆保留 Top-10</span>
    `;
  }
  container.innerHTML = "";
  if (!results || !results.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>没有找到匹配的目的地，请尝试调整筛选条件。</p></div>`;
    return;
  }
  results.forEach((item, index) => {
    const node = findNodeBySpot(item.spot.id);
    const image = recommendationImage(item.spot, node);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <img class="card-media" src="${image}" alt="${escapeHtml(item.spot.name)}">
      <p class="eyebrow">推荐 ${index + 1} · Top-K</p>
      <h3>${escapeHtml(item.spot.name)}</h3>
      <small>${escapeHtml(item.spot.category)} · ${escapeHtml(item.spot.tags)}</small>
      <div class="score-row">
        <span class="pill">评分 ${Number(item.spot.rating).toFixed(1)}</span>
        <span class="pill amber">热度 ${item.spot.heat}</span>
        <span class="pill red">兴趣匹配 ${(item.match * 100).toFixed(0)}%</span>
        <span class="pill">综合 ${(item.score * 100).toFixed(1)}</span>
      </div>
      <div class="card-actions">
        ${node ? `<button class="link-button" data-focus-node="${node.id}">地图定位</button><button class="link-button" data-route-goal="${node.id}">设为终点</button>` : ""}
      </div>
    `;
    container.appendChild(card);
  });
  bindResultButtons(container);
}

function runShortestPath() {
  const start = Number(byId("startSelect").value);
  const goal = Number(byId("goalSelect").value);
  const result = shortestPath(start, goal, state.mode, state.routeStrategy);
  if (!result) {
    summarize("当前交通方式下未找到可达路径。");
    return;
  }
  drawRoute(result.path, routeStrategyInfo().color);
  summarizeRoute(routeStrategyInfo().label, result);
}

function runMultiStopRoute() {
  const start = Number(byId("startSelect").value);
  const targets = selectedMultiStops().filter((id) => id !== start);
  if (!targets.length) {
    summarize("请至少勾选一个多点游览目标。");
    return;
  }
  if (targets.length > 12) {
    summarize("目标节点超过 12 个，状态压缩 DP 演示建议控制在 12 个以内。");
    return;
  }

  const tsp = solveTspDp(start, targets, state.mode, state.routeStrategy);
  if (!tsp) {
    summarize("多点游览中存在不可达节点。");
    return;
  }

  drawRoute(tsp.fullPath, "#0058bc");
  summarizeMultiRoute(tsp.order, tsp);
}

function solveTspDp(start, targets, mode, strategy = state.routeStrategy) {
  const points = [start, ...targets];
  const n = targets.length;
  const pairRoutes = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null));
  for (let i = 0; i < points.length; i += 1) {
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) {
        pairRoutes[i][j] = { path: [points[i]], distance: 0 };
      } else {
        const route = shortestPath(points[i], points[j], mode, strategy);
        if (!route) return null;
        pairRoutes[i][j] = route;
      }
    }
  }

  const fullMask = (1 << n) - 1;
  const inf = Number.POSITIVE_INFINITY;
  const dp = Array.from({ length: 1 << n }, () => Array(n).fill(inf));
  const parent = Array.from({ length: 1 << n }, () => Array(n).fill(-1));

  for (let i = 0; i < n; i += 1) {
    dp[1 << i][i] = pairRoutes[0][i + 1].cost;
  }

  for (let mask = 1; mask <= fullMask; mask += 1) {
    for (let last = 0; last < n; last += 1) {
      if (!(mask & (1 << last)) || dp[mask][last] === inf) continue;
      for (let next = 0; next < n; next += 1) {
        if (mask & (1 << next)) continue;
        const nextMask = mask | (1 << next);
        const cost = dp[mask][last] + pairRoutes[last + 1][next + 1].cost;
        if (cost < dp[nextMask][next]) {
          dp[nextMask][next] = cost;
          parent[nextMask][next] = last;
        }
      }
    }
  }

  let bestEnd = -1;
  let best = inf;
  for (let i = 0; i < n; i += 1) {
    if (dp[fullMask][i] < best) {
      best = dp[fullMask][i];
      bestEnd = i;
    }
  }
  if (bestEnd < 0) return null;

  const orderIndexes = [];
  for (let mask = fullMask, cur = bestEnd; cur >= 0;) {
    orderIndexes.push(cur);
    const prev = parent[mask][cur];
    mask ^= 1 << cur;
    cur = prev;
  }
  orderIndexes.reverse();

  const order = [];
  const fullPath = [start];
  let totalDistance = 0;
  let totalMinutes = 0;
  let congestionTotal = 0;
  let fromIndex = 0;
  orderIndexes.forEach((targetIndex) => {
    const toIndex = targetIndex + 1;
    const route = pairRoutes[fromIndex][toIndex];
    order.push({ from: points[fromIndex], to: points[toIndex], result: route });
    fullPath.push(...route.path.slice(1));
    totalDistance += route.distance;
    totalMinutes += route.minutes;
    congestionTotal += route.averageCongestion;
    fromIndex = toIndex;
  });
  return {
    order,
    total: totalDistance,
    totalCost: best,
    totalDistance,
    totalMinutes,
    averageCongestion: order.length ? congestionTotal / order.length : 1,
    fullPath,
    strategy
  };
}

function shortestPath(start, goal, mode, strategy = state.routeStrategy) {
  if (start === goal) {
    return { path: [start], distance: 0, cost: 0, minutes: 0, averageCongestion: 1, strategy };
  }
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const prevEdge = new Map();
  const queue = [{ node: start, distance: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (current.distance !== dist.get(current.node)) continue;
    if (current.node === goal) break;

    neighborsOf(current.node, mode, strategy).forEach((edge) => {
      const weight = edgeWeight(edge, mode, strategy);
      const nextDistance = current.distance + weight.cost;
      if (!dist.has(edge.to) || nextDistance < dist.get(edge.to)) {
        dist.set(edge.to, nextDistance);
        prev.set(edge.to, current.node);
        prevEdge.set(edge.to, weight);
        queue.push({ node: edge.to, distance: nextDistance });
      }
    });
  }

  if (!dist.has(goal)) return null;
  const path = [];
  const segments = [];
  for (let node = goal; node !== undefined; node = prev.get(node)) {
    path.push(node);
    if (prevEdge.has(node)) segments.push(prevEdge.get(node));
    if (node === start) break;
  }
  path.reverse();
  segments.reverse();
  if (path[0] !== start) return null;
  const distance = segments.reduce((total, segment) => total + segment.distance, 0);
  const minutes = segments.reduce((total, segment) => total + segment.minutes, 0);
  const averageCongestion = segments.length
    ? segments.reduce((total, segment) => total + segment.congestion, 0) / segments.length
    : 1;
  return {
    path,
    distance,
    cost: dist.get(goal),
    minutes,
    averageCongestion,
    strategy,
    segments
  };
}

function neighborsOf(id, mode, strategy = state.routeStrategy) {
  return state.edges.filter((edge) => Number(edge.from) === Number(id) && edgeSupportsMode(edge, mode, strategy));
}

function edgeSupportsMode(edge, mode, strategy = state.routeStrategy) {
  if (strategy === "transport") return ["both", "walk", "bike"].includes(edge.mode);
  return edge.mode === "both" || edge.mode === mode;
}

function edgeWeight(edge, mode, strategy = state.routeStrategy) {
  const distance = Number(edge.distance) || 0;
  const travelMode = strategy === "transport" && (edge.mode === "bike" || edge.mode === "both") ? "bike" : mode;
  const idealSpeed = travelMode === "bike" ? 12 : 4.5;
  const congestion = strategy === "time" ? 1 : edgeCongestion(edge);
  const realSpeed = Math.max(1, idealSpeed * congestion);
  const minutes = distance / (realSpeed * 1000 / 60);
  const cost = strategy === "distance" ? distance : minutes;
  return { cost, distance, minutes, congestion, travelMode };
}

function edgeCongestion(edge) {
  const name = `${edge.road_name || ""}${edge.from}-${edge.to}`;
  const hash = stableFraction(name);
  return clamp(0.62 + hash * 0.36, 0.62, 0.98);
}

function drawRoute(path, color) {
  clearRouteLayers(false);
  if (!state.map || path.length < 2) return;
  const latLngs = path.reduce((acc, id) => {
    const node = findNode(id);
    if (node && node.lat != null && node.lon != null) {
      acc.push([node.lat, node.lon]);
    }
    return acc;
  }, []);
  if (latLngs.length < 2) return;
  const bg = L.polyline(latLngs, {
    color: "#1f2d2c",
    weight: 13,
    opacity: 0.55
  }).addTo(state.map);
  state.routeLayers.push(bg);
  const fg = L.polyline(latLngs, {
    color,
    weight: 6,
    opacity: 0.94
  }).addTo(state.map);
  state.routeLayers.push(fg);
  path.forEach((id, index) => {
    const node = findNode(id);
    const marker = L.circleMarker([node.lat, node.lon], {
      radius: index === 0 || index === path.length - 1 ? 8 : 6,
      color: "#1f2d2c",
      weight: 2.4,
      fillColor: color,
      fillOpacity: 0.92
    }).addTo(state.map);
    marker.bindTooltip(node.name);
    state.routeLayers.push(marker);
  });
  state.map.fitBounds(bg.getBounds(), { padding: [48, 48] });
}

function clearRouteLayers(writeSummary = true) {
  state.routeLayers.forEach((layer) => layer.remove());
  state.routeLayers = [];
  if (writeSummary) summarize("路线已清除，可以重新选择起终点。");
}

function searchFacilities() {
  const originRaw = byId("facilityOriginSelect").value;
  const origin = originRaw !== "" ? Number(originRaw) : 1;
  const type = byId("facilityTypeSelect").value;
  const keyword = byId("facilityKeyword").value.trim().toLowerCase();
  const range = Number(byId("facilityRangeSelect").value || 99999);
  const originNode = findNode(origin);
  const geoCandidates = nearbyFacilitiesByGeoHash(originNode, 5);
  const results = geoCandidates
    .filter((facility) => (!type || facility.type === type) && kmpContains(textOfFacility(facility).toLowerCase(), keyword))
    .map((facility) => {
      const distance = facilityGraphDistance(origin, facility);
      return { facility, distance };
    })
    .filter((item) => item.distance <= range)
    .sort((a, b) => a.distance - b.distance || b.facility.rating - a.facility.rating)
    .slice(0, 12);

  renderFacilityCards(results, {
    prefix: originNode ? geohashEncode(originNode.lat, originNode.lon, 5) : "",
    candidateCount: geoCandidates.length,
    range
  });
  drawFacilityMarkers(results);
}

function renderFacilityCards(results, meta = {}) {
  const container = byId("facilityResults");
  container.innerHTML = "";
  const summary = document.createElement("article");
  summary.className = "result-card";
  summary.innerHTML = `
    <p class="eyebrow">GeoHash 附近检索</p>
    <h3>候选桶 ${escapeHtml(meta.prefix || "-")} · ${meta.candidateCount || 0} 个候选设施</h3>
    <p>先用 GeoHash 前缀缩小附近兴趣点候选集，再按图上最短路径距离排序；当前范围 ${meta.range >= 99999 ? "全部可达" : `${meta.range} 米内`}。</p>
  `;
  container.appendChild(summary);
  results.forEach((item, index) => {
    const node = findNodeBySpot(item.facility.near_spot_id);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <p class="eyebrow">场所 ${index + 1} · ${escapeHtml(item.facility.type)}</p>
      <h3>${escapeHtml(item.facility.name)}</h3>
      <small>${escapeHtml(item.facility.tags)} · 图上路径约 ${item.distance.toFixed(1)} 米</small>
      <div class="score-row">
        <span class="pill">评分 ${Number(item.facility.rating).toFixed(1)}</span>
        <span class="pill amber">热度 ${item.facility.heat}</span>
        <span class="pill">GeoHash ${escapeHtml(geohashEncode(item.facility.lat, item.facility.lon, 5))}</span>
      </div>
      <div class="card-actions">
        ${node ? `<button class="link-button" data-focus-node="${node.id}">定位附近景点</button>` : ""}
      </div>
    `;
    container.appendChild(card);
  });
  bindResultButtons(container);
}

function drawFacilityMarkers(results) {
  clearPoiLayers();
  if (!state.map) return;
  results.slice(0, 8).forEach((item) => {
    const marker = L.circleMarker([item.facility.lat, item.facility.lon], {
      radius: 6,
      color: "#315f8f",
      weight: 2,
      fillColor: "#dceafe",
      fillOpacity: 0.88
    }).addTo(state.map);
    marker.bindTooltip(`${item.facility.name} · ${item.facility.type}`);
    state.poiLayers.push(marker);
  });
}

function clearPoiLayers() {
  state.poiLayers.forEach((layer) => layer.remove());
  state.poiLayers = [];
}

const GEOHASH_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function buildFacilityGeoIndex(precision = 5) {
  state.facilityGeoIndex.clear();
  state.facilities.forEach((facility) => {
    const code = geohashEncode(facility.lat, facility.lon, precision);
    if (!state.facilityGeoIndex.has(code)) state.facilityGeoIndex.set(code, []);
    state.facilityGeoIndex.get(code).push(facility);
  });
}

function nearbyFacilitiesByGeoHash(originNode, precision = 5) {
  if (!originNode) return state.facilities;
  const prefix = geohashEncode(originNode.lat, originNode.lon, precision);
  const candidates = state.facilityGeoIndex.get(prefix) || [];
  if (candidates.length >= 8) return candidates;
  const relaxedPrefix = prefix.slice(0, Math.max(1, precision - 1));
  const relaxed = [];
  state.facilityGeoIndex.forEach((items, code) => {
    if (code.startsWith(relaxedPrefix)) relaxed.push(...items);
  });
  return relaxed.length ? relaxed : state.facilities;
}

function geohashEncode(lat, lon, precision = 6) {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let hash = "";
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (Number(lon) >= mid) {
        idx = idx * 2 + 1;
        lonMin = mid;
      } else {
        idx *= 2;
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (Number(lat) >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx *= 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    bit += 1;
    if (bit === 5) {
      hash += GEOHASH_BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

function renderDiaryList() {
  const keyword = byId("diaryKeyword").value.trim().toLowerCase();
  const mode = byId("diarySearchMode").value;
  const sort = byId("diarySort").value;
  const user = selectedUser();
  const interest = (user?.preference_tags || []).join(" ");
  const exactTitleCandidates = mode === "title" && keyword
    ? (state.diaryTitleIndex.get(keyword) || [])
    : null;
  const lshCandidates = exactTitleCandidates || (sort === "interest"
    ? getLshCandidates(state.diaryLshIndex, `${interest} ${keyword}`, state.diaries, 8)
    : state.diaries);
  const filtered = lshCandidates
    .filter((diary) => matchesDiarySearch(diary, keyword, mode))
    .map((diary) => ({
      diary,
      interestScore: tagScore(`${diary.title} ${diary.destination} ${diary.tags.join(" ")} ${diary.content}`, interest)
    }));
  const results = sort === "interest"
    ? topK(filtered, 10, (item) => item.interestScore * 100000 + Number(item.diary.heat || 0))
    : filtered.sort((a, b) => {
      if (sort === "rating") return Number(b.diary.rating) - Number(a.diary.rating);
      return Number(b.diary.heat) - Number(a.diary.heat);
    });

  const container = byId("diaryResults");
  const note = byId("diaryAlgorithmNote");
  if (note) {
    const searchLabel = mode === "title" ? "标题 HashMap 精确查找" : mode === "destination" ? "目的地 KMP 筛选" : "KMP 全文检索";
    const averageCompression = results.length
      ? results.reduce((total, item) => total + diaryCompressionRatio(item.diary), 0) / results.length
      : 0;
    note.innerHTML = `
      <span>${searchLabel}</span>
      <span>${sort === "interest" ? `LSH 日记候选 ${lshCandidates.length}/${state.diaries.length}` : "热度/评分排序"}</span>
      <span>结果平均 Huffman 压缩率 ${(averageCompression * 100).toFixed(0)}%</span>
    `;
  }
  container.innerHTML = "";
  if (!results.length) {
    container.innerHTML = `
      <article class="result-card">
        <p class="eyebrow">检索结果</p>
        <h3>没有找到匹配日记</h3>
        <p>可以切换全文检索、标题精确或目的地查询，再输入新的关键词。</p>
      </article>
    `;
    return;
  }
  results.forEach((item) => {
    const compression = diaryCompressionRatio(item.diary);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <p class="eyebrow">日记 ${item.diary.id} · ${escapeHtml(item.diary.destination)}</p>
      <h3>${escapeHtml(item.diary.title)}</h3>
      <p>${escapeHtml(item.diary.content)}</p>
      <div class="score-row">
        <span class="pill">评分 ${Number(item.diary.rating).toFixed(1)}</span>
        <span class="pill amber">热度 ${item.diary.heat}</span>
        <span class="pill red">压缩率 ${(compression * 100).toFixed(0)}%</span>
        <span class="pill">兴趣匹配 ${(item.interestScore * 100).toFixed(0)}%</span>
      </div>
      ${item.diary.media ? `<small>媒体：${escapeHtml(item.diary.media)}</small>` : ""}
      <div class="card-actions">
        <button class="link-button" type="button" data-diary-view="${item.diary.id}">浏览 +1</button>
        <button class="link-button" type="button" data-diary-rate="${item.diary.id}">当前用户评分</button>
      </div>
    `;
    container.appendChild(card);
  });
  bindDiaryButtons(container);
}

function matchesDiarySearch(diary, keyword, mode) {
  if (!keyword) return true;
  if (mode === "title") return String(diary.title || "").trim().toLowerCase() === keyword;
  if (mode === "destination") return kmpContains(String(diary.destination || "").toLowerCase(), keyword);
  return kmpContains(textOfDiary(diary).toLowerCase(), keyword);
}

function diaryCompressionRatio(diary) {
  return Number(diary.compressed_bytes) / Math.max(1, Number(diary.original_bytes));
}

function createDiaryEntry() {
  const title = byId("diaryTitleInput").value.trim();
  const destination = byId("diaryDestinationInput").value.trim();
  const content = byId("diaryContentInput").value.trim();
  const tags = byId("diaryTagsInput").value
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const mediaFiles = Array.from(byId("diaryMediaFileInput").files || []).map((file) => file.name);
  const media = byId("diaryMediaInput").value.trim() || mediaFiles.join("、");
  if (!title || !destination || !content) {
    byId("aigcStoryboard").innerHTML = "<strong>请先填写标题、目的地和正文。</strong>";
    return;
  }
  const user = selectedUser();
  const originalBytes = utf8ByteLength(content);
  const diary = {
    id: Math.max(0, ...state.diaries.map((item) => Number(item.id) || 0)) + 1,
    title,
    user_id: user?.id || 1,
    destination,
    rating: 4.5,
    heat: 1,
    created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    tags,
    content,
    media,
    original_bytes: originalBytes,
    compressed_bytes: huffmanCompressedBytes(content)
  };
  state.diaries.unshift(diary);
  buildSimilarityIndexes();
  byId("diaryKeyword").value = "";
  byId("diaryTitleInput").value = "";
  byId("diaryDestinationInput").value = "";
  byId("diaryContentInput").value = "";
  byId("diaryTagsInput").value = "";
  byId("diaryMediaInput").value = "";
  byId("diaryMediaFileInput").value = "";
  byId("aigcStoryboard").innerHTML = `<strong>日记已保存</strong><p>${escapeHtml(title)} 已加入统一日记列表，Huffman 压缩率 ${(diaryCompressionRatio(diary) * 100).toFixed(0)}%。</p>`;
  renderDiaryList();
}

function bindDiaryButtons(container) {
  container.querySelectorAll("[data-diary-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const diary = findDiary(Number(button.dataset.diaryView));
      if (!diary) return;
      diary.heat = Number(diary.heat || 0) + 1;
      renderDiaryList();
    });
  });
  container.querySelectorAll("[data-diary-rate]").forEach((button) => {
    button.addEventListener("click", () => {
      const diary = findDiary(Number(button.dataset.diaryRate));
      if (!diary) return;
      const user = selectedUser();
      const userBias = stableFraction(`${user?.id || 1}|${diary.id}`);
      const userRating = 4.1 + userBias * 0.9;
      diary.rating = clamp((Number(diary.rating || 0) + userRating) / 2, 1, 5);
      renderDiaryList();
    });
  });
}

function findDiary(id) {
  return state.diaries.find((diary) => Number(diary.id) === Number(id));
}

function utf8ByteLength(text) {
  if (window.TextEncoder) return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

function huffmanCompressedBytes(text) {
  const freq = new Map();
  Array.from(text).forEach((char) => freq.set(char, (freq.get(char) || 0) + utf8ByteLength(char)));
  const heap = Array.from(freq.values()).sort((a, b) => a - b);
  if (!heap.length) return 0;
  if (heap.length === 1) return Math.max(1, Math.ceil(heap[0] / 8));
  let bitLength = 0;
  while (heap.length > 1) {
    const first = heap.shift();
    const second = heap.shift();
    const merged = first + second;
    bitLength += merged;
    const index = heap.findIndex((value) => value >= merged);
    if (index === -1) heap.push(merged);
    else heap.splice(index, 0, merged);
  }
  return Math.max(1, Math.ceil(bitLength / 8));
}

function generateDiaryDraft() {
  const user = selectedUser();
  const preference = (user?.preference_tags || ["文化", "路线"]).join("、");
  byId("aigcStoryboard").innerHTML = `
    <strong>日记草稿</strong>
    <p>今天的路线围绕 ${escapeHtml(preference)} 展开，从入口进入后依次记录建筑、湖景和服务设施体验。系统可将照片描述、景点名称和用户偏好合成为旅游日记初稿。</p>
  `;
}

function generateAigcStoryboard() {
  const user = selectedUser();
  const preference = (user?.preference_tags || ["文化", "路线"]).slice(0, 3);
  const frames = [
    `开场：从用户上传的入口照片识别旅行地点，叠加偏好标签 ${preference.join("、")}。`,
    "转场：沿最短路径展示游览轨迹，突出道路节点和停留点。",
    "中景：把评分、热度和日记关键词生成字幕，说明推荐原因。",
    "结尾：生成 8 秒旅行动画脚本，可继续接入真实 AIGC 视频模型。"
  ];
  byId("aigcStoryboard").innerHTML = `
    <strong>AIGC 动画分镜</strong>
    <ol>${frames.map((frame) => `<li>${escapeHtml(frame)}</li>`).join("")}</ol>
  `;
}

function recommendFood() {
  const spotIdRaw = byId("foodSpotSelect").value;
  const spotId = spotIdRaw !== "" ? Number(spotIdRaw) : 1;
  const cuisine = byId("cuisineSelect").value;
  const keyword = byId("foodKeyword").value.trim().toLowerCase();
  const sortMode = byId("foodSortSelect").value;
  const maxHeat = Math.max(...state.restaurants.map((restaurant) => Number(restaurant.heat) || 0), 1);
  const originNode = findNodeBySpot(spotId) || findNode(1);
  const candidates = state.restaurants
    .filter((restaurant) => (!cuisine || restaurant.cuisine === cuisine) && kmpContains(textOfRestaurant(restaurant).toLowerCase(), keyword))
    .map((restaurant) => {
      const nearNode = findNodeBySpot(restaurant.near_spot_id);
      const route = nearNode && originNode ? shortestPath(originNode.id, nearNode.id, state.mode) : null;
      const distance = route ? route.distance : 9999;
      const ratingScore = Number(restaurant.rating) / 5;
      const heatScore = Number(restaurant.heat) / maxHeat;
      const cuisineScore = cuisine ? (restaurant.cuisine === cuisine ? 1 : 0) : 0.55;
      const distanceScore = 1 / (1 + distance / 900);
      const score = 0.35 * ratingScore + 0.3 * heatScore + 0.2 * cuisineScore + 0.15 * distanceScore;
      return { restaurant, score, distance, nearNode, sortScore: foodSortScore(sortMode, score, ratingScore, heatScore, distanceScore) };
    });
  const results = topK(candidates, 10, (item) => item.sortScore);

  renderFoodCards(results, { candidateCount: candidates.length, totalCount: state.restaurants.length, sortMode });
}

function renderFoodCards(results, meta = {}) {
  const container = byId("foodResults");
  const note = byId("foodAlgorithmNote");
  if (note) {
    note.innerHTML = `
      <span>模糊查找候选 ${meta.candidateCount || 0}/${meta.totalCount || 0}</span>
      <span>${foodSortLabel(meta.sortMode)}</span>
      <span>固定容量最小堆输出 Top-10 美食</span>
    `;
  }
  container.innerHTML = "";
  results.forEach((item, index) => {
    const image = resolveAssetPath(item.nearNode?.image || "");
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      ${image ? `<img class="card-thumb" src="${image}" alt="${escapeHtml(item.restaurant.name)}">` : ""}
      <p class="eyebrow">美食 ${index + 1} · 综合分 ${(item.score * 100).toFixed(1)}</p>
      <h3>${escapeHtml(item.restaurant.name)}</h3>
      <small>${escapeHtml(item.restaurant.cuisine)} · 近 ${escapeHtml(findSpot(item.restaurant.near_spot_id)?.name || "景点")} · 路径约 ${item.distance.toFixed(1)} 米</small>
      <div class="score-row">
        <span class="pill">评分 ${Number(item.restaurant.rating).toFixed(1)}</span>
        <span class="pill amber">热度 ${item.restaurant.heat}</span>
        <span class="pill red">${escapeHtml(item.restaurant.cuisine)}</span>
      </div>
      <div class="card-actions">
        ${item.nearNode ? `<button class="link-button" data-focus-node="${item.nearNode.id}">定位附近景点</button><button class="link-button" data-route-goal="${item.nearNode.id}">规划过去</button>` : ""}
      </div>
    `;
    container.appendChild(card);
  });
  bindResultButtons(container);
}

function foodSortScore(sortMode, compositeScore, ratingScore, heatScore, distanceScore) {
  if (sortMode === "heat") return heatScore;
  if (sortMode === "rating") return ratingScore;
  if (sortMode === "distance") return distanceScore;
  return compositeScore;
}

function foodSortLabel(sortMode) {
  if (sortMode === "heat") return "热度排序";
  if (sortMode === "rating") return "评分排序";
  if (sortMode === "distance") return "路径距离最近";
  return "评分 + 热度 + 路径距离综合打分";
}

function facilityGraphDistance(originNodeId, facility) {
  const nearNode = findNodeBySpot(facility.near_spot_id);
  const origin = findNode(originNodeId);
  if (!nearNode || !origin) return 9999;
  const route = shortestPath(origin.id, nearNode.id, state.mode, "distance") || shortestPath(origin.id, nearNode.id, "walk", "distance");
  const lastLeg = haversineM(nearNode, facility);
  return (route ? route.distance : haversineM(origin, nearNode)) + lastLeg;
}

function summarizeRoute(title, result) {
  const names = result.path.map((id) => findNode(id)?.name || id);
  const strategy = routeStrategyInfo(result.strategy);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">${escapeHtml(title)}</p>
    <h3>${state.mode === "bike" ? "骑行" : "步行"} · 总距离 ${result.distance.toFixed(1)} 米 · 约 ${result.minutes.toFixed(1)} 分钟</h3>
    <p>${escapeHtml(strategy.algorithm)}，平均拥挤度 ${(result.averageCongestion * 100).toFixed(0)}%。</p>
    <ol>${names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ol>
  `;
}

function summarizeMultiRoute(order, tsp) {
  const strategy = routeStrategyInfo(tsp.strategy);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">TSP-DP 多点游览顺序</p>
    <h3>${state.mode === "bike" ? "骑行" : "步行"} · 总距离 ${tsp.totalDistance.toFixed(1)} 米 · 约 ${tsp.totalMinutes.toFixed(1)} 分钟</h3>
    <p>${escapeHtml(strategy.algorithm)}，状态压缩 DP 比较策略权重，平均拥挤度 ${(tsp.averageCongestion * 100).toFixed(0)}%。</p>
    <ol>${order.map((leg) => {
      const from = findNode(leg.from)?.name || leg.from;
      const to = findNode(leg.to)?.name || leg.to;
      return `<li>${escapeHtml(from)} → ${escapeHtml(to)} · ${leg.result.distance.toFixed(1)} 米 · ${leg.result.minutes.toFixed(1)} 分钟</li>`;
    }).join("")}</ol>
  `;
}

function summarize(message) {
  byId("route-summary").innerHTML = `<p class="eyebrow">演示提示</p><h3>${escapeHtml(message)}</h3>`;
}

function routeStrategyInfo(strategy = state.routeStrategy) {
  return ROUTE_STRATEGIES[strategy] || ROUTE_STRATEGIES.distance;
}

function syncCategoryChips() {
  const value = byId("recommendCategory")?.value || "";
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === value);
  });
}

function selectedMultiStops() {
  return Array.from(byId("multiStopList").querySelectorAll("input:checked"))
    .map((input) => Number(input.dataset.nodeId));
}

function isMultiStopChecked(id) {
  const list = byId("multiStopList");
  if (!list) return false;
  return Array.from(list.querySelectorAll(`[data-node-id="${id}"]`)).some((input) => input.checked);
}

function setMultiStopChecked(id, checked) {
  byId("multiStopList").querySelectorAll(`[data-node-id="${id}"]`).forEach((input) => {
    input.checked = checked;
  });
  byId("nodeList").querySelectorAll(`[data-node-id="${id}"]`).forEach((input) => {
    input.checked = checked;
  });
}

function bindResultButtons(container) {
  container.querySelectorAll("[data-focus-node]").forEach((button) => {
    button.addEventListener("click", () => focusNode(Number(button.dataset.focusNode)));
  });
  container.querySelectorAll("[data-route-goal]").forEach((button) => {
    button.addEventListener("click", () => {
      byId("goalSelect").value = button.dataset.routeGoal;
      switchView("routeView");
      runShortestPath();
    });
  });
}

function recommendationImage(spot, node) {
  const image = resolveAssetPath(node?.image || "");
  if (!image || image.endsWith(".svg")) return fallbackImageForSpot(spot);
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
  const userIdRaw = byId("userSelect").value;
  const id = userIdRaw !== "" ? Number(userIdRaw) : 1;
  return state.users.find((user) => Number(user.id) === id);
}

function matchesSpotSearch(spot, keyword, preferenceTokens) {
  const text = `${spot.name} ${spot.category} ${spot.tags}`.toLowerCase();
  // First check exact keyword (substring match)
  if (keyword && kmpContains(text, keyword)) return true;
  // Then check preference tokens (OR match: any token matches)
  if (preferenceTokens && preferenceTokens.length) {
    return preferenceTokens.some((token) => kmpContains(text, token));
  }
  // No filter → match all
  if (!keyword && (!preferenceTokens || !preferenceTokens.length)) return true;
  return false;
}

function spotSortScore(sortMode, compositeScore, ratingScore, heatScore, interestScore) {
  if (sortMode === "heat") return heatScore;
  if (sortMode === "rating") return ratingScore;
  if (sortMode === "interest") return interestScore;
  return compositeScore;
}

function recommendSortLabel(sortMode) {
  if (sortMode === "heat") return "热度排序";
  if (sortMode === "rating") return "评分排序";
  if (sortMode === "interest") return "兴趣排序";
  return "综合排序";
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
  state.spotLshIndex = buildLshIndex(state.spots, (spot) => `${spot.name} ${spot.category} ${spot.tags}`);
  state.diaryLshIndex = buildLshIndex(state.diaries, textOfDiary);
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
  if (image.startsWith("web/")) return `../${image}`;
  if (image.startsWith("./") || image.startsWith("../") || image.startsWith("http")) return image;
  return `../${image}`;
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

// ── Auth / User State ──────────────────────────────────────────────
const AUTH_KEY = "tripsystem_current_user";
let currentUser = null; // { id, name, isAdmin, preference_tags, preferred_categories }

function loadAuthState() {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved) currentUser = JSON.parse(saved);
  } catch { currentUser = null; }
  if (!currentUser) {
    currentUser = { id: 1, name: "游客", isAdmin: false, preference_tags: ["文化", "建筑"], preferred_categories: [] };
  }
  // Only update DOM badge if DOM is ready (guard against pre-DOMContentLoaded call)
  if (document.readyState !== "loading") updateUserBadge();
}

function saveAuthState() {
  if (currentUser) localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
}

function updateUserBadge() {
  const badge = byId("currentUserBadge");
  if (!badge) return;
  badge.textContent = currentUser ? currentUser.name.charAt(0) : "游";
  if (currentUser?.isAdmin) {
    badge.classList.add("admin-badge");
  } else {
    badge.classList.remove("admin-badge");
  }
}

// ── Login / Register Modal ──────────────────────────────────────────
function showLoginModal(mode) {
  const modal = byId("loginModal");
  const loginForm = byId("loginForm");
  const registerForm = byId("registerForm");
  const title = byId("loginModalTitle");
  const status = byId("loginStatus");
  modal.classList.remove("hidden");
  status.textContent = "";
  status.className = "login-status";

  if (mode === "register") {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    title.textContent = "用户注册";
  } else {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    title.textContent = "用户登录";
  }
}

function hideLoginModal() {
  byId("loginModal").classList.add("hidden");
}

function doLogin() {
  const username = byId("loginUsername").value.trim();
  const password = byId("loginPassword").value.trim();
  const status = byId("loginStatus");
  if (!username) { status.textContent = "请输入用户名"; status.className = "login-status error"; return; }
  if (!password) { status.textContent = "请输入密码"; status.className = "login-status error"; return; }

  const user = state.users.find((u) => u.name === username);
  if (!user) { status.textContent = "用户不存在"; status.className = "login-status error"; return; }
  if (user.password && user.password !== password) {
    status.textContent = "密码错误"; status.className = "login-status error"; return;
  }

  currentUser = {
    id: Number(user.id), name: user.name,
    isAdmin: user.is_admin === true || user.role === "admin",
    preference_tags: user.preference_tags || [],
    preferred_categories: user.preferred_categories || []
  };
  saveAuthState();
  updateUserBadge();
  hideLoginModal();
  // Refresh recommendations with new user preferences
  byId("userSelect").value = String(user.id);
  byId("preferenceInput").value = currentUser.preference_tags.join(" ");
  recommendSpots();
  renderDiaryList();
  status.textContent = `欢迎，${currentUser.name}！`;
  status.className = "login-status";
  setTimeout(() => { status.textContent = ""; }, 2000);
}

function doRegister() {
  const username = byId("registerUsername").value.trim();
  const password = byId("registerPassword").value.trim();
  const tags = byId("registerTags").value.trim();
  const status = byId("loginStatus");

  if (!username || username.length < 2) { status.textContent = "用户名至少2个字符"; status.className = "login-status error"; return; }
  if (username.length > 16) { status.textContent = "用户名不超过16个字符"; status.className = "login-status error"; return; }
  if (!password || password.length < 4) { status.textContent = "密码至少4个字符"; status.className = "login-status error"; return; }
  if (state.users.find((u) => u.name === username)) {
    status.textContent = "用户名已存在"; status.className = "login-status error"; return;
  }

  const newId = Math.max(...state.users.map((u) => Number(u.id)), 0) + 1;
  const newUser = {
    id: newId, name: username, password: password,
    preference_tags: tags ? tags.split(/\s+/) : ["文化", "摄影"],
    preferred_categories: [], is_admin: false, role: "user"
  };
  state.users.push(newUser);

  // Add to DOM select
  const select = byId("userSelect");
  const opt = document.createElement("option");
  opt.value = String(newId);
  opt.textContent = `${username} · ${newUser.preference_tags.join("/")}`;
  select.appendChild(opt);
  select.value = String(newId);

  currentUser = {
    id: newId, name: username, isAdmin: false,
    preference_tags: newUser.preference_tags,
    preferred_categories: []
  };
  saveAuthState();
  updateUserBadge();
  hideLoginModal();
  byId("preferenceInput").value = currentUser.preference_tags.join(" ");
  recommendSpots();
  status.textContent = `注册成功，欢迎 ${username}！`;
  status.className = "login-status";
}

function bindAuthEvents() {
  byId("loginToggleBtn").addEventListener("click", () => showLoginModal("login"));
  byId("currentUserBadge").addEventListener("click", () => {
    if (currentUser?.isAdmin) showAdminPanel();
    else showLoginModal("login");
  });
  byId("closeLoginModal").addEventListener("click", hideLoginModal);
  byId("loginSubmitBtn").addEventListener("click", doLogin);
  byId("registerSubmitBtn").addEventListener("click", doRegister);
  byId("switchToRegisterBtn").addEventListener("click", () => showLoginModal("register"));
  byId("switchToLoginBtn").addEventListener("click", () => showLoginModal("login"));
  // Allow Enter key to submit
  byId("loginPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
  byId("registerPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") doRegister(); });
}

// ── Data Status Panel ──────────────────────────────────────────────
function showDataStatus() {
  const panel = byId("dataStatusPanel");
  const content = byId("dataStatusContent");
  panel.classList.remove("hidden");
  content.innerHTML = `
    <table class="data-table">
      <tbody>
        <tr><td>OSM 路网节点</td><td><strong>${state.nodes.length}</strong></td></tr>
        <tr><td>有向道路边</td><td><strong>${state.edges.length}</strong></td></tr>
        <tr><td>景点/目的地</td><td><strong>${state.spots.length}</strong></td></tr>
        <tr><td>校园类目</td><td><strong>${state.spots.filter((s) => s.category === "校园").length}</strong></td></tr>
        <tr><td>服务设施</td><td><strong>${state.facilities.length}</strong> · ${new Set(state.facilities.map((f) => f.type)).size} 类</td></tr>
        <tr><td>餐饮数据</td><td><strong>${state.restaurants.length}</strong></td></tr>
        <tr><td>注册用户</td><td><strong>${state.users.length}</strong></td></tr>
        <tr><td>旅游日记</td><td><strong>${state.diaries.length}</strong></td></tr>
        <tr><td>区域数据包</td><td><strong>${state.regionPacks.length}</strong></td></tr>
        <tr><td>前端算法</td><td>Top-K · GeoHash · LSH · KMP · Dijkstra · TSP-DP · Huffman</td></tr>
      </tbody>
    </table>
    <p class="data-note">C++ CLI 侧额外提供 A*、Trie 前缀补全和真实 Huffman .bin 文件压缩。</p>
  `;
}

function hideDataStatus() { byId("dataStatusPanel").classList.add("hidden"); }

// ── Admin Panel ────────────────────────────────────────────────────
function showAdminPanel() {
  if (!currentUser?.isAdmin) { showLoginModal("login"); return; }
  byId("adminPanel").classList.remove("hidden");
  renderAdminUsers();
  renderAdminSpots();
  byId("adminSpotCount").textContent = state.spots.length;
}

function hideAdminPanel() { byId("adminPanel").classList.add("hidden"); }

function renderAdminUsers() {
  const container = byId("adminUserList");
  container.innerHTML = "";
  state.users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <span>${escapeHtml(user.name)} <small>ID:${user.id} ${user.is_admin ? "[管理员]" : ""}</small></span>
      <span>
        <button data-delete-user="${user.id}" class="secondary-button">删除</button>
        <button data-toggle-admin="${user.id}" class="secondary-button">${user.is_admin ? "取消管理" : "设为管理"}</button>
      </span>
    `;
    container.appendChild(row);
  });
  // Bind delete handlers
  container.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = Number(btn.dataset.deleteUser);
      if (uid === currentUser.id) { alert("不能删除自己"); return; }
      state.users = state.users.filter((u) => Number(u.id) !== uid);
      renderAdminUsers();
    });
  });
  container.querySelectorAll("[data-toggle-admin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uid = Number(btn.dataset.toggleAdmin);
      const user = state.users.find((u) => Number(u.id) === uid);
      if (user) { user.is_admin = !user.is_admin; user.role = user.is_admin ? "admin" : "user"; }
      renderAdminUsers();
    });
  });
}

function renderAdminSpots(filterKeyword) {
  const container = byId("adminSpotList");
  container.innerHTML = "";
  const spots = filterKeyword
    ? state.spots.filter((s) => kmpContains(`${s.name} ${s.category} ${s.tags}`.toLowerCase(), filterKeyword.toLowerCase()))
    : state.spots.slice(0, 100);
  spots.forEach((spot) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `<span>${escapeHtml(spot.name)} <small>[${escapeHtml(spot.category)}] ★${spot.rating} 🔥${spot.heat}</small></span>`;
    container.appendChild(row);
  });
}

function exportAllData() {
  const data = {
    spots: state.spots,
    osm_nodes: state.nodes,
    osm_edges: state.edges,
    restaurants: state.restaurants,
    facilities: state.facilities,
    users: state.users,
    diaries: state.diaries,
    exported_at: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tripsystem_export.json";
  a.click();
  URL.revokeObjectURL(url);
  byId("adminExportStatus").textContent = "数据已导出！";
}

function exportUsers() {
  const blob = new Blob([JSON.stringify(state.users, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "users_export.json";
  a.click();
  URL.revokeObjectURL(url);
}

function bindAdminEvents() {
  byId("dataStatusBtn").addEventListener("click", showDataStatus);
  byId("closeDataPanel").addEventListener("click", hideDataStatus);
  byId("closeAdminPanel").addEventListener("click", hideAdminPanel);
  byId("adminExportAllBtn").addEventListener("click", exportAllData);
  byId("adminExportUsersBtn").addEventListener("click", exportUsers);
  byId("adminSpotSearch").addEventListener("input", (e) => renderAdminSpots(e.target.value));
  byId("adminAddUserBtn").addEventListener("click", () => { hideAdminPanel(); showLoginModal("register"); });

  // Admin tab switching
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-admin-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-tab-content").forEach((tab) => tab.classList.add("hidden"));
      const targetId = "admin" + btn.dataset.adminTab.charAt(0).toUpperCase() + btn.dataset.adminTab.slice(1) + "Tab";
      const target = document.getElementById(targetId);
      if (target) target.classList.remove("hidden");
    });
  });

  // Click outside modal to close
  [byId("loginModal"), byId("dataStatusPanel"), byId("adminPanel")].forEach((modal) => {
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
  });
}

// Initialize auth on page load
loadAuthState();

// ── Utility ────────────────────────────────────────────────────────
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
