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

function reloadCurrentDataset({ fit = false } = {}) {
  if (state.map && window.L && state.nodes.length) {
    state.mapBounds = L.latLngBounds(state.nodes.map((node) => [node.lat, node.lon]));
    state.mapFitted = false;
  }
  clearRouteLayers(false);
  if (typeof updateRouteQuickSummary === "function") updateRouteQuickSummary();
  populateControls();
  renderNodeList(selectableRouteNodes());
  buildFacilityGeoIndex();
  buildSimilarityIndexes();
  state.routeConsistency = routeConsistencyCheck();
  renderNodeMarkers();
  renderRoadNetwork();
  renderFacilityMapMarkers();
  showNodeDetail(state.nodes[0]);
  recommendSpots();
  searchFacilities();
  renderDiaryList();
  recommendFood();
  updateMapDataNotice();
  if (fit) fitMapToData(true);
}

function populateControls() {
  const routeNodes = selectableRouteNodes();
  fillNodeSelect(byId("startSelect"), routeNodes);
  fillNodeSelect(byId("goalSelect"), routeNodes);
  fillNodeSelect(byId("facilityOriginSelect"), routeNodes);
  fillSpotSelect(byId("foodSpotSelect"), state.spots);
  fillUserSelect();
  fillCategorySelect();
  fillFacilityTypeSelect();
  fillCuisineSelect();
  fillIndoorSelects();
  fillRegionPackSelect();
  if (byId("diaryScopeSelect")) byId("diaryScopeSelect").value = state.diaryScope || "all";
  renderMultiStopList();

  const defaults = defaultRouteSelection(routeNodes);
  setSelectValueIfPresent("startSelect", defaults.start);
  setSelectValueIfPresent("goalSelect", defaults.goal);
  setSelectValueIfPresent("facilityOriginSelect", defaults.start);
  setSelectValueIfPresent("foodSpotSelect", defaultFoodSpotId());
  const user = selectedUser();
  byId("preferenceInput").value = user ? user.preference_tags.join(" ") : "";

  if (state.map) setTimeout(() => state.map.invalidateSize(), 100);
}

function defaultRouteSelection(routeNodes) {
  const ids = new Set(routeNodes.map((node) => String(node.id)));
  const preferred = state.currentRegionPackId === "tsinghua_campus"
    ? { start: "1", goal: "4" }
    : { start: "1", goal: "8" };
  return {
    start: ids.has(preferred.start) ? preferred.start : String(routeNodes[0]?.id || ""),
    goal: ids.has(preferred.goal) ? preferred.goal : String(routeNodes[1]?.id || routeNodes[0]?.id || "")
  };
}

function defaultFoodSpotId() {
  const restaurantSpot = state.restaurants.find((restaurant) => findSpot(restaurant.near_spot_id))?.near_spot_id;
  const firstSpot = state.spots[0]?.id;
  return String(restaurantSpot || firstSpot || "");
}

function fillRegionPackSelect() {
  const select = byId("regionPackSelect");
  if (!select) return;
  const packs = state.regionPacks.length ? state.regionPacks : [{
    id: "summer_palace",
    name: "颐和园",
    city: "北京",
    status: "active",
    map_region: "dataset",
    description: "当前可使用的旅行区域。"
  }];
  select.innerHTML = "";
  packs.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = pack.name;
    select.appendChild(option);
  });
  const current = packs.find((pack) => pack.id === state.currentRegionPackId);
  select.value = current?.id || packs.find((pack) => pack.status === "active")?.id || packs[0]?.id || "";
  state.currentRegionPackId = select.value;
  renderRegionPackStatus(select.value);
}

async function selectRegionPack(packId) {
  const pack = findRegionPack(packId);
  if (!pack) return;
  if (pack.status !== "active" || !pack.nodes_path || !pack.edges_path || !pack.spots_path) {
    if (pack.map_region) focusMapRegion(pack.map_region, true);
    renderRegionPackStatus(pack.id);
    return;
  }
  if (pack.id === state.currentRegionPackId) {
    renderRegionPackStatus(pack.id);
    fitMapToData(true);
    return;
  }
  const select = byId("regionPackSelect");
  const previousPackId = state.currentRegionPackId;
  renderRegionPackStatus(pack.id, "正在加载旅行区域...");
  try {
    await loadRegionPack(pack.id);
    if (pack.map_region) focusMapRegion(pack.map_region, true);
    summarize(`已切换到 ${pack.name}，当前可选择 ${selectableRouteNodes().length} 个目的地，底层路网包含 ${routableNodes().length} 个节点。`);
  } catch (error) {
    state.currentRegionPackId = previousPackId;
    if (select) select.value = previousPackId;
    renderRegionPackStatus(previousPackId, `切换失败：${error.message || error}`);
  }
}

async function loadRegionPack(packId) {
  const pack = findRegionPack(packId);
  if (!pack) throw new Error(`未找到旅行区域：${packId}`);
  const [nodes, edges, roads, spots, facilities, restaurants, diaries] = await Promise.all([
    loadJson(pack.nodes_path),
    loadJson(pack.edges_path),
    loadJson(pack.roads_path || DATA_PATHS.roads),
    loadJson(pack.spots_path),
    loadJson(pack.facilities_path),
    loadJson(pack.restaurants_path),
    loadJson(pack.diaries_path || DATA_PATHS.diaries)
  ]);
  state.nodes = nodes;
  state.edges = edges;
  state.roads = roads;
  state.spots = spots;
  state.facilities = facilities;
  state.restaurants = restaurants;
  state.diaries = diaries;
  state.currentRegionPackId = pack.id;
  state.mapRegion = pack.map_region || "dataset";
  reloadCurrentDataset({ fit: true });
}

function renderRegionPackStatus(packId, transientMessage = "") {
  const container = byId("regionPackStatus");
  if (!container) return;
  const pack = findRegionPack(packId);
  if (!pack) {
    container.textContent = "旅行区域清单未加载。";
    return;
  }
  const active = pack.status === "active";
  container.innerHTML = `
    <div class="pack-row">
      <strong>${escapeHtml(regionPackStatusLabel(pack.status))}</strong>
      <span>${escapeHtml(pack.city || "区域")}</span>
    </div>
    <p>${escapeHtml(pack.description || "")}</p>
    ${transientMessage ? `<p class="pack-message">${escapeHtml(transientMessage)}</p>` : ""}
    <small>${active ? `${selectableRouteNodes().length} 个可选目的地 · ${state.facilities.length} 个服务点` : "该区域正在准备数据，接入后可直接规划路线。"}</small>
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

async function applyInitialUrlState() {
  const params = new URLSearchParams(window.location.search);
  const packId = params.get("pack");
  if (packId && packId !== state.currentRegionPackId) {
    await selectRegionPack(packId);
  }

  const viewId = params.get("view") || window.location.hash.replace(/^#/, "") || state.appSettings.defaultView;
  if (viewId && byId(viewId)) switchView(viewId);

  setSelectValueIfPresent("startSelect", params.get("start"));
  setSelectValueIfPresent("goalSelect", params.get("goal"));
  setSelectValueIfPresent("routeStrategySelect", params.get("strategy"));
  if (params.get("diarySort")) {
    setSelectValueIfPresent("diarySort", params.get("diarySort"));
    renderDiaryList();
  } else if (state.appSettings.defaultDiarySort && byId("diarySort")) {
    setSelectValueIfPresent("diarySort", state.appSettings.defaultDiarySort);
    renderDiaryList();
  }
  const routeMode = params.get("mode") || state.appSettings.defaultRouteMode;
  if (routeMode) {
    const modeButton = document.querySelector(`[data-mode="${routeMode}"]`);
    if (modeButton) modeButton.click();
  }
  if (params.get("run") === "route") runShortestPath();
}

function setSelectValueIfPresent(id, value) {
  if (!value) return;
  const select = byId(id);
  if (!select) return;
  const stringValue = String(value);
  if (Array.from(select.options).some((option) => option.value === stringValue)) {
    select.value = stringValue;
    if (id === "routeStrategySelect") state.routeStrategy = stringValue;
  }
}

function routableNodeIds() {
  const ids = new Set();
  state.edges.forEach((edge) => {
    ids.add(Number(edge.from));
    ids.add(Number(edge.to));
  });
  return ids;
}

function isRoutableNode(nodeOrId) {
  const id = typeof nodeOrId === "object" ? Number(nodeOrId?.id) : Number(nodeOrId);
  return routableNodeIds().has(id);
}

function routableNodes() {
  const ids = routableNodeIds();
  return state.nodes.filter((node) => ids.has(Number(node.id)));
}

function selectableRouteNodes() {
  return routableNodes().filter((node) => Number(node.spot_id) > 0);
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
  if (state.currentUserId && Array.from(select.options).some((option) => Number(option.value) === Number(state.currentUserId))) {
    select.value = String(state.currentUserId);
  }
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
