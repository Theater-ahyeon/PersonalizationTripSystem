document.addEventListener("DOMContentLoaded", async () => {
  bindStaticControls();
  try {
    const [nodes, edges, roads, spots, restaurants, facilities, users, diaries, regionPacks] = await Promise.all([
      loadJson(DATA_PATHS.nodes),
      loadJson(DATA_PATHS.edges),
      loadJson(DATA_PATHS.roads),
      loadJson(DATA_PATHS.spots),
      loadJson(DATA_PATHS.restaurants),
      loadJson(DATA_PATHS.facilities),
      loadJson(DATA_PATHS.users),
      loadJson(DATA_PATHS.diaries),
      loadOptionalJson(DATA_PATHS.regions, [])
    ]);
    state.nodes = nodes;
    state.edges = edges;
    state.roads = roads;
    state.spots = spots;
    state.restaurants = restaurants;
    state.facilities = facilities;
    state.users = mergeLocalUsers(users, loadLocalUsers());
    state.diaries = diaries;
    state.regionPacks = regionPacks;
    state.appSettings = loadAppSettings();
    state.aigcConfig = loadAigcConfig();
    state.diaryScope = loadDiaryScope();
    state.currentUserId = loadCurrentUserId() || Number(state.users[0]?.id) || 1;
    state.currentRegionPackId = state.regionPacks.find((pack) => pack.id === "summer_palace")?.id
      || state.regionPacks.find((pack) => pack.status === "active")?.id
      || "summer_palace";
    applyAppSettings();

    initializeMap();
    reloadCurrentDataset({ fit: true });
    updateAccountUi();
    await applyInitialUrlState();
    await refreshAigcServiceStatus();
    byId("loadingState").classList.add("hidden");
  } catch (error) {
    const errMsg = error && error.message ? error.message : String(error || "未知错误");
    byId("loadingState").textContent = `数据加载失败：${errMsg}`;
    byId("mapFallback").hidden = false;
  }
});

function bindStaticControls() {
  document.addEventListener("click", handleGlobalResultAction);
  setupDiaryComposeToggle();

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
    const exactNode = findNodeBySearch(keyword, filtered);
    if (exactNode) focusNode(exactNode.id);
  });
  byId("nodeSearchInput").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const keyword = event.target.value.trim().toLowerCase();
    const candidates = selectableRouteNodes().filter((node) => textOfNode(node).toLowerCase().includes(keyword));
    const target = findNodeBySearch(keyword, candidates) || candidates[0];
    if (target) {
      event.preventDefault();
      renderNodeList(candidates);
      focusNode(target.id);
    }
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
    runShortestPath();
  });
  byId("reset-congestion")?.addEventListener("click", resetCongestion);
  const clearRouteButton = byId("clearRouteButton");
  if (clearRouteButton) clearRouteButton.addEventListener("click", clearRouteLayers);
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

  const renderDiaryListFromFirstPage = () => {
    state.diaryPage = 1;
    renderDiaryList();
  };
  byId("diarySearchButton").addEventListener("click", handleDiarySearchClick);
  byId("diaryKeyword").addEventListener("input", debounce(renderDiaryListFromFirstPage, 180));
  byId("diaryScopeSelect").addEventListener("change", () => {
    state.diaryScope = byId("diaryScopeSelect").value;
    state.diaryPage = 1;
    localStorage.setItem(STORAGE_KEYS.diaryScope, state.diaryScope);
    renderDiaryList();
  });
  byId("diarySort").addEventListener("change", renderDiaryListFromFirstPage);
  byId("diarySearchMode").addEventListener("change", renderDiaryListFromFirstPage);
  byId("diaryCreateButton").addEventListener("click", createDiaryEntry);
  byId("diaryExportButton").addEventListener("click", exportDiariesJson);
  byId("indoorBuildingSelect")?.addEventListener("change", () => {
    fillIndoorSelects();
    renderIndoorBuildingIntro();
  });
  byId("indoorRouteButton").addEventListener("click", runIndoorRoute);
  byId("aigcDraftButton").addEventListener("click", generateDiaryDraft);
  byId("aigcAnimationButton").addEventListener("click", () => generateAigcStoryboard({ useApi: true }));
  byId("aigcImagesButton")?.addEventListener("click", () => generateAigcImages());
  byId("aigcVideoButton")?.addEventListener("click", () => generateAigcVideo());
  byId("aigcPipelineButton")?.addEventListener("click", () => generateAigcPipeline());
  setupDiaryModal();
  setupAccountSystem();

  byId("foodRecommendButton").addEventListener("click", handleFoodRecommendClick);
  byId("foodSpotSelect").addEventListener("change", recommendFood);
  byId("cuisineSelect").addEventListener("change", recommendFood);
  byId("foodSortSelect").addEventListener("change", recommendFood);
  byId("foodKeyword").addEventListener("input", debounce(recommendFood, 180));
}

function setupDiaryComposeToggle() {
  const button = byId("diaryComposeToggle");
  const panel = byId("diaryComposePanel");
  if (!button || !panel) return;
  toggleDiaryCompose(false);
  button.addEventListener("click", () => toggleDiaryCompose());
}

function toggleDiaryCompose(expanded = null) {
  const button = byId("diaryComposeToggle");
  const panel = byId("diaryComposePanel");
  if (!button || !panel) return;
  const nextExpanded = expanded === null ? button.getAttribute("aria-expanded") !== "true" : Boolean(expanded);
  button.setAttribute("aria-expanded", String(nextExpanded));
  button.textContent = nextExpanded ? "收起表单" : "写日记";
  panel.classList.toggle("diary-compose-collapsed", !nextExpanded);
  panel.setAttribute("aria-hidden", String(!nextExpanded));
  if ("inert" in panel) panel.inert = !nextExpanded;
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
  state.diaryPage = 1;
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
    return;
  }

  const indoorExpandButton = event.target.closest("[data-indoor-expand]");
  if (indoorExpandButton) {
    event.preventDefault();
    openIndoorMapModal();
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
