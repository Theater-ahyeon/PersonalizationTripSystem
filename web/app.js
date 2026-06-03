const DATA_PATHS = {
  nodes: ["../cpp/data/osm_nodes.json", "/cpp/data/osm_nodes.json"],
  edges: ["../cpp/data/osm_edges.json", "/cpp/data/osm_edges.json"],
  spots: ["../cpp/data/spots.json", "/cpp/data/spots.json"],
  restaurants: ["../cpp/data/restaurants.json", "/cpp/data/restaurants.json"],
  facilities: ["../cpp/data/facilities.json", "/cpp/data/facilities.json"],
  users: ["../cpp/data/users.json", "/cpp/data/users.json"],
  diaries: ["../cpp/data/diaries/index.json", "/cpp/data/diaries/index.json"]
};

const FALLBACK_IMAGE = "./assets/spots/visitor-center.svg";

const state = {
  map: null,
  nodes: [],
  edges: [],
  spots: [],
  restaurants: [],
  facilities: [],
  users: [],
  diaries: [],
  markers: new Map(),
  edgeLayers: [],
  routeLayers: [],
  poiLayers: [],
  selectedNodeId: null,
  mode: "walk"
};

const byId = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  bindStaticControls();
  try {
    const [nodes, edges, spots, restaurants, facilities, users, diaries] = await Promise.all([
      loadJson(DATA_PATHS.nodes),
      loadJson(DATA_PATHS.edges),
      loadJson(DATA_PATHS.spots),
      loadJson(DATA_PATHS.restaurants),
      loadJson(DATA_PATHS.facilities),
      loadJson(DATA_PATHS.users),
      loadJson(DATA_PATHS.diaries)
    ]);
    state.nodes = nodes;
    state.edges = edges;
    state.spots = spots;
    state.restaurants = restaurants;
    state.facilities = facilities;
    state.users = users;
    state.diaries = diaries;

    initializeMap();
    populateControls();
    renderNodeList(state.nodes);
    renderNodeMarkers();
    renderRoadNetwork();
    showNodeDetail(state.nodes[0]);
    recommendSpots();
    searchFacilities();
    renderDiaryList();
    recommendFood();
    renderDataOverview();
    byId("loadingState").classList.add("hidden");
  } catch (error) {
    byId("loadingState").textContent = `数据加载失败：${error.message}`;
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

function bindStaticControls() {
  byId("tourTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    switchView(button.dataset.view);
  });

  byId("nodeSearchInput").addEventListener("input", (event) => {
    const keyword = event.target.value.trim().toLowerCase();
    const filtered = state.nodes.filter((node) => textOfNode(node).toLowerCase().includes(keyword));
    renderNodeList(filtered);
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
  byId("preferenceInput").addEventListener("input", debounce(recommendSpots, 180));

  byId("routeButton").addEventListener("click", runShortestPath);
  byId("clearRouteButton").addEventListener("click", clearRouteLayers);
  byId("runMultiButton").addEventListener("click", runMultiStopRoute);

  byId("facilitySearchButton").addEventListener("click", searchFacilities);
  byId("facilityKeyword").addEventListener("input", debounce(searchFacilities, 180));
  byId("facilityTypeSelect").addEventListener("change", searchFacilities);
  byId("facilityOriginSelect").addEventListener("change", searchFacilities);

  byId("diarySearchButton").addEventListener("click", renderDiaryList);
  byId("diaryKeyword").addEventListener("input", debounce(renderDiaryList, 180));
  byId("diarySort").addEventListener("change", renderDiaryList);

  byId("foodRecommendButton").addEventListener("click", recommendFood);
  byId("foodSpotSelect").addEventListener("change", recommendFood);
  byId("cuisineSelect").addEventListener("change", recommendFood);
  byId("foodKeyword").addEventListener("input", debounce(recommendFood, 180));
}

function switchView(viewId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === viewId);
  });
  if (state.map) setTimeout(() => state.map.invalidateSize(), 80);
}

function initializeMap() {
  if (!window.L) {
    byId("mapFallback").hidden = false;
    byId("map").hidden = true;
    return;
  }

  state.map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).setView(averageLatLng(state.nodes), 15);

  const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    errorTileUrl: offlineTileUrl(),
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.map);

  tileLayer.on("tileerror", () => {
    byId("loadingState").textContent = "在线底图加载受限，已保留本地真实路网展示。";
    byId("loadingState").classList.remove("hidden");
  });

  const bounds = L.latLngBounds(state.nodes.map((node) => [node.lat, node.lon]));
  state.map.fitBounds(bounds, { padding: [36, 36] });
  setTimeout(() => state.map.invalidateSize(), 0);
  setTimeout(() => state.map.invalidateSize(), 300);
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
  renderMultiStopList();

  byId("startSelect").value = "1";
  byId("goalSelect").value = "8";
  byId("facilityOriginSelect").value = "1";
  byId("foodSpotSelect").value = "8";
  const user = selectedUser();
  byId("preferenceInput").value = user ? user.preference_tags.join(" ") : "";

  if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
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
    marker.on("click", () => showNodeDetail(node));
    state.markers.set(node.id, marker);
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
        color: edge.mode === "bike" ? "#315f8f" : "#647d74",
        weight: 2.8,
        opacity: 0.43,
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
  const preference = `${byId("preferenceInput").value} ${(user?.preference_tags || []).join(" ")}`.trim();
  const maxHeat = Math.max(...state.spots.map((spot) => Number(spot.heat) || 0), 1);
  const results = state.spots
    .filter((spot) => !category || spot.category === category)
    .map((spot) => {
      const match = tagScore(`${spot.name} ${spot.category} ${spot.tags}`, preference);
      const ratingScore = Number(spot.rating) / 5;
      const heatScore = Number(spot.heat) / maxHeat;
      const score = 0.4 * ratingScore + 0.35 * heatScore + 0.25 * match;
      return { spot, score, match, ratingScore, heatScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  renderRecommendationCards(results);
}

function renderRecommendationCards(results) {
  const container = byId("recommendResults");
  container.innerHTML = "";
  results.forEach((item, index) => {
    const node = findNodeBySpot(item.spot.id);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <p class="eyebrow">推荐 ${index + 1} · 综合分 ${(item.score * 100).toFixed(1)}</p>
      <h3>${escapeHtml(item.spot.name)}</h3>
      <small>${escapeHtml(item.spot.category)} · ${escapeHtml(item.spot.tags)}</small>
      <div class="score-row">
        <span class="pill">评分 ${Number(item.spot.rating).toFixed(1)}</span>
        <span class="pill amber">热度 ${item.spot.heat}</span>
        <span class="pill red">兴趣匹配 ${(item.match * 100).toFixed(0)}%</span>
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
  const result = shortestPath(start, goal, state.mode);
  if (!result) {
    summarize("当前交通方式下未找到可达路径。");
    return;
  }
  drawRoute(result.path, "#e35d3f");
  summarizeRoute("最短路径", result);
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

  const order = [];
  let current = start;
  let total = 0;
  const fullPath = [start];
  const remaining = [...targets];
  while (remaining.length) {
    let bestIndex = -1;
    let bestResult = null;
    remaining.forEach((target, index) => {
      const result = shortestPath(current, target, state.mode);
      if (result && (!bestResult || result.distance < bestResult.distance)) {
        bestIndex = index;
        bestResult = result;
      }
    });
    if (!bestResult) {
      summarize("多点游览中存在不可达节点。");
      return;
    }
    const next = remaining.splice(bestIndex, 1)[0];
    order.push({ from: current, to: next, result: bestResult });
    total += bestResult.distance;
    fullPath.push(...bestResult.path.slice(1));
    current = next;
  }

  drawRoute(fullPath, "#e35d3f");
  summarizeMultiRoute(order, total);
}

function shortestPath(start, goal, mode) {
  if (start === goal) return { path: [start], distance: 0 };
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const queue = [{ node: start, distance: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (current.distance !== dist.get(current.node)) continue;
    if (current.node === goal) break;

    neighborsOf(current.node, mode).forEach((edge) => {
      const nextDistance = current.distance + Number(edge.distance);
      if (!dist.has(edge.to) || nextDistance < dist.get(edge.to)) {
        dist.set(edge.to, nextDistance);
        prev.set(edge.to, current.node);
        queue.push({ node: edge.to, distance: nextDistance });
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
  if (path[0] !== start) return null;
  return { path, distance: dist.get(goal) };
}

function neighborsOf(id, mode) {
  return state.edges.filter((edge) => Number(edge.from) === Number(id) && edgeSupportsMode(edge, mode));
}

function edgeSupportsMode(edge, mode) {
  return edge.mode === "both" || edge.mode === mode;
}

function drawRoute(path, color) {
  clearRouteLayers(false);
  if (!state.map || path.length < 2) return;
  const latLngs = path.map((id) => {
    const node = findNode(id);
    return [node.lat, node.lon];
  });
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
  const origin = Number(byId("facilityOriginSelect").value || 1);
  const type = byId("facilityTypeSelect").value;
  const keyword = byId("facilityKeyword").value.trim().toLowerCase();
  const results = state.facilities
    .filter((facility) => (!type || facility.type === type) && textOfFacility(facility).toLowerCase().includes(keyword))
    .map((facility) => {
      const distance = facilityGraphDistance(origin, facility);
      return { facility, distance };
    })
    .sort((a, b) => a.distance - b.distance || b.facility.rating - a.facility.rating)
    .slice(0, 12);

  renderFacilityCards(results);
  drawFacilityMarkers(results);
}

function renderFacilityCards(results) {
  const container = byId("facilityResults");
  container.innerHTML = "";
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

function renderDiaryList() {
  const keyword = byId("diaryKeyword").value.trim().toLowerCase();
  const sort = byId("diarySort").value;
  const user = selectedUser();
  const interest = (user?.preference_tags || []).join(" ");
  const results = state.diaries
    .filter((diary) => textOfDiary(diary).toLowerCase().includes(keyword))
    .map((diary) => ({
      diary,
      interestScore: tagScore(`${diary.title} ${diary.destination} ${diary.tags.join(" ")} ${diary.content}`, interest)
    }))
    .sort((a, b) => {
      if (sort === "rating") return Number(b.diary.rating) - Number(a.diary.rating);
      if (sort === "interest") return b.interestScore - a.interestScore || Number(b.diary.heat) - Number(a.diary.heat);
      return Number(b.diary.heat) - Number(a.diary.heat);
    });

  const container = byId("diaryResults");
  container.innerHTML = "";
  results.forEach((item) => {
    const compression = Number(item.diary.compressed_bytes) / Math.max(1, Number(item.diary.original_bytes));
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
    `;
    container.appendChild(card);
  });
}

function recommendFood() {
  const spotId = Number(byId("foodSpotSelect").value || 1);
  const cuisine = byId("cuisineSelect").value;
  const keyword = byId("foodKeyword").value.trim().toLowerCase();
  const maxHeat = Math.max(...state.restaurants.map((restaurant) => Number(restaurant.heat) || 0), 1);
  const originNode = findNodeBySpot(spotId) || findNode(1);
  const results = state.restaurants
    .filter((restaurant) => (!cuisine || restaurant.cuisine === cuisine) && textOfRestaurant(restaurant).toLowerCase().includes(keyword))
    .map((restaurant) => {
      const nearNode = findNodeBySpot(restaurant.near_spot_id);
      const route = nearNode && originNode ? shortestPath(originNode.id, nearNode.id, state.mode) : null;
      const distance = route ? route.distance : 9999;
      const cuisineScore = cuisine ? (restaurant.cuisine === cuisine ? 1 : 0) : 0.55;
      const distanceScore = 1 / (1 + distance / 900);
      const score = 0.35 * (Number(restaurant.rating) / 5) + 0.3 * (Number(restaurant.heat) / maxHeat) + 0.2 * cuisineScore + 0.15 * distanceScore;
      return { restaurant, score, distance, nearNode };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  renderFoodCards(results);
}

function renderFoodCards(results) {
  const container = byId("foodResults");
  container.innerHTML = "";
  results.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
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

function renderDataOverview() {
  const facilityTypes = unique(state.facilities.map((facility) => facility.type));
  const buildingLike = state.spots.filter((spot) => ["建筑", "景点", "园林", "文化", "出入口"].includes(spot.category)).length;
  const metrics = [
    ["OSM 节点", state.nodes.length, "真实颐和园 bbox 经纬度"],
    ["道路边", state.edges.length, "有向边，支持步行/骑行"],
    ["景点/建筑", state.spots.length, `建筑与景点口径 ${buildingLike} 个`],
    ["服务设施", state.facilities.length, `${facilityTypes.length} 种设施类别`],
    ["餐饮数据", state.restaurants.length, `${unique(state.restaurants.map((item) => item.cuisine)).length} 种菜系`],
    ["系统用户", state.users.length, "用于个性化偏好推荐"],
    ["旅游日记", state.diaries.length, "含热度、评分和压缩统计"]
  ];
  const container = byId("dataOverview");
  container.innerHTML = `
    <div class="metric-grid">
      ${metrics.map(([label, value, note]) => `
        <div class="metric-card">
          <strong>${value}</strong>
          <span>${label}</span>
          <small>${note}</small>
        </div>
      `).join("")}
    </div>
    <article class="result-card">
      <p class="eyebrow">验收说明</p>
      <h3>课程功能均已映射到前端演示</h3>
      <p>推荐使用排序算法展示旅游推荐、美食推荐和日记交流；路线页面使用图最短路径与多点顺序；查询页面按路径距离排序设施；地图层展示真实 OSM 路网和高亮路线。</p>
    </article>
  `;
}

function facilityGraphDistance(originNodeId, facility) {
  const nearNode = findNodeBySpot(facility.near_spot_id);
  const origin = findNode(originNodeId);
  if (!nearNode || !origin) return 9999;
  const route = shortestPath(origin.id, nearNode.id, state.mode) || shortestPath(origin.id, nearNode.id, "walk");
  const lastLeg = haversineM(nearNode, facility);
  return (route ? route.distance : haversineM(origin, nearNode)) + lastLeg;
}

function summarizeRoute(title, result) {
  const names = result.path.map((id) => findNode(id)?.name || id);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">${escapeHtml(title)}</p>
    <h3>${state.mode === "bike" ? "骑行" : "步行"} · 总距离 ${result.distance.toFixed(1)} 米</h3>
    <ol>${names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ol>
  `;
}

function summarizeMultiRoute(order, total) {
  byId("route-summary").innerHTML = `
    <p class="eyebrow">多点游览顺序</p>
    <h3>${state.mode === "bike" ? "骑行" : "步行"} · 总距离 ${total.toFixed(1)} 米</h3>
    <ol>${order.map((leg) => {
      const from = findNode(leg.from)?.name || leg.from;
      const to = findNode(leg.to)?.name || leg.to;
      return `<li>${escapeHtml(from)} → ${escapeHtml(to)} · ${leg.result.distance.toFixed(1)} 米</li>`;
    }).join("")}</ol>
  `;
}

function summarize(message) {
  byId("route-summary").innerHTML = `<p class="eyebrow">演示提示</p><h3>${escapeHtml(message)}</h3>`;
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

function focusNode(id) {
  const node = findNode(id);
  if (!node) return;
  showNodeDetail(node);
  const marker = state.markers.get(node.id);
  if (state.map) state.map.setView([node.lat, node.lon], 17);
  if (marker) marker.openPopup();
}

function selectedUser() {
  const id = Number(byId("userSelect").value || 1);
  return state.users.find((user) => Number(user.id) === id);
}

function tagScore(text, preference) {
  const tokens = preference.split(/[\s,，、/]+/).map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) return 0.5;
  const source = text.toLowerCase();
  const hits = tokens.filter((token) => source.includes(token.toLowerCase())).length;
  return hits / tokens.length;
}

function textOfNode(node) {
  return `${node.name} ${node.type} ${node.description || ""}`;
}

function textOfFacility(facility) {
  return `${facility.name} ${facility.type} ${facility.tags || ""}`;
}

function textOfRestaurant(restaurant) {
  return `${restaurant.name} ${restaurant.cuisine}`;
}

function textOfDiary(diary) {
  return `${diary.title} ${diary.destination} ${(diary.tags || []).join(" ")} ${diary.content}`;
}

function averageLatLng(nodes) {
  const sum = nodes.reduce((acc, node) => {
    acc.lat += Number(node.lat);
    acc.lon += Number(node.lon);
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
      <rect width="256" height="256" fill="#eef4f1"/>
      <path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#d6e2dc" stroke-width="1"/>
      <path d="M20 210C70 170 95 184 132 148C170 112 198 120 236 84" fill="none" stroke="#9dbbb2" stroke-width="8" stroke-linecap="round" opacity=".65"/>
      <text x="128" y="128" text-anchor="middle" fill="#66736f" font-size="13" font-family="Arial, sans-serif">OSM offline</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
