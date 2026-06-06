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
  const pack = findRegionPack(state.currentRegionPackId);
  const packName = pack?.name || "当前区域";
  const label = document.querySelector(".fixed-map-region");
  if (label) label.textContent = packName;
  const notice = byId("mapDataNotice");
  if (!notice) return;
  notice.textContent = `当前区域：${packName}，${selectableRouteNodes().length} 个可选目的地；路线按本区域路网计算。`;
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

function findNodeBySearch(keyword, candidates = selectableRouteNodes()) {
  if (!keyword || keyword.length < 2) return null;
  const normalized = keyword.toLowerCase();
  return candidates.find((node) => String(node.name || "").toLowerCase() === normalized)
    || candidates.find((node) => String(node.name || "").toLowerCase().includes(normalized));
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
