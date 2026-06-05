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
  settings: "vagabond.settings"
};
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
  congestion: {
    label: "避开拥挤",
    algorithm: "尽量避开拥挤路段，保持游览节奏",
    color: "#008733"
  },
  transport: {
    label: "混合交通",
    algorithm: "根据可通行道路组合步行和骑行",
    color: "#0058bc"
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
  currentUserId: null,
  appSettings: {
    theme: "light",
    compactCards: false,
    defaultView: "recommendView",
    defaultRouteMode: "walk",
    defaultDiarySort: "heat"
  },
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
  mapRegion: "dataset",
  currentRegionPackId: "summer_palace"
};

const byId = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  bindStaticControls();
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
    state.users = mergeLocalUsers(users, loadLocalUsers());
    state.diaries = diaries;
    state.regionPacks = regionPacks;
    state.appSettings = loadAppSettings();
    state.currentUserId = loadCurrentUserId() || Number(state.users[0]?.id) || 1;
    state.currentRegionPackId = state.regionPacks.find((pack) => pack.id === "summer_palace")?.id
      || state.regionPacks.find((pack) => pack.status === "active")?.id
      || "summer_palace";
    applyAppSettings();

    initializeMap();
    reloadCurrentDataset({ fit: true });
    updateAccountUi();
    await applyInitialUrlState();
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
  document.addEventListener("click", handleGlobalResultAction);

  document.querySelectorAll("[data-view]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      switchView(trigger.dataset.view);
    });
  });

  byId("nodeSearchInput").addEventListener("input", (event) => {
    const keyword = event.target.value.trim().toLowerCase();
    const filtered = selectableRouteNodes().filter((node) => textOfNode(node).toLowerCase().includes(keyword));
    renderNodeList(filtered);
  });
  byId("regionPackSelect").addEventListener("change", (event) => {
    selectRegionPack(event.target.value);
  });

  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      document.querySelectorAll(".mode-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  byId("recommendButton").addEventListener("click", handleRecommendClick);
  byId("userSelect").addEventListener("change", () => {
    setCurrentUser(Number(byId("userSelect").value));
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

  byId("facilitySearchButton").addEventListener("click", handleFacilitySearchClick);
  byId("facilityKeyword").addEventListener("input", debounce(searchFacilities, 180));
  byId("facilityTypeSelect").addEventListener("change", searchFacilities);
  byId("facilityOriginSelect").addEventListener("change", searchFacilities);
  byId("facilityRangeSelect").addEventListener("change", searchFacilities);

  byId("diarySearchButton").addEventListener("click", handleDiarySearchClick);
  byId("diaryKeyword").addEventListener("input", debounce(renderDiaryList, 180));
  byId("diarySort").addEventListener("change", renderDiaryList);
  byId("diarySearchMode").addEventListener("change", renderDiaryList);
  byId("diaryCreateButton").addEventListener("click", createDiaryEntry);
  byId("diaryExportButton").addEventListener("click", exportDiariesJson);
  byId("indoorRouteButton").addEventListener("click", runIndoorRoute);
  byId("aigcDraftButton").addEventListener("click", generateDiaryDraft);
  byId("aigcAnimationButton").addEventListener("click", generateAigcStoryboard);
  setupDiaryModal();
  setupAccountSystem();

  byId("foodRecommendButton").addEventListener("click", handleFoodRecommendClick);
  byId("foodSpotSelect").addEventListener("change", recommendFood);
  byId("cuisineSelect").addEventListener("change", recommendFood);
  byId("foodSortSelect").addEventListener("change", recommendFood);
  byId("foodKeyword").addEventListener("input", debounce(recommendFood, 180));
}

function handleRecommendClick() {
  recommendSpots();
  focusResultRegion("recommendResults");
}

function handleFacilitySearchClick() {
  searchFacilities();
  focusResultRegion("facilityResults");
}

function handleDiarySearchClick() {
  renderDiaryList();
  focusResultRegion("diaryResults");
}

function handleFoodRecommendClick() {
  recommendFood();
  focusResultRegion("foodResults");
}

function handleGlobalResultAction(event) {
  const focusButton = event.target.closest("[data-focus-node]");
  if (focusButton) {
    event.preventDefault();
    handleFocusNodeAction(Number(focusButton.dataset.focusNode));
    return;
  }

  const routeButton = event.target.closest("[data-route-goal]");
  if (routeButton) {
    event.preventDefault();
    handleRouteGoalAction(Number(routeButton.dataset.routeGoal));
  }
}

function handleFocusNodeAction(nodeId) {
  if (!Number.isFinite(nodeId)) return;
  switchView("routeView");
  setTimeout(() => {
    focusNode(nodeId);
    byId("map")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 120);
}

function handleRouteGoalAction(nodeId) {
  if (!Number.isFinite(nodeId)) return;
  byId("goalSelect").value = String(nodeId);
  switchView("routeView");
  setTimeout(() => {
    runShortestPath();
    byId("map")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 120);
}

function focusResultRegion(id) {
  const target = byId(id);
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.focus({ preventScroll: true });
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
  state.mapRegion = "dataset";
  fitMapToData(Boolean(force || region === "dataset"));
  updateMapDataNotice();
}

function updateLocalOverlayVisibility() {
  if (!state.map) return;
  const showLocal = state.map.getZoom() >= 13;
  [...state.facilityLayers, ...state.markers.values()].forEach((layer) => {
    if (!layer) return;
    if (showLocal && !state.map.hasLayer(layer)) layer.addTo(state.map);
    if (!showLocal && state.map.hasLayer(layer)) layer.remove();
  });
}

function updateMapDataNotice() {
  const notice = byId("mapDataNotice");
  if (!notice) return;
  const pack = findRegionPack(state.currentRegionPackId);
  const packName = pack?.name || "当前数据包";
  notice.textContent = `当前数据包：${packName}，${selectableRouteNodes().length} 个可选目的地；路线按本包路网计算。`;
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

function reloadCurrentDataset({ fit = false } = {}) {
  if (state.map && window.L && state.nodes.length) {
    state.mapBounds = L.latLngBounds(state.nodes.map((node) => [node.lat, node.lon]));
    state.mapFitted = false;
  }
  clearRouteLayers(false);
  populateControls();
  renderNodeList(selectableRouteNodes());
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
  updateMapDataNotice();
  if (fit) fitMapToData(true);
}

function populateControls() {
  fillNodeSelect(byId("startSelect"), selectableRouteNodes());
  fillNodeSelect(byId("goalSelect"), selectableRouteNodes());
  fillNodeSelect(byId("facilityOriginSelect"), selectableRouteNodes());
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
    description: "当前可使用的旅行区域。"
  }];
  select.innerHTML = "";
  packs.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = `${pack.name} · ${regionPackStatusLabel(pack.status)}`;
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
  renderRegionPackStatus(pack.id, "正在加载区域数据包...");
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
  if (!pack) throw new Error(`未找到区域数据包：${packId}`);
  const [nodes, edges, spots, facilities, restaurants] = await Promise.all([
    loadJson(pack.nodes_path),
    loadJson(pack.edges_path),
    loadJson(pack.spots_path),
    loadJson(pack.facilities_path),
    loadJson(pack.restaurants_path)
  ]);
  state.nodes = nodes;
  state.edges = edges;
  state.spots = spots;
  state.facilities = facilities;
  state.restaurants = restaurants;
  state.currentRegionPackId = pack.id;
  state.mapRegion = pack.map_region || "dataset";
  reloadCurrentDataset({ fit: true });
}

function renderRegionPackStatus(packId, transientMessage = "") {
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

function setupAccountSystem() {
  byId("accountButton")?.addEventListener("click", () => openModal("accountModal"));
  byId("statusButton")?.addEventListener("click", () => {
    renderStatusSummary();
    openModal("statusModal");
  });
  byId("settingsButton")?.addEventListener("click", () => {
    renderSettingsForm();
    openModal("settingsModal");
  });
  document.querySelectorAll("[data-modal-close]").forEach((trigger) => {
    trigger.addEventListener("click", () => closeModal(trigger.dataset.modalClose));
  });
  document.querySelectorAll("[data-account-tab]").forEach((button) => {
    button.addEventListener("click", () => switchAccountTab(button.dataset.accountTab));
  });
  byId("loginUserSelect")?.addEventListener("change", () => fillLoginCredentialsFromSelect());
  byId("loginButton")?.addEventListener("click", loginWithCredentials);
  byId("quickLoginButton")?.addEventListener("click", quickLoginSelectedUser);
  byId("signupButton")?.addEventListener("click", createLocalAccount);
  byId("saveProfileButton")?.addEventListener("click", saveCurrentProfile);
  byId("savePreferenceButton")?.addEventListener("click", saveCurrentPreference);
  byId("savePasswordButton")?.addEventListener("click", saveCurrentPassword);
  byId("logoutButton")?.addEventListener("click", logoutCurrentUser);
  byId("saveSettingsButton")?.addEventListener("click", saveSettingsForm);
}

function openModal(id) {
  const modal = byId(id);
  if (!modal) return;
  if (id === "accountModal") {
    if (modal.hidden) {
      byId("accountFeedback").textContent = "";
      switchAccountTab("overviewPanel");
    }
    renderAccountModal();
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector(".app-modal-card")?.focus();
}

function closeModal(id) {
  const modal = byId(id);
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function mergeLocalUsers(baseUsers, localUsers) {
  const byUserId = new Map(baseUsers.map((user) => [Number(user.id), normalizeUser(user)]));
  localUsers.forEach((user) => byUserId.set(Number(user.id), normalizeUser(user, true)));
  return Array.from(byUserId.values());
}

function normalizeUser(user, local = Boolean(user.local)) {
  const id = Number(user.id);
  const name = user.name || `游客${id}`;
  return {
    ...user,
    id,
    name,
    email: isGeneratedLocalEmail(user.email) ? "" : (user.email || ""),
    password: user.password || "demo123",
    home_city: user.home_city || user.city || "北京",
    bio: user.bio || "喜欢把路线、风景和当天的心情一起记录下来。",
    avatar_color: user.avatar_color || pickAvatarColor(id),
    local,
    preference_tags: Array.isArray(user.preference_tags) ? user.preference_tags : splitTags(user.preference_tags || ""),
    preferred_categories: Array.isArray(user.preferred_categories) ? user.preferred_categories : splitTags(user.preferred_categories || ""),
    route_mode: user.route_mode || "walk",
    history_spot_ids: Array.isArray(user.history_spot_ids) ? user.history_spot_ids : []
  };
}

function loadLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || "[]").map((user) => normalizeUser(user, true));
  } catch {
    return [];
  }
}

function saveLocalUsers() {
  const localUsers = state.users.filter((user) => user.local);
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(localUsers));
}

function loadCurrentUserId() {
  const value = Number(localStorage.getItem(STORAGE_KEYS.currentUserId));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function setCurrentUser(id, { persist = true } = {}) {
  const user = state.users.find((item) => Number(item.id) === Number(id));
  if (!user) return;
  state.currentUserId = Number(user.id);
  if (persist) localStorage.setItem(STORAGE_KEYS.currentUserId, String(user.id));
  if (byId("userSelect")) byId("userSelect").value = String(user.id);
  byId("preferenceInput").value = (user.preference_tags || []).join(" ");
  state.mode = user.route_mode || state.mode;
  updateModeButtons();
  updateAccountUi();
  recommendSpots();
  renderDiaryList();
}

function logoutCurrentUser() {
  const fallback = state.users.find((user) => !user.local) || state.users[0];
  if (fallback) setCurrentUser(fallback.id);
  byId("accountFeedback").textContent = "已退出当前账号。";
  switchAccountTab("switchPanel");
}

function renderAccountModal() {
  fillLoginUserSelect();
  const user = selectedUser();
  const email = publicUserEmail(user);
  const profileColor = user?.avatar_color || "#0058bc";
  byId("accountAvatarLarge").textContent = avatarText(user);
  byId("accountAvatarLarge").style.background = profileColor;
  byId("accountNameDisplay").textContent = user?.name || "未登录";
  byId("accountEmailDisplay").textContent = user ? `${email || "未绑定邮箱"} · ${user.home_city || "未填写城市"}` : "登录后，资料会保存在当前浏览器。";
  byId("accountBioDisplay").textContent = user?.bio || "把这里当成你的旅行首页。";
  byId("accountIdBadge").textContent = user ? `ID ${user.id}` : "ID --";
  byId("profileIdInput").value = user?.id || "";
  byId("profileNameInput").value = user?.name || "";
  byId("profileEmailInput").value = email;
  byId("profileHomeCityInput").value = user?.home_city || "";
  byId("profileBioInput").value = user?.bio || "";
  byId("profileTagsInput").value = (user?.preference_tags || []).join(", ");
  byId("profileRouteModeSelect").value = user?.route_mode || "walk";
  byId("profileAvatarColorSelect").value = user?.avatar_color || "#0058bc";
  const diaryCount = state.diaries.filter((diary) => Number(diary.user_id) === Number(user?.id)).length;
  const commentCount = state.diaries.reduce((total, diary) => total + (diary.comments || []).filter((comment) => Number(comment.user_id) === Number(user?.id)).length, 0);
  const preferenceCount = (user?.preference_tags || []).length;
  byId("profileDiaryCount").textContent = diaryCount;
  byId("profileCommentCount").textContent = commentCount;
  byId("profilePreferenceCount").textContent = preferenceCount;
  byId("overviewAccountLabel").textContent = user?.name || "游客账号";
  byId("overviewAccountMeta").textContent = email ? `${email} · ID ${user?.id || "-"}` : `ID ${user?.id || "-"} · 当前浏览器本地保存`;
  byId("overviewPreferenceLabel").textContent = (user?.preference_tags || []).slice(0, 3).join(" / ") || "暂未设置";
  byId("overviewRouteLabel").textContent = user?.route_mode === "bike" ? "骑行" : "步行";
  if (!byId("loginIdentifierInput").value) fillLoginCredentialsFromSelect();
}

function updateAccountUi() {
  const user = selectedUser();
  const avatar = byId("accountButton");
  if (avatar) {
    avatar.textContent = avatarText(user);
    avatar.style.background = user?.avatar_color || "#cfd3dc";
    avatar.style.color = user?.avatar_color ? "#fff" : "#111827";
    avatar.title = user ? `${user.name} · 我的账号` : "登录账号";
  }
  if (byId("accountModal") && !byId("accountModal").hidden) renderAccountModal();
}

function avatarText(user) {
  return String(user?.name || "游").trim().slice(0, 1) || "游";
}

function publicUserEmail(user) {
  const email = String(user?.email || "").trim();
  return isGeneratedLocalEmail(email) ? "" : email;
}

function isGeneratedLocalEmail(email) {
  return /@vagabond\.local$/i.test(String(email || ""));
}

function switchAccountTab(panelId) {
  document.querySelectorAll("[data-account-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.accountTab === panelId);
  });
  document.querySelectorAll("[data-account-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function fillLoginCredentialsFromSelect() {
  const selectedId = Number(byId("loginUserSelect")?.value);
  const user = state.users.find((item) => Number(item.id) === selectedId);
  if (!user) return;
  byId("loginIdentifierInput").value = publicUserEmail(user) || String(user.id);
  byId("loginPasswordInput").value = "";
}

function loginWithCredentials() {
  const identifier = byId("loginIdentifierInput").value.trim().toLowerCase();
  const password = byId("loginPasswordInput").value;
  if (!identifier || !password) {
    byId("accountFeedback").textContent = "请填写账号 ID / 邮箱和密码。";
    return;
  }
  const user = state.users.find((item) =>
    String(item.id) === identifier || String(item.email || "").toLowerCase() === identifier
  );
  if (!user || String(user.password || "demo123") !== password) {
    byId("accountFeedback").textContent = "账号或密码不正确。演示账号默认密码为 demo123。";
    return;
  }
  setCurrentUser(user.id);
  byId("accountFeedback").textContent = `欢迎回来，${user.name}。`;
  switchAccountTab("overviewPanel");
}

function quickLoginSelectedUser() {
  const id = Number(byId("loginUserSelect").value);
  const user = state.users.find((item) => Number(item.id) === id);
  if (!user) return;
  setCurrentUser(user.id);
  byId("accountFeedback").textContent = `已切换到 ${user.name}。`;
  switchAccountTab("overviewPanel");
}

function createLocalAccount() {
  const name = byId("signupNameInput").value.trim();
  const email = byId("signupEmailInput").value.trim();
  const password = byId("signupPasswordInput").value;
  const homeCity = byId("signupHomeCityInput").value.trim();
  const tags = splitTags(byId("signupTagsInput").value);
  if (!name) {
    byId("accountFeedback").textContent = "请先填写昵称。";
    return;
  }
  if (!email || !email.includes("@")) {
    byId("accountFeedback").textContent = "请填写可识别的邮箱。";
    return;
  }
  if (state.users.some((user) => String(user.email || "").toLowerCase() === email.toLowerCase())) {
    byId("accountFeedback").textContent = "这个邮箱已经被使用。";
    return;
  }
  if (password.length < 6) {
    byId("accountFeedback").textContent = "密码至少需要 6 位。";
    return;
  }
  const id = Math.max(1000, ...state.users.map((user) => Number(user.id) || 0)) + 1;
  const user = normalizeUser({
    id,
    name,
    email,
    password,
    home_city: homeCity || "北京",
    bio: "新的旅程从这里开始。",
    avatar_color: pickAvatarColor(id),
    local: true,
    preference_tags: tags.length ? tags : ["旅行", "摄影"],
    preferred_categories: tags.slice(0, 2),
    route_mode: "walk",
    history_spot_ids: []
  }, true);
  state.users.push(user);
  saveLocalUsers();
  fillUserSelect();
  fillLoginUserSelect();
  setCurrentUser(user.id);
  byId("signupNameInput").value = "";
  byId("signupEmailInput").value = "";
  byId("signupPasswordInput").value = "";
  byId("signupHomeCityInput").value = "";
  byId("signupTagsInput").value = "";
  byId("accountFeedback").textContent = "新账号已创建并登录。";
  switchAccountTab("overviewPanel");
  renderAccountModal();
}

function saveCurrentProfile() {
  const user = selectedUser();
  if (!user) return;
  const oldId = Number(user.id);
  const nextId = Number(byId("profileIdInput").value);
  const nextName = byId("profileNameInput").value.trim();
  const nextEmail = byId("profileEmailInput").value.trim();
  if (!Number.isInteger(nextId) || nextId <= 0) {
    byId("accountFeedback").textContent = "账号 ID 必须是正整数。";
    return;
  }
  if (state.users.some((item) => Number(item.id) === nextId && Number(item.id) !== oldId)) {
    byId("accountFeedback").textContent = "这个账号 ID 已被使用。";
    return;
  }
  if (nextEmail && state.users.some((item) => String(item.email || "").toLowerCase() === nextEmail.toLowerCase() && Number(item.id) !== oldId)) {
    byId("accountFeedback").textContent = "这个邮箱已经被使用。";
    return;
  }
  user.id = nextId;
  user.name = nextName || user.name;
  user.email = nextEmail;
  user.home_city = byId("profileHomeCityInput").value.trim();
  user.bio = byId("profileBioInput").value.trim();
  if (!user.local) user.local = true;
  updateUserReferences(oldId, nextId, user.name);
  saveLocalUsers();
  fillUserSelect();
  fillLoginUserSelect();
  setCurrentUser(nextId);
  byId("accountFeedback").textContent = "资料已保存。";
  renderAccountModal();
}

function saveCurrentPreference() {
  const user = selectedUser();
  if (!user) return;
  user.preference_tags = splitTags(byId("profileTagsInput").value);
  user.preferred_categories = user.preference_tags.slice(0, 2);
  user.route_mode = byId("profileRouteModeSelect").value;
  user.avatar_color = byId("profileAvatarColorSelect").value;
  if (!user.local) user.local = true;
  saveLocalUsers();
  fillUserSelect();
  setCurrentUser(user.id);
  byId("accountFeedback").textContent = "偏好已保存，推荐结果已更新。";
  renderAccountModal();
}

function saveCurrentPassword() {
  const user = selectedUser();
  if (!user) return;
  const currentPassword = byId("currentPasswordInput").value;
  const newPassword = byId("newPasswordInput").value;
  if (String(user.password || "demo123") !== currentPassword) {
    byId("accountFeedback").textContent = "当前密码不正确。";
    return;
  }
  if (newPassword.length < 6) {
    byId("accountFeedback").textContent = "新密码至少需要 6 位。";
    return;
  }
  user.password = newPassword;
  if (!user.local) user.local = true;
  saveLocalUsers();
  byId("currentPasswordInput").value = "";
  byId("newPasswordInput").value = "";
  byId("accountFeedback").textContent = "密码已更新。";
}

function updateUserReferences(oldId, nextId, nextName) {
  if (oldId === nextId) return;
  state.diaries.forEach((diary) => {
    if (Number(diary.user_id) === oldId) diary.user_id = nextId;
    (diary.comments || []).forEach((comment) => {
      if (Number(comment.user_id) === oldId) {
        comment.user_id = nextId;
        comment.user_name = nextName || comment.user_name;
      }
    });
  });
}

function pickAvatarColor(seed) {
  const colors = ["#0058bc", "#008733", "#fd8b00", "#7c3aed"];
  const index = Math.abs(Number(seed) || 0) % colors.length;
  return colors[index];
}

function splitTags(value) {
  return String(value || "")
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function updateModeButtons() {
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
}

function renderStatusSummary() {
  const pack = findRegionPack(state.currentRegionPackId);
  byId("statusSummary").innerHTML = `
    <span><strong>${state.spots.length}</strong>目的地</span>
    <span><strong>${state.nodes.length}</strong>地图节点</span>
    <span><strong>${state.edges.length}</strong>道路边</span>
    <span><strong>${state.facilities.length}</strong>服务设施</span>
    <span><strong>${state.diaries.length}</strong>社区日记</span>
    <span><strong>${state.users.length}</strong>账号</span>
    <p>当前区域：${escapeHtml(pack?.name || "颐和园数据包")}</p>
  `;
}

function loadAppSettings() {
  try {
    return { ...state.appSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}") };
  } catch {
    return state.appSettings;
  }
}

function renderSettingsForm() {
  byId("themeSelect").value = state.appSettings.theme || "light";
  byId("compactCardsToggle").checked = Boolean(state.appSettings.compactCards);
  byId("defaultViewSelect").value = state.appSettings.defaultView || "recommendView";
  byId("defaultRouteModeSelect").value = state.appSettings.defaultRouteMode || "walk";
  byId("defaultDiarySortSelect").value = state.appSettings.defaultDiarySort || "heat";
  byId("settingsFeedback").textContent = "";
}

function saveSettingsForm() {
  state.appSettings = {
    theme: byId("themeSelect").value,
    compactCards: byId("compactCardsToggle").checked,
    defaultView: byId("defaultViewSelect").value,
    defaultRouteMode: byId("defaultRouteModeSelect").value,
    defaultDiarySort: byId("defaultDiarySortSelect").value
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.appSettings));
  applyAppSettings();
  byId("diarySort").value = state.appSettings.defaultDiarySort;
  state.mode = state.appSettings.defaultRouteMode;
  updateModeButtons();
  renderDiaryList();
  byId("settingsFeedback").textContent = "设置已保存。";
}

function applyAppSettings() {
  document.body.classList.toggle("theme-soft", state.appSettings.theme === "soft");
  document.body.classList.toggle("compact-cards", Boolean(state.appSettings.compactCards));
}

function fillLoginUserSelect() {
  const select = byId("loginUserSelect");
  if (!select) return;
  select.innerHTML = "";
  state.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${user.name} · ${(user.preference_tags || []).join("/")}`;
    select.appendChild(option);
  });
  if (state.currentUserId) select.value = String(state.currentUserId);
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
  selectableRouteNodes().forEach((node) => {
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

  selectableRouteNodes().forEach((node) => {
    const marker = L.circleMarker([node.lat, node.lon], {
      title: node.name,
      radius: 7,
      color: "#0b4f42",
      weight: 2.4,
      fillColor: "#f4b942",
      fillOpacity: 0.92
    }).addTo(state.map);
    marker.bindPopup(`<p class="popup-title">${escapeHtml(node.name)}</p><p class="popup-text">${escapeHtml(node.description || node.type)}</p>`);
    marker.bindTooltip(node.name, {
      permanent: true,
      direction: "top",
      offset: [0, -8],
      className: "map-label spot-label"
    });
    marker.on("click", () => showNodeDetail(node));
    state.markers.set(node.id, marker);
  });
}

function renderFacilityMapMarkers() {
  if (!state.map) return;
  state.facilityLayers.forEach((layer) => layer.remove());
  state.facilityLayers = [];

  state.facilities.slice(0, 28).forEach((facility) => {
    const marker = L.marker([facility.lat, facility.lon], {
      title: facility.name,
      icon: L.divIcon({
        className: `facility-map-marker ${facilityMarkerClass(facility.type)}`,
        html: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
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
}

function showNodeDetail(node) {
  if (!node) return;
  state.selectedNodeId = node.id;
  const spot = findSpot(node.spot_id);
  const image = resolveAssetPath(node.image);
  const canRoute = isRoutableNode(node.id);
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
      ${canRoute ? "" : '<p class="route-node-note">该地点可查看详情，暂不参与路线规划。</p>'}
    <div class="detail-actions">
      <button class="node-action" type="button" data-action="start" ${canRoute ? "" : "disabled"}>设为起点</button>
      <button class="node-action" type="button" data-action="goal" ${canRoute ? "" : "disabled"}>设为终点</button>
      <button class="node-action full" type="button" data-action="multi" ${canRoute ? "" : "disabled"}>加入多点游览</button>
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
  const preferenceInput = byId("preferenceInput").value.trim();
  const keywordInput = byId("recommendKeyword").value.trim();
  const keyword = keywordInput;
  const preference = `${preferenceInput} ${(user?.preference_tags || []).join(" ")}`.trim();
  const categoryPreference = (user?.preferred_categories || []).join(" ");
  const activeIntent = `${preferenceInput} ${keywordInput}`.trim();
  const maxHeat = Math.max(...state.spots.map((spot) => Number(spot.heat) || 0), 1);
  const lshCandidates = getLshCandidates(state.spotLshIndex, activeIntent || preference || categoryPreference, state.spots, 36);
  let scopedCandidates = lshCandidates
    .filter((spot) => (!category || spot.category === category) && matchesSpotSearch(spot, keyword));
  if (scopedCandidates.length < 10) {
    scopedCandidates = state.spots.filter((spot) => (!category || spot.category === category) && matchesSpotSearch(spot, keyword));
  }
  const scored = scopedCandidates
    .map((spot) => {
      const profileMatch = spotInterestScore(spot, preference, categoryPreference);
      const intentMatch = activeIntent ? recommendationIntentScore(spot, activeIntent) : profileMatch;
      const match = activeIntent ? clamp(0.78 * intentMatch + 0.22 * profileMatch, 0.18, 0.99) : profileMatch;
      const ratingScore = Number(spot.rating) / 5;
      const heatScore = Number(spot.heat) / maxHeat;
      const score = activeIntent
        ? 0.58 * match + 0.22 * ratingScore + 0.14 * heatScore + 0.06 * profileMatch
        : 0.34 * ratingScore + 0.28 * heatScore + 0.38 * match;
      return { spot, score, match, ratingScore, heatScore, sortScore: spotSortScore(sortMode, score, ratingScore, heatScore, match) };
    });
  const results = topK(scored, 10, (item) => item.sortScore);

  renderRecommendationCards(results, {
    totalCount: state.spots.length,
    candidateCount: scopedCandidates.length,
    lshBucketCount: lshCandidates.length,
    category,
    keyword,
    intent: activeIntent,
    sortMode
  });
}

function renderRecommendationCards(results, meta = {}) {
  const container = byId("recommendResults");
  const note = byId("recommendAlgorithmNote");
  if (note) {
    note.innerHTML = `
      <span>${meta.intent ? `已按「${escapeHtml(meta.intent)}」重新推荐` : "已按你的偏好筛选"}</span>
      <span>${meta.category ? `当前分类 ${escapeHtml(meta.category)}` : "全部分类"}</span>
      <span>${recommendSortLabel(meta.sortMode)}</span>
      <span>显示 ${results.length} 个更适合出发的地点</span>
    `;
  }
  container.innerHTML = "";
  results.forEach((item, index) => {
    const node = findNodeBySpot(item.spot.id);
    const image = recommendationImage(item.spot, node);
    const match = clamp(item.match || 0, 0, 1);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="card-image-wrap">
        <img class="card-media" src="${image}" alt="${escapeHtml(item.spot.name)}">
        <span class="rating-badge">★ ${Number(item.spot.rating).toFixed(1)}</span>
      </div>
      <div class="card-body">
        <p class="eyebrow">推荐 ${index + 1}</p>
        <h3>${escapeHtml(item.spot.name)}</h3>
        <p class="meta-line">${escapeHtml(item.spot.category)} · ${escapeHtml(item.spot.tags)}</p>
        <div class="soft-stats">
          <span class="pill amber">人气 ${item.spot.heat}</span>
          <span class="pill">适合度 ${(match * 100).toFixed(0)}%</span>
        </div>
        <div class="interest-meter" aria-label="适合度 ${(match * 100).toFixed(0)}%">
          <span style="width: ${Math.max(8, match * 100).toFixed(0)}%"></span>
        </div>
        <div class="interest-label"><span>轻松探索</span><span>${match >= 0.72 ? "High Interest" : match >= 0.38 ? "Balanced" : "Quiet"}</span></div>
        <div class="card-actions">
          ${node ? `<button class="link-button" data-focus-node="${node.id}">地图定位</button>${isRoutableNode(node.id) ? `<button class="link-button" data-route-goal="${node.id}">设为终点</button>` : '<span class="route-node-note">可查看详情</span>'}` : ""}
        </div>
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
    summarize("目的地太多会影响规划体验，建议先选择 12 个以内的重点停留点。");
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
    color: "#ffffff",
    weight: 12,
    opacity: 0.92,
    lineCap: "round",
    lineJoin: "round"
  }).addTo(state.map);
  state.routeLayers.push(bg);
  const fg = L.polyline(latLngs, {
    color,
    weight: 6,
    opacity: 0.95,
    dashArray: "12 10",
    lineCap: "round",
    lineJoin: "round"
  }).addTo(state.map);
  state.routeLayers.push(fg);
  path.forEach((id, index) => {
    const node = findNode(id);
    const shouldMark = index === 0 || index === path.length - 1 || Number(node?.spot_id) > 0;
    if (!shouldMark) return;
    const marker = L.circleMarker([node.lat, node.lon], {
      radius: index === 0 || index === path.length - 1 ? 8 : 6,
      color,
      weight: 3,
      fillColor: "#ffffff",
      fillOpacity: 0.98
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
    <div class="card-body">
      <p class="eyebrow">附近可达场所</p>
      <h3>${results.length ? `找到 ${results.length} 个服务点` : "暂未找到匹配场所"}</h3>
      <p>已按实际游览路线距离排序；当前范围 ${meta.range >= 99999 ? "全部可达" : `${meta.range} 米内`}。</p>
    </div>
  `;
  container.appendChild(summary);
  results.forEach((item, index) => {
    const node = findNodeBySpot(item.facility.near_spot_id);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="card-body">
        <p class="eyebrow">场所 ${index + 1} · ${escapeHtml(item.facility.type)}</p>
        <h3>${escapeHtml(item.facility.name)}</h3>
        <p class="meta-line">${escapeHtml(item.facility.tags)} · 步行路径约 ${item.distance.toFixed(1)} 米</p>
        <div class="soft-stats">
          <span class="pill">★ ${Number(item.facility.rating).toFixed(1)}</span>
          <span class="pill amber">人气 ${item.facility.heat}</span>
        </div>
        <div class="card-actions">
          ${node ? `<button class="link-button" data-focus-node="${node.id}">定位附近景点</button>` : ""}
        </div>
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
    const searchLabel = mode === "title" ? "按标题查找" : mode === "destination" ? "按目的地查找" : "按正文查找";
    note.innerHTML = `
      <span>${searchLabel}</span>
      <span>${sort === "interest" ? "按你的偏好重排" : "按社区反馈排序"}</span>
      <span>${results.length} 篇旅行故事</span>
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
    const image = diaryCardImage(item.diary);
    const date = String(item.diary.created_at || "").slice(0, 10) || "近期";
    const content = publicDiaryContent(item.diary);
    const excerpt = diaryExcerpt(content);
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="card-image-wrap">
        <img class="diary-card-media" src="${image}" alt="${escapeHtml(item.diary.title)}">
        <span class="rating-badge">★ ${Number(item.diary.rating).toFixed(1)}</span>
      </div>
      <div class="card-body">
        <div class="diary-card-meta">
          <span class="diary-avatar">${escapeHtml(String(item.diary.destination || "旅").slice(0, 1))}</span>
          <span>${escapeHtml(item.diary.destination)}</span>
          <span>·</span>
          <span>${escapeHtml(date)}</span>
        </div>
        <h3>${escapeHtml(item.diary.title)}</h3>
        <p class="diary-excerpt">${escapeHtml(excerpt)}</p>
        <div class="diary-tag-row">${(item.diary.tags || []).slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="soft-stats">
          <span class="pill amber">浏览 ${item.diary.heat}</span>
          <span class="pill">适合度 ${(item.interestScore * 100).toFixed(0)}%</span>
        </div>
        ${item.diary.media ? `<small>媒体：${escapeHtml(item.diary.media)}</small>` : ""}
        <div class="card-actions">
          <button class="link-button read-link" type="button" data-diary-open="${item.diary.id}">阅读全文</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  bindDiaryButtons(container);
}

function diaryCardImage(diary) {
  const text = `${diary.destination || ""} ${(diary.tags || []).join(" ")} ${diary.content || ""}`;
  if (/桥|湖|水|夕阳|昆明湖|十七孔/.test(text)) return WATER_IMAGE;
  if (/校园|清华|学校|图书馆|教学楼/.test(text)) return CAMPUS_IMAGE;
  if (/建筑|殿|楼|文化|展厅|博物馆/.test(text)) return BUILDING_IMAGE;
  const index = Math.abs(Math.floor(stableFraction(`${diary.id}|${diary.title}`) * DIARY_IMAGES.length)) % DIARY_IMAGES.length;
  return DIARY_IMAGES[index];
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
    comments: [],
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
  byId("aigcStoryboard").innerHTML = `<strong>日记已保存</strong><p>${escapeHtml(title)} 已加入社区日记列表，可以在下方继续浏览和评分。</p>`;
  renderDiaryList();
}

function exportDiariesJson() {
  const exportPayload = state.diaries.map((diary) => ({
    id: diary.id,
    title: diary.title,
    user_id: diary.user_id,
    destination: diary.destination,
    rating: diary.rating,
    heat: diary.heat,
    created_at: diary.created_at,
    tags: diary.tags || [],
    content: diary.content,
    media: diary.media || "",
    comments: diary.comments || [],
    original_bytes: diary.original_bytes,
    compressed_bytes: diary.compressed_bytes
  }));
  const filename = `diaries-index-export-${formatTimestampForFilename(new Date())}.json`;
  downloadJson(filename, exportPayload);
  byId("aigcStoryboard").innerHTML = `
    <strong>日记 JSON 已导出</strong>
    <p>已导出 ${exportPayload.length} 条日记，可同步到项目数据目录继续维护。</p>
  `;
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatTimestampForFilename(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function bindDiaryButtons(container) {
  container.querySelectorAll("[data-diary-open]").forEach((button) => {
    button.addEventListener("click", () => {
      openDiaryModal(Number(button.dataset.diaryOpen));
    });
  });
  container.querySelectorAll("[data-diary-rate]").forEach((button) => {
    button.addEventListener("click", () => {
      rateDiary(Number(button.dataset.diaryRate));
    });
  });
}

function setupDiaryModal() {
  const modal = byId("diaryModal");
  if (!modal) return;
  modal.querySelectorAll("[data-diary-close]").forEach((button) => {
    button.addEventListener("click", closeDiaryModal);
  });
  byId("diaryStarPicker")?.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      setDiaryDraftRating(Number(button.dataset.rating));
    });
  });
  byId("diarySubmitReviewButton")?.addEventListener("click", () => {
    submitDiaryReview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeDiaryModal();
  });
}

function openDiaryModal(id, { incrementHeat = true } = {}) {
  const diary = findDiary(id);
  const modal = byId("diaryModal");
  if (!diary || !modal) return;
  if (incrementHeat) diary.heat = Number(diary.heat || 0) + 1;
  modal.dataset.diaryId = String(diary.id);
  byId("diaryModalImage").src = diaryCardImage(diary);
  byId("diaryModalImage").alt = diary.title || "旅行日记图片";
  updateDiaryModalMeta(diary);
  byId("diaryModalTitle").textContent = diary.title || "旅行日记";
  byId("diaryModalContent").textContent = publicDiaryContent(diary);
  byId("diaryModalTags").innerHTML = (diary.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  byId("diaryCommentInput").value = "";
  byId("diaryReviewHint").textContent = "选择 1-5 星并留下评论";
  byId("diarySubmitReviewButton").textContent = "提交评价";
  setDiaryDraftRating(0);
  renderDiaryComments(diary);
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector(".diary-modal-card")?.focus();
  renderDiaryList();
}

function updateDiaryModalMeta(diary) {
  byId("diaryModalMeta").innerHTML = `
    <span class="diary-avatar">${escapeHtml(String(diary.destination || "旅").slice(0, 1))}</span>
    <span>${escapeHtml(diary.destination || "旅行目的地")}</span>
    <span>·</span>
    <span>${escapeHtml(String(diary.created_at || "").slice(0, 10) || "近期")}</span>
    <span>·</span>
    <span>★ ${Number(diary.rating || 0).toFixed(1)}</span>
  `;
}

function closeDiaryModal() {
  const modal = byId("diaryModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function setDiaryDraftRating(rating) {
  const modal = byId("diaryModal");
  if (!modal) return;
  const value = clamp(Number(rating) || 0, 0, 5);
  modal.dataset.rating = String(value);
  byId("diaryStarPicker")?.querySelectorAll("[data-rating]").forEach((button) => {
    const active = Number(button.dataset.rating) <= value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(Number(button.dataset.rating) === value));
  });
  if (value > 0) byId("diaryReviewHint").textContent = `已选择 ${value} 星`;
}

function submitDiaryReview() {
  const modal = byId("diaryModal");
  if (!modal) return;
  const id = Number(modal.dataset.diaryId);
  const rating = Number(modal.dataset.rating || 0);
  const content = byId("diaryCommentInput").value.trim();
  if (!rating) {
    byId("diaryReviewHint").textContent = "请先选择 1-5 星评分";
    return;
  }
  if (!content) {
    byId("diaryReviewHint").textContent = "请写一句评论再提交";
    byId("diaryCommentInput").focus();
    return;
  }
  const diary = addDiaryReview(id, rating, content);
  if (!diary) return;
  byId("diaryCommentInput").value = "";
  byId("diarySubmitReviewButton").textContent = "已提交";
  byId("diaryReviewHint").textContent = `感谢评价，当前均分 ★ ${Number(diary.rating || 0).toFixed(1)}`;
  setDiaryDraftRating(0);
  updateDiaryModalMeta(diary);
  renderDiaryComments(diary);
  renderDiaryList();
}

function addDiaryReview(id, rating, content) {
  const diary = findDiary(id);
  if (!diary) return null;
  const user = selectedUser();
  if (!Array.isArray(diary.comments)) diary.comments = [];
  diary.comments.unshift({
    user_id: user?.id || 1,
    user_name: user?.name || "旅行者",
    rating,
    content,
    created_at: new Date().toISOString().slice(0, 19).replace("T", " ")
  });
  const commentRatings = diary.comments.map((comment) => Number(comment.rating)).filter((value) => value > 0);
  diary.rating = clamp((Number(diary.rating || rating) + rating + commentRatings.reduce((sum, value) => sum + value, 0) / commentRatings.length) / 3, 1, 5);
  return diary;
}

function renderDiaryComments(diary) {
  const comments = Array.isArray(diary.comments) ? diary.comments : [];
  byId("diaryCommentCount").textContent = `${comments.length} 条`;
  const list = byId("diaryCommentList");
  if (!comments.length) {
    list.innerHTML = `<p class="empty-comments">还没有评论，来写下第一条观感。</p>`;
    return;
  }
  list.innerHTML = comments.map((comment) => `
    <article class="diary-comment">
      <div class="diary-comment-top">
        <strong>${escapeHtml(comment.user_name || `用户 ${comment.user_id || ""}`)}</strong>
        <span>★ ${Number(comment.rating || 0).toFixed(1)}</span>
      </div>
      <p>${escapeHtml(comment.content || "")}</p>
      <small>${escapeHtml(String(comment.created_at || "").slice(0, 10) || "刚刚")}</small>
    </article>
  `).join("");
}

function findDiary(id) {
  return state.diaries.find((diary) => Number(diary.id) === Number(id));
}

function diaryExcerpt(content, maxLength = 86) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/[，。；、\s]+$/, "")}...`;
}

function publicDiaryContent(diary) {
  const raw = String(diary?.content || "");
  const cleaned = raw
    .replace(/本次路线围绕[^。]*?展开，结合评分、热度和个人兴趣排序，适合在答辩时展示旅游日记管理、查询、推荐和压缩统计。?/g, "")
    .replace(/适合在答辩时展示[^。]*。?/g, "")
    .replace(/结合评分、热度和个人兴趣排序[^。]*。?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned && cleaned !== `${diary?.title || ""}：`) return cleaned;
  return fallbackDiaryContent(diary);
}

function fallbackDiaryContent(diary) {
  const destination = diary?.destination || "目的地";
  const tags = (diary?.tags || []).slice(0, 2).join("、") || "风景";
  return `这次在${destination}停留得很舒服，沿途的${tags}给人留下了很清晰的记忆。慢慢走、随手拍，再把喜欢的片段写下来，比赶完所有景点更有旅行的感觉。`;
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
    <strong>日记草稿已生成</strong>
    <p class="storyboard-hint">已根据用户偏好和路线内容整理出一版可编辑草稿。</p>
    <p>今天的路线围绕 ${escapeHtml(preference)} 展开，从入口进入后依次记录建筑、湖景和服务设施体验。你可以继续补充照片说明，让日记更像一篇完整的旅行故事。</p>
  `;
}

function generateAigcStoryboard() {
  const user = selectedUser();
  const preference = (user?.preference_tags || ["文化", "路线"]).slice(0, 3);
  const frames = [
    `开场：从用户上传的入口照片识别旅行地点，叠加偏好标签 ${preference.join("、")}。`,
    "转场：沿最短路径展示游览轨迹，突出道路节点和停留点。",
    "中景：把评分、热度和日记关键词生成字幕，说明推荐原因。",
    "结尾：输出 8 秒旅行动画脚本草稿，用作日记封面或短视频分镜。"
  ];
  byId("aigcStoryboard").innerHTML = `
    <strong>旅行分镜已生成</strong>
    <p class="storyboard-hint">根据照片描述、路线和偏好生成一组可展示的短片脚本。</p>
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
      <span>已筛选 ${meta.candidateCount || 0} 个可选餐饮</span>
      <span>${foodSortLabel(meta.sortMode)}</span>
      <span>显示前 ${results.length} 个更适合停留的地点</span>
    `;
  }
  container.innerHTML = "";
  results.forEach((item, index) => {
    const image = resolveAssetPath(item.nearNode?.image || "") || fallbackImageForSpot(findSpot(item.restaurant.near_spot_id) || {});
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="card-image-wrap">
        <img class="card-thumb" src="${image}" alt="${escapeHtml(item.restaurant.name)}">
        <span class="rating-badge">★ ${Number(item.restaurant.rating).toFixed(1)}</span>
      </div>
      <div class="card-body">
        <p class="eyebrow">美食 ${index + 1}</p>
        <h3>${escapeHtml(item.restaurant.name)}</h3>
        <p class="meta-line">${escapeHtml(item.restaurant.cuisine)} · 近 ${escapeHtml(findSpot(item.restaurant.near_spot_id)?.name || "景点")} · 步行约 ${item.distance.toFixed(1)} 米</p>
        <div class="soft-stats">
          <span class="pill amber">人气 ${item.restaurant.heat}</span>
          <span class="pill red">${escapeHtml(item.restaurant.cuisine)}</span>
        </div>
        <div class="card-actions">
          ${item.nearNode ? `<button class="link-button" data-focus-node="${item.nearNode.id}">定位附近景点</button><button class="link-button" data-route-goal="${item.nearNode.id}">规划过去</button>` : ""}
        </div>
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
  if (sortMode === "heat") return "人气优先";
  if (sortMode === "rating") return "口碑优先";
  if (sortMode === "distance") return "离你更近";
  return "综合更适合";
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
  const pathNodes = result.path.map((id) => findNode(id)).filter(Boolean);
  const poiNodes = pathNodes.filter((node) => Number(node.spot_id) > 0);
  const transitionCount = pathNodes.filter((node) => Number(node.spot_id) === 0).length;
  const start = pathNodes[0];
  const goal = pathNodes[pathNodes.length - 1];
  const keyPoi = unique(poiNodes.map((node) => node.name));
  const strategy = routeStrategyInfo(result.strategy);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">${escapeHtml(title)}</p>
    <h3>${state.mode === "bike" ? "骑行" : "步行"} · 总距离 ${result.distance.toFixed(1)} 米 · 约 ${result.minutes.toFixed(1)} 分钟</h3>
    <p>${escapeHtml(strategy.algorithm)}，沿途经过 ${transitionCount} 个连接点。</p>
    <p>起点：${escapeHtml(start?.name || "-")}；终点：${escapeHtml(goal?.name || "-")}。</p>
    <ol>${keyPoi.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ol>
  `;
}

function summarizeMultiRoute(order, tsp) {
  const strategy = routeStrategyInfo(tsp.strategy);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">多点游览顺序</p>
    <h3>${state.mode === "bike" ? "骑行" : "步行"} · 总距离 ${tsp.totalDistance.toFixed(1)} 米 · 约 ${tsp.totalMinutes.toFixed(1)} 分钟</h3>
    <p>${escapeHtml(strategy.algorithm)}，按更顺路的顺序串联多个目的地。</p>
    <ol>${order.map((leg) => {
      const from = findNode(leg.from)?.name || leg.from;
      const to = findNode(leg.to)?.name || leg.to;
      return `<li>${escapeHtml(from)} → ${escapeHtml(to)} · ${leg.result.distance.toFixed(1)} 米 · ${leg.result.minutes.toFixed(1)} 分钟</li>`;
    }).join("")}</ol>
  `;
}

function summarize(message) {
  byId("route-summary").innerHTML = `<p class="eyebrow">路线提示</p><h3>${escapeHtml(message)}</h3>`;
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
  if (!container) return;
  container.querySelectorAll("[data-focus-node], [data-route-goal]").forEach((button) => {
    button.dataset.actionReady = "true";
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
  const node = findNodeBySpot(spot.id);
  return [
    spot.name,
    spot.category,
    spot.tags,
    node?.name,
    node?.type,
    node?.description
  ].filter(Boolean).join(" ").toLowerCase();
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
      <rect width="256" height="256" fill="#eef4ff"/>
      <path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#dce6f7" stroke-width="1"/>
      <path d="M18 214C70 170 96 184 132 148C169 112 199 120 238 82" fill="none" stroke="#b9d2cc" stroke-width="8" stroke-linecap="round" opacity=".62"/>
      <path d="M-10 96C42 70 73 80 112 55C152 30 190 34 266 20" fill="none" stroke="#c8e0da" stroke-width="6" stroke-linecap="round" opacity=".45"/>
      <circle cx="78" cy="126" r="3" fill="#8aa2b7" opacity=".65"/>
      <circle cx="168" cy="92" r="3" fill="#8aa2b7" opacity=".65"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
