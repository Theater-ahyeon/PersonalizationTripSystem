function fillIndoorSelects() {
  const buildingSelect = byId("indoorBuildingSelect");
  if (buildingSelect && !buildingSelect.options.length) {
    INDOOR_BUILDINGS.forEach((building) => {
      const option = document.createElement("option");
      option.value = building.id;
      option.textContent = building.name;
      buildingSelect.appendChild(option);
    });
  }
  const building = currentIndoorBuilding();
  const start = byId("indoorStartSelect");
  const goal = byId("indoorGoalSelect");
  [start, goal].forEach((select) => {
    select.innerHTML = "";
    building.nodes.forEach((node) => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} · ${node.floor}`;
      select.appendChild(option);
    });
  });
  start.value = building.nodes[0]?.id || "";
  goal.value = building.nodes[building.nodes.length - 1]?.id || "";
  renderIndoorBuildingIntro();
}

function runIndoorRoute() {
  const building = currentIndoorBuilding();
  const start = byId("indoorStartSelect").value;
  const goal = byId("indoorGoalSelect").value;
  const result = shortestIndoorPath(start, goal, building);
  const container = byId("indoorRouteResult");
  if (!result) {
    lastIndoorRoute = null;
    lastIndoorBuilding = building;
    container.textContent = "当前室内节点不可达。";
    return;
  }
  lastIndoorRoute = result;
  lastIndoorBuilding = building;
  const minutes = indoorEstimatedMinutes(result.distance);
  container.innerHTML = `
    <strong>Indoor shortest path ${result.distance}m</strong>
    ${renderIndoorRouteMeta(result, minutes)}
    ${renderIndoorSource(building, true)}
    <p class="indoor-visualization-note">Current acceptance choice: indoor navigation is visualized in this panel and modal floor plan, not as a Leaflet map overlay.</p>
    ${renderIndoorPlan(result, building)}
    <button class="link-button indoor-expand-button" type="button" data-indoor-expand>展开平面图</button>
    ${renderIndoorStepList(result, building, "indoor-step-list")}
  `;
}

function currentIndoorBuilding() {
  const selected = byId("indoorBuildingSelect")?.value;
  return INDOOR_BUILDINGS.find((building) => building.id === selected) || INDOOR_BUILDINGS[0];
}

function renderIndoorBuildingIntro() {
  const container = byId("indoorRouteResult");
  if (!container) return;
  const building = currentIndoorBuilding();
  lastIndoorRoute = { path: [], distance: 0 };
  lastIndoorBuilding = building;
  container.innerHTML = `
    <strong>${escapeHtml(building.name)}</strong>
    ${renderIndoorSource(building, false)}
    <p class="indoor-visualization-note">Current acceptance choice: indoor navigation is visualized in this panel and modal floor plan, not as a Leaflet map overlay.</p>
    ${renderIndoorPlan({ path: [], distance: 0 }, building)}
    <button class="link-button indoor-expand-button" type="button" data-indoor-expand>展开平面图</button>
  `;
}

function indoorEstimatedMinutes(distance) {
  return Math.max(1, Math.ceil(Number(distance || 0) / 45));
}

function renderIndoorRouteMeta(result, minutes = indoorEstimatedMinutes(result.distance)) {
  const stops = Array.isArray(result.path) ? result.path.length : 0;
  return `
    <div class="indoor-route-meta">
      <span>${Number(result.distance || 0).toFixed(0)}m</span>
      <span>${minutes} min</span>
      <span>${stops} nodes</span>
    </div>
  `;
}

function renderIndoorStepList(result, building, className = "indoor-step-list") {
  if (!result.path?.length) return "";
  return `
    <ol class="${className}">
      ${result.path.map((id, index) => {
        const node = building.nodes.find((item) => item.id === id);
        return node ? `<li><span>${index + 1}</span><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.floor)}</small></li>` : "";
      }).join("")}
    </ol>
  `;
}

function renderIndoorPlan(result, building = currentIndoorBuilding()) {
  const pathSet = new Set(result.path);
  const nodes = building.nodes.map((node) => {
    const left = Number(node.x || 50);
    const top = Number(node.y || 50);
    const active = pathSet.has(node.id) ? " active" : "";
    return `<span class="indoor-node${active}" style="left:${left}%;top:${top}%">${escapeHtml(node.name)}</span>`;
  }).join("");
  const lines = building.edges.map(([from, to]) => {
    const a = building.nodes.find((node) => node.id === from);
    const b = building.nodes.find((node) => node.id === to);
    if (!a || !b) return "";
    const active = pathHasIndoorEdge(result.path, from, to) ? " active" : "";
    const x1 = Number(a.x || 0);
    const y1 = Number(a.y || 0);
    const x2 = Number(b.x || 0);
    const y2 = Number(b.y || 0);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<span class="indoor-edge${active}" style="left:${x1}%;top:${y1}%;width:${length}%;transform:rotate(${angle}deg)"></span>`;
  }).join("");
  const floors = (building.floors && building.floors.length ? building.floors : unique(building.nodes.map((node) => node.floor))).slice(0, 5);
  const floorLabels = floors.map((floor, index) => {
    const top = floors.length === 1 ? 50 : 10 + (index * (80 / (floors.length - 1)));
    return `<span class="indoor-floor" style="top:${top}%">${escapeHtml(floor)}</span>`;
  }).join("");
  return `
    <div class="indoor-plan indoor-plan-preview" aria-label="indoor route plan" data-indoor-expand>
      ${floorLabels}
      ${lines}
      ${nodes}
    </div>
  `;
}

function renderIndoorSource(building, includeBuildingName = false) {
  const sourceText = `${includeBuildingName ? `${building.name} · ` : ""}${building.source || ""}`;
  const sourceLink = building.sourceUrl
    ? `<a href="${escapeHtml(building.sourceUrl)}" target="_blank" rel="noreferrer">公开导览来源</a>`
    : "";
  return `<p class="indoor-source">${escapeHtml(sourceText)}${sourceLink ? ` · ${sourceLink}` : ""}</p>`;
}

function openIndoorMapModal() {
  const building = lastIndoorBuilding || currentIndoorBuilding();
  const result = lastIndoorRoute || { path: [], distance: 0 };
  const modalTitle = byId("indoorMapModalTitle");
  const modalBody = byId("indoorMapModalBody");
  if (!modalTitle || !modalBody) return;
  modalTitle.textContent = `${building.name} 室内路径图`;
  const pathList = result.path?.length
    ? renderIndoorStepList(result, building, "indoor-step-list indoor-modal-steps")
    : `<p class="indoor-modal-empty">请选择起点和终点生成路径，或先查看该建筑的室内节点分布。</p>`;
  modalBody.innerHTML = `
    ${renderIndoorSource(building, true)}
    <p class="indoor-visualization-note">Current acceptance choice: indoor navigation is visualized in this panel and modal floor plan, not as a Leaflet map overlay.</p>
    <div class="indoor-modal-layout">
      ${renderIndoorPlan(result, building)}
      <div class="indoor-modal-side">
        <strong>${result.path?.length ? `路径距离 ${result.distance}m` : "可交互室内图"}</strong>
        ${result.path?.length ? renderIndoorRouteMeta(result) : ""}
        ${pathList}
      </div>
    </div>
  `;
  openModal("indoorMapModal");
}

function pathHasIndoorEdge(path, from, to) {
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    if ((a === from && b === to) || (a === to && b === from)) return true;
  }
  return false;
}

function shortestIndoorPath(start, goal, building = currentIndoorBuilding()) {
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const queue = [{ node: start, distance: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();
    if (current.distance !== dist.get(current.node)) continue;
    if (current.node === goal) break;
    indoorNeighbors(current.node, building).forEach(([next, weight]) => {
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

function indoorNeighbors(id, building = currentIndoorBuilding()) {
  const neighbors = [];
  building.edges.forEach(([from, to, weight]) => {
    if (from === id) neighbors.push([to, weight]);
    if (to === id) neighbors.push([from, weight]);
  });
  return neighbors;
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

  drawRoute(tsp.fullPath, routeStrategyInfo(tsp.strategy).color);
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

  if (!dist.has(goal)) {
    return null;
  }
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

function routeConsistencyCheck() {
  const samples = state.roads ? state.roads.slice(0, 8) : [];
  const mismatches = samples.reduce((items, road) => {
    const route = shortestPath(Number(road.from), Number(road.to), "walk", "distance");
    if (!route) {
      items.push({ from: road.from, to: road.to, reason: "unreachable" });
      return items;
    }
    const expected = Number(road.dist_walk || 0);
    const delta = Math.abs(route.distance - expected);
    if (expected > 0 && delta / expected > 0.35) {
      items.push({ from: road.from, to: road.to, expected, actual: route.distance });
    }
    return items;
  }, []);
  return { checked: samples.length, mismatches };
}

function neighborsOf(id, mode, strategy = state.routeStrategy) {
  return state.edges.filter((edge) => Number(edge.from) === Number(id) && edgeSupportsMode(edge, mode, strategy));
}

function edgeSupportsMode(edge, mode, strategy = state.routeStrategy) {
  return edge.mode === "both" || edge.mode === mode;
}

function edgeWeight(edge, mode, strategy = state.routeStrategy) {
  const distance = Number(edge.distance) || 0;
  const travelMode = mode;
  const speedFactor = 0.55 + stableFraction(`${edge.road_name || ""}:${edge.from}:${edge.to}:speed`) * 1.1;
  const idealSpeed = (travelMode === "bike" ? 12 : 4.5) * speedFactor;
  const congestion = edgeCongestion(edge);
  const realSpeed = Math.max(1, idealSpeed * congestion);
  const minutes = distance / (realSpeed * 1000 / 60);
  const scenicPenalty = 0.72 + stableFraction(`${edge.road_name || ""}:${edge.from}:${edge.to}:recommend`) * 0.72;
  let cost = distance;
  if (strategy === "time") cost = minutes;
  if (strategy === "recommend") cost = minutes * 0.7 + (distance / 100) * scenicPenalty;
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
