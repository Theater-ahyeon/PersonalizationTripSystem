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
      if (node.visible === false) return;
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} · ${node.floor}`;
      select.appendChild(option);
    });
  });
  const visibleNodes = building.nodes.filter((n) => n.visible !== false);
  start.value = visibleNodes[0]?.id || "";
  goal.value = visibleNodes[visibleNodes.length - 1]?.id || "";
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
    <strong>室内最短路径 ${result.distance}m</strong>
    ${renderIndoorRouteMeta(result, minutes)}
    ${renderIndoorSource(building, true)}
    ${renderIndoorRouteBreakdown(result, building)}
    ${renderIndoorPlan(result, building)}
    <button class="link-button indoor-expand-button" type="button" data-indoor-expand>展开平面图</button>
    ${renderIndoorStepList(result, building, "indoor-step-list")}
  `;
  requestAnimationFrame(syncIndoorPlanOverlays);
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
    ${renderIndoorPlan({ path: [], distance: 0 }, building)}
    <button class="link-button indoor-expand-button" type="button" data-indoor-expand>展开平面图</button>
  `;
  requestAnimationFrame(syncIndoorPlanOverlays);
}

function indoorEstimatedMinutes(distance) {
  return Math.max(1, Math.ceil(Number(distance || 0) / 45));
}

function renderIndoorRouteMeta(result, minutes = indoorEstimatedMinutes(result.distance)) {
  const stops = Array.isArray(result.path) ? result.path.length : 0;
  return `
    <div class="indoor-route-meta">
      <span>${Number(result.distance || 0).toFixed(0)}m</span>
      <span>${minutes} 分钟</span>
      <span>${stops} 个节点</span>
    </div>
  `;
}

function renderIndoorStepList(result, building, className = "indoor-step-list") {
  if (!result.path?.length) return "";
  return `
    <ol class="${className}">
      ${result.path.map((id, index) => {
        const node = building.nodes.find((item) => item.id === id);
        return node ? `<li><span>${index + 1}</span><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.floor)} · ${escapeHtml(indoorNodeTypeLabel(node))}</small></li>` : "";
      }).join("")}
    </ol>
  `;
}

function renderIndoorRouteBreakdown(result, building) {
  if (!result.path?.length) return "";
  const nodeMap = new Map(building.nodes.map((node) => [node.id, node]));
  const pathNodes = result.path.map((id) => nodeMap.get(id)).filter(Boolean);
  if (pathNodes.length < 2) return "";
  const firstVerticalIndex = pathNodes.findIndex((node, index) => index > 0 && node.floor !== pathNodes[index - 1].floor);
  const lastVerticalIndex = pathNodes.reduce((last, node, index) => {
    if (index > 0 && node.floor !== pathNodes[index - 1].floor) return index;
    return last;
  }, -1);
  const elevatorIndex = pathNodes.findIndex((node) => indoorNodeType(node) === "elevator");
  const entranceEnd = firstVerticalIndex > -1
    ? Math.max(0, firstVerticalIndex - 1)
    : elevatorIndex > -1 ? elevatorIndex : Math.max(0, Math.floor((pathNodes.length - 1) / 2));
  const roomStart = lastVerticalIndex > -1 ? lastVerticalIndex : Math.min(entranceEnd + 1, pathNodes.length - 1);
  const entranceNodes = pathNodes.slice(0, entranceEnd + 1);
  const transferNodes = firstVerticalIndex > -1
    ? pathNodes.slice(Math.max(0, firstVerticalIndex - 1), lastVerticalIndex + 1)
    : [];
  const roomNodes = pathNodes.slice(roomStart);
  const cards = [
    indoorBreakdownCard("大门到电梯", entranceNodes, "从入口、门厅或服务台进入建筑，前往最近的楼梯/电梯核心。"),
    indoorBreakdownCard("楼层间电梯导航", transferNodes, "通过电梯/楼梯完成楼层切换，系统只连接同一竖向交通核心。"),
    indoorBreakdownCard("楼层内到房间", roomNodes, "到达目标楼层后，沿走廊前往教室、展厅、阅览室或办公室。")
  ];
  return `<div class="indoor-breakdown" aria-label="室内导航三段路径">${cards.join("")}</div>`;
}

function indoorBreakdownCard(title, nodes, fallback) {
  const names = nodes.map((node) => node.name).filter(Boolean);
  const floors = unique(nodes.map((node) => node.floor)).join(" → ");
  const body = names.length ? names.join(" → ") : fallback;
  return `
    <section>
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(floors || "同层")}</strong>
      <p>${escapeHtml(body)}</p>
    </section>
  `;
}

function indoorNodeType(node) {
  if (!node) return "normal";
  if (node.role) return node.role;
  const name = `${node.name || ""}`;
  if (/入口|大门|东门|西门|南门|北门|午门|神武门/.test(name)) return "entrance";
  if (/电梯|楼梯|交通核/.test(name)) return "elevator";
  if (/教室|实验室|报告厅|办公室|房间|阅览|展厅|门诊|手术室|研修室|资料区|文献区|书库/.test(name)) return "room";
  if (/走廊|连廊|通道/.test(name)) return "corridor";
  if (/服务|咨询|值班|导览|挂号|收费|药房|证卡/.test(name)) return "service";
  return "normal";
}

function indoorNodeTypeLabel(node) {
  const type = indoorNodeType(node);
  if (type === "entrance") return "入口";
  if (type === "elevator") return "电梯/楼梯";
  if (type === "room") return "房间/功能区";
  if (type === "corridor") return "走廊";
  if (type === "service") return "服务点";
  if (type === "hall") return "大厅";
  return "节点";
}

function renderIndoorPlan(result, building = currentIndoorBuilding(), options = {}) {
  const hasFloorPlans = building.floorPlans && (
    (Array.isArray(building.floorPlans) && building.floorPlans.length > 0) ||
    (!Array.isArray(building.floorPlans) && Object.keys(building.floorPlans).length > 0)
  );
  if (hasFloorPlans) {
    return renderIndoorFloorStack(result, building, options);
  }

  const expandable = options.expandable !== false;
  const pathSet = new Set(result.path);
  const routeOnly = !!(building.displayRules?.showOnlySelectedRoute || building.recommendedDisplay?.defaultMode?.showEdges === false);
  const hasRoute = result.path?.length > 1;
  const nodes = building.nodes.map((node) => {
    const left = Number(node.x || 50);
    const top = Number(node.y || 50);
    const active = pathSet.has(node.id) ? " active" : "";
    const minor = node.minor && !active ? " minor" : "";
    const hiddenClass = node.visible === false && !active ? " hidden-node" : "";
    return `<span class="indoor-node${active}${minor}${hiddenClass}" title="${escapeHtml(node.name)}" style="left:${left}%;top:${top}%">${escapeHtml(node.name)}</span>`;
  }).join("");
  const lines = building.edges.map(([from, to]) => {
    const a = building.nodes.find((node) => node.id === from);
    const b = building.nodes.find((node) => node.id === to);
    if (!a || !b) return "";
    const active = pathHasIndoorEdge(result.path, from, to) ? " active" : "";
    const edgeHidden = routeOnly && !active ? " hidden-edge" : "";
    const x1 = Number(a.x || 0);
    const y1 = Number(a.y || 0);
    const x2 = Number(b.x || 0);
    const y2 = Number(b.y || 0);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<span class="indoor-edge${active}${edgeHidden}" style="left:${x1}%;top:${y1}%;width:${length}%;transform:rotate(${angle}deg)"></span>`;
  }).join("");
  const floors = (building.floors && building.floors.length ? building.floors : unique(building.nodes.map((node) => node.floor))).slice(0, 5);
  const floorLabels = floors.map((floor, index) => {
    const top = floors.length === 1 ? 50 : 10 + (index * (80 / (floors.length - 1)));
    return `<span class="indoor-floor" style="top:${top}%">${escapeHtml(floor)}</span>`;
  }).join("");
  const planImage = building.floorPlanImage
    ? `<img class="indoor-plan-image" src="${escapeHtml(building.floorPlanImage)}" alt="${escapeHtml(building.name)}平面图" loading="lazy">`
    : "";
  const planClass = building.floorPlanImage ? " has-floor-plan" : "";
  const fitStyle = building.floorPlanFit ? ` style="--indoor-plan-fit:${escapeHtml(building.floorPlanFit)}"` : "";
  const credit = building.floorPlanCredit
    ? `<span class="indoor-plan-credit">${escapeHtml(building.floorPlanCredit)}</span>`
    : "";
  return `
    <div class="indoor-plan${planClass}${expandable ? " indoor-plan-preview" : ""}" aria-label="indoor route plan"${expandable ? " data-indoor-expand" : ""}${fitStyle}>
      ${planImage}
      <div class="indoor-plan-overlay" data-indoor-plan-overlay>
        ${floorLabels}
        ${lines}
        ${nodes}
      </div>
      ${credit}
    </div>
  `;
}

function renderIndoorFloorStack(result, building = currentIndoorBuilding(), options = {}) {
  const expandable = options.expandable !== false;
  const floors = floorsForIndoorResult(result, building, options);
  const sections = floors.map((floor) => renderIndoorFloorSection(result, building, floor, options)).join("");
  const transfers = renderIndoorTransferList(result, building);
  return `
    <div class="indoor-floor-stack${expandable ? " indoor-plan-preview" : ""}" aria-label="multi-floor indoor route plan"${expandable ? " data-indoor-expand" : ""}>
      ${sections}
      ${transfers}
    </div>
  `;
}

function renderIndoorFloorSection(result, building, floor, options = {}) {
  const pathSet = new Set(result.path);
  const routeOnly = !!(building.displayRules?.showOnlySelectedRoute || building.recommendedDisplay?.defaultMode?.showEdges === false);
  const hasRoute = result.path?.length > 1;
  const floorNodes = building.nodes.filter((node) => node.floor === floor);
  const nodeMap = new Map(building.nodes.map((node) => [node.id, node]));
  const nodes = floorNodes.map((node) => {
    const left = Number(node.x || 50);
    const top = Number(node.y || 50);
    const active = pathSet.has(node.id) ? " active" : "";
    const minor = node.minor && !active ? " minor" : "";
    const hiddenClass = node.visible === false && !active ? " hidden-node" : "";
    return `<span class="indoor-node${active}${minor}${hiddenClass}" title="${escapeHtml(node.name)}" style="left:${left}%;top:${top}%">${escapeHtml(node.name)}</span>`;
  }).join("");
  const lines = building.edges.map(([from, to]) => {
    const a = nodeMap.get(from);
    const b = nodeMap.get(to);
    if (!a || !b || a.floor !== floor || b.floor !== floor) return "";
    const active = pathHasIndoorEdge(result.path, from, to) ? " active" : "";
    const edgeHidden = routeOnly && !active ? " hidden-edge" : "";
    const x1 = Number(a.x || 0);
    const y1 = Number(a.y || 0);
    const x2 = Number(b.x || 0);
    const y2 = Number(b.y || 0);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return `<span class="indoor-edge${active}${edgeHidden}" style="left:${x1}%;top:${y1}%;width:${length}%;transform:rotate(${angle}deg)"></span>`;
  }).join("");
  const floorPlan = floorPlanFor(building, floor);
  const planImage = floorPlan.image
    ? `<img class="indoor-plan-image" src="${escapeHtml(floorPlan.image)}" alt="${escapeHtml(building.name)} ${escapeHtml(floor)} 平面图" loading="lazy">`
    : "";
  const planClass = floorPlan.image ? " has-floor-plan" : "";
  const fitStyle = floorPlan.fit || building.floorPlanFit ? ` style="--indoor-plan-fit:${escapeHtml(floorPlan.fit || building.floorPlanFit)}"` : "";
  const credit = floorPlan.credit
    ? `<span class="indoor-plan-credit">${escapeHtml(floorPlan.credit)}</span>`
    : "";
  const sourceLink = floorPlan.sourceUrl
    ? `<a href="${escapeHtml(floorPlan.sourceUrl)}" target="_blank" rel="noreferrer">官方楼层图</a>`
    : "";
  const activeCount = floorNodes.filter((node) => pathSet.has(node.id)).length;
  return `
    <section class="indoor-floor-section">
      <header class="indoor-floor-heading">
        <strong>${escapeHtml(floor)}</strong>
        <span>${activeCount ? `本层路径节点 ${activeCount} 个` : `本层可导航节点 ${floorNodes.length} 个`}</span>
        ${sourceLink}
      </header>
      <div class="indoor-plan${planClass}" aria-label="${escapeHtml(building.name)} ${escapeHtml(floor)} indoor route plan"${fitStyle}>
        ${planImage}
        <div class="indoor-plan-overlay" data-indoor-plan-overlay>
          <span class="indoor-floor" style="top:12%">${escapeHtml(floor)}</span>
          ${lines}
          ${nodes}
        </div>
        ${credit}
      </div>
    </section>
  `;
}

function floorsForIndoorResult(result, building, options = {}) {
  const allFloors = (building.floors && building.floors.length ? building.floors : unique(building.nodes.map((node) => node.floor))).filter(Boolean);
  if (options.showAllFloors || !result.path?.length) return allFloors;
  const nodeMap = new Map(building.nodes.map((node) => [node.id, node]));
  const pathFloors = unique(result.path.map((id) => nodeMap.get(id)?.floor));
  return allFloors.filter((floor) => pathFloors.includes(floor));
}

function floorPlanFor(building, floor) {
  let plan = building.floorPlans?.[floor];
  // Support array format from JSON (C++ parser output)
  if (!plan && Array.isArray(building.floorPlans)) {
    plan = building.floorPlans.find((p) => p.floor === floor);
  }
  plan = plan || {};
  return {
    image: plan.image || building.floorPlanImage || "",
    sourceUrl: plan.sourceUrl || building.sourceUrl || "",
    credit: plan.credit || building.floorPlanCredit || "",
    fit: plan.fit || building.floorPlanFit || "contain"
  };
}

function renderIndoorTransferList(result, building) {
  if (!result.path?.length) return "";
  const nodeMap = new Map(building.nodes.map((node) => [node.id, node]));
  const transfers = [];
  for (let index = 1; index < result.path.length; index += 1) {
    const from = nodeMap.get(result.path[index - 1]);
    const to = nodeMap.get(result.path[index]);
    if (from && to && from.floor !== to.floor) {
      transfers.push(`<li><strong>${escapeHtml(from.name)} → ${escapeHtml(to.name)}</strong><span>${escapeHtml(from.floor)} 到 ${escapeHtml(to.floor)}</span></li>`);
    }
  }
  if (!transfers.length) return "";
  return `
    <div class="indoor-transfer-list" aria-label="跨层换乘">
      <span>跨层换乘</span>
      <ol>${transfers.join("")}</ol>
    </div>
  `;
}

function syncIndoorPlanOverlays() {
  document.querySelectorAll(".indoor-plan.has-floor-plan").forEach((plan) => {
    const image = plan.querySelector(".indoor-plan-image");
    const overlay = plan.querySelector("[data-indoor-plan-overlay]");
    if (!image || !overlay) return;
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
      image.addEventListener("load", syncIndoorPlanOverlays, { once: true });
      return;
    }
    const planWidth = plan.clientWidth;
    const planHeight = plan.clientHeight;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const planRatio = planWidth / planHeight;
    let width = planWidth;
    let height = planHeight;
    let left = 0;
    let top = 0;
    if (planRatio > imageRatio) {
      height = planHeight;
      width = height * imageRatio;
      left = (planWidth - width) / 2;
    } else {
      width = planWidth;
      height = width / imageRatio;
      top = (planHeight - height) / 2;
    }
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  });
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
    <div class="indoor-modal-layout">
      <div class="indoor-modal-map">
        <div class="indoor-map-controls" aria-label="室内平面图控制">
          <button id="indoorZoomOut" class="secondary-button icon-button" type="button" data-indoor-zoom="out" aria-label="缩小平面图">-</button>
          <button id="indoorZoomIn" class="secondary-button icon-button" type="button" data-indoor-zoom="in" aria-label="放大平面图">+</button>
          <button id="indoorZoomReset" class="secondary-button" type="button" data-indoor-zoom="reset">重置</button>
        </div>
        <div id="indoorPlanViewport" class="indoor-plan-viewport" data-indoor-plan-viewport>
          <div class="indoor-plan-pannable" data-indoor-plan-pannable>
            ${renderIndoorPlan(result, building, { expandable: false })}
          </div>
        </div>
      </div>
      <div class="indoor-modal-side">
        <strong>${result.path?.length ? `路径距离 ${result.distance}m` : "可交互室内图"}</strong>
        ${result.path?.length ? renderIndoorRouteMeta(result) : ""}
        ${result.path?.length ? renderIndoorRouteBreakdown(result, building) : ""}
        ${pathList}
      </div>
    </div>
  `;
  openModal("indoorMapModal");
  setupIndoorPlanInteractions();
  resetIndoorPlanView();
  requestAnimationFrame(syncIndoorPlanOverlays);
}

function setupIndoorPlanInteractions() {
  const viewport = byId("indoorPlanViewport");
  if (!viewport) return;

  document.querySelectorAll("[data-indoor-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.indoorZoom;
      if (action === "reset") {
        resetIndoorPlanView();
      } else {
        zoomIndoorPlan(action === "in" ? 0.2 : -0.2);
      }
    });
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a")) return;
    indoorPlanView.dragging = true;
    indoorPlanView.startX = event.clientX;
    indoorPlanView.startY = event.clientY;
    indoorPlanView.originX = indoorPlanView.x;
    indoorPlanView.originY = indoorPlanView.y;
    viewport.classList.add("is-dragging");
    viewport.setPointerCapture?.(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!indoorPlanView.dragging) return;
    indoorPlanView.x = indoorPlanView.originX + event.clientX - indoorPlanView.startX;
    indoorPlanView.y = indoorPlanView.originY + event.clientY - indoorPlanView.startY;
    applyIndoorPlanView();
  });

  const endDrag = (event) => {
    indoorPlanView.dragging = false;
    viewport.classList.remove("is-dragging");
    viewport.releasePointerCapture?.(event.pointerId);
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
}

function zoomIndoorPlan(delta) {
  indoorPlanView.scale = clamp(indoorPlanView.scale + delta, 1, 2.4);
  applyIndoorPlanView();
}

function resetIndoorPlanView() {
  indoorPlanView.scale = 1;
  indoorPlanView.x = 0;
  indoorPlanView.y = 0;
  indoorPlanView.dragging = false;
  applyIndoorPlanView();
}

function applyIndoorPlanView() {
  const pannable = document.querySelector("[data-indoor-plan-pannable]");
  if (!pannable) return;
  pannable.style.transform = `translate(${indoorPlanView.x}px, ${indoorPlanView.y}px) scale(${indoorPlanView.scale})`;
  requestAnimationFrame(syncIndoorPlanOverlays);
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
    const distance = Number(weight) || indoorEdgeDistance(from, to, building);
    if (from === id) neighbors.push([to, distance]);
    if (to === id) neighbors.push([from, distance]);
  });
  return neighbors;
}

function indoorEdgeDistance(from, to, building = currentIndoorBuilding()) {
  const a = building.nodes.find((node) => node.id === from);
  const b = building.nodes.find((node) => node.id === to);
  if (!a || !b) return 20;
  return Math.max(8, Math.round(Math.hypot(Number(a.x || 0) - Number(b.x || 0), Number(a.y || 0) - Number(b.y || 0)) * 2.4));
}

function runShortestPath() {
  const start = Number(byId("startSelect").value);
  const goal = Number(byId("goalSelect").value);
  const strategy = state.routeStrategy === "transport" ? "transport" : state.routeStrategy;
  const mode = strategy === "transport" ? "mixed" : state.mode;
  const result = shortestPath(start, goal, mode, strategy);
  if (!result) {
    state.lastRouteResult = null;
    renderCongestionPanel(null);
    summarize("当前交通方式下未找到可达路径。");
    return;
  }
  state.lastRouteResult = result;
  drawRoute(result.path, routeStrategyInfo(strategy).color, result);
  summarizeRoute(routeStrategyInfo(strategy).label, result);
}

function updateRouteQuickSummary(details = null) {
  const target = byId("routeQuickSummary");
  if (!target) return;
  if (!details) {
    target.innerHTML = `
      <span>路线待生成</span>
      <strong>选择起终点后查看距离和耗时</strong>
    `;
    return;
  }
  const modeLabel = details.mode || routeModeLabel(state.mode, state.routeStrategy);
  target.innerHTML = `
    <span>${escapeHtml(details.title || "路线耗时")}</span>
    <strong>${escapeHtml(modeLabel)} · ${Number(details.distance || 0).toFixed(1)} 米 · 约 ${Number(details.minutes || 0).toFixed(1)} 分钟</strong>
    <small>${escapeHtml(details.strategy || routeStrategyInfo().label)}</small>
  `;
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

  const strategy = state.routeStrategy === "transport" ? "transport" : state.routeStrategy;
  const mode = strategy === "transport" ? "mixed" : state.mode;
  const tsp = solveTspDp(start, targets, mode, strategy);
  if (!tsp) {
    state.lastRouteResult = null;
    renderCongestionPanel(null);
    summarize("多点游览中存在不可达节点。");
    return;
  }

  state.lastRouteResult = tsp;
  drawRoute(tsp.fullPath, routeStrategyInfo(tsp.strategy).color, tsp);
  summarizeMultiRoute(tsp.order, tsp);
}

function solveTspDp(start, targets, mode, strategy = state.routeStrategy) {
  const points = [start, ...targets];
  const n = targets.length;
  const pairRoutes = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null));
  for (let i = 0; i < points.length; i += 1) {
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) {
        pairRoutes[i][j] = { path: [points[i]], distance: 0, cost: 0, minutes: 0, averageCongestion: 1, segments: [] };
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
    const returnCost = pairRoutes[i + 1][0]?.cost ?? inf;
    const cycleCost = dp[fullMask][i] + returnCost;
    if (cycleCost < best) {
      best = cycleCost;
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
  const returnRoute = pairRoutes[fromIndex][0];
  if (returnRoute && returnRoute.path.length > 1) {
    order.push({ from: points[fromIndex], to: start, result: returnRoute, returnToStart: true });
    fullPath.push(...returnRoute.path.slice(1));
    totalDistance += returnRoute.distance;
    totalMinutes += returnRoute.minutes;
    congestionTotal += returnRoute.averageCongestion;
  }
  return {
    order,
    total: totalDistance,
    totalCost: best,
    totalDistance,
    totalMinutes,
    averageCongestion: order.length ? congestionTotal / order.length : 1,
    fullPath,
    strategy,
    mode
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
    mode,
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

function isCampusRegion() {
  return state.currentRegionPackId === "tsinghua_campus";
}

function edgeSupportsMode(edge, mode, strategy = state.routeStrategy) {
  const allowed = availableTravelModes(edge);
  if (strategy === "transport" || mode === "mixed") return allowed.length > 0;
  if (mode === "bike") return allowed.includes("bike");
  if (mode === "cart") return allowed.includes("cart");
  return allowed.includes("walk");
}

function edgeWeight(edge, mode, strategy = state.routeStrategy) {
  const distance = Number(edge.distance) || 0;
  const candidates = (strategy === "transport" || mode === "mixed") ? availableTravelModes(edge) : [mode];
  const weights = candidates.map((travelMode) => travelModeWeight(edge, travelMode, distance));
  const selected = weights.sort((a, b) => a.minutes - b.minutes)[0] || travelModeWeight(edge, "walk", distance);
  const { travelMode, idealSpeed, congestion, realSpeed, minutes } = selected;
  const scenicPenalty = 0.72 + stableFraction(`${edge.road_name || ""}:${edge.from}:${edge.to}:recommend`) * 0.72;
  let cost = distance;
  if (strategy === "time" || strategy === "transport") cost = minutes;
  if (strategy === "recommend") cost = minutes * 0.7 + (distance / 100) * scenicPenalty;
  return {
    cost,
    distance,
    minutes,
    congestion,
    travelMode,
    idealSpeed,
    realSpeed,
    edgeKey: congestionEdgeKey(edge, travelMode),
    from: Number(edge.from),
    to: Number(edge.to),
    roadName: edge.road_name || ""
  };
}

function availableTravelModes(edge) {
  return resolveEdgeModes(edge);
}

function resolveEdgeModes(edge) {
  const explicit = String(edge.mode || "both").toLowerCase();
  const name = `${edge.road_name || ""}`;
  const campus = isCampusRegion();

  if (explicit === "walk") return ["walk"];
  if (explicit === "bike") return campus ? ["bike"] : ["walk"];
  if (explicit === "cart") return ["cart"];

  if (/骑行|自行车|环校|cycleway|bike/i.test(name)) {
    return campus ? ["walk", "bike"] : ["walk"];
  }
  if (/电瓶|观光|环园|景区车|摆渡/i.test(name)) {
    return campus ? ["walk"] : ["cart"];
  }

  if (explicit === "both") {
    if (campus) return ["walk", "bike"];
    return electricCartEligible(edge) ? ["walk", "cart"] : ["walk"];
  }

  return campus ? ["walk", "bike"] : ["walk"];
}

function electricCartEligible(edge) {
  if (isCampusRegion()) return false;
  const name = `${edge.road_name || ""}`;
  const from = findNode(edge.from);
  const to = findNode(edge.to);
  const text = `${name} ${from?.name || ""} ${to?.name || ""}`;
  return /东宫门|仁寿殿|排云门|长廊|苏州街|北宫门|昆明湖|广场|主路|宫门|观光|电瓶|环园/.test(text)
    || stableFraction(`${edge.from}:${edge.to}:cart`) > 0.82;
}

function idealSpeedForEdge(edge, travelMode) {
  const modeKey = `ideal_speed_${travelMode}`;
  const configured = Number(edge[modeKey]);
  if (configured > 0) return configured;
  if (travelMode === "walk" && Number(edge.ideal_speed) > 0) return Number(edge.ideal_speed);
  const speedFactor = 0.55 + stableFraction(`${edge.road_name || ""}:${edge.from}:${edge.to}:${travelMode}:speed`) * 1.1;
  const baseSpeed = travelMode === "bike" ? 12 : travelMode === "cart" ? 18 : 4.5;
  return baseSpeed * speedFactor;
}

function travelModeWeight(edge, travelMode, distance = Number(edge.distance) || 0) {
  const idealSpeed = idealSpeedForEdge(edge, travelMode);
  const congestion = edgeCongestion(edge, travelMode);
  const realSpeed = Math.max(0.5, idealSpeed * congestion);
  const boardingDelay = travelMode === "cart" ? 1.2 : 0;
  const minutes = distance / (realSpeed * 1000 / 60) + boardingDelay;
  return { travelMode, idealSpeed, congestion, realSpeed, minutes };
}

function routeModeLabel(mode = state.mode, strategy = state.routeStrategy) {
  if (strategy === "transport" || mode === "mixed") return "混合交通";
  if (mode === "bike") return "骑行";
  if (mode === "cart") return "电瓶车";
  return "步行";
}

function travelModeLabel(mode) {
  if (mode === "bike") return "骑行";
  if (mode === "cart") return "电瓶车";
  return "步行";
}

const ROAD_NAME_LABELS = {
  tertiary: "三级道路",
  tertiary_link: "连接匝道",
  secondary: "二级道路",
  secondary_link: "二级连接匝道",
  primary: "一级道路",
  primary_link: "一级连接匝道",
  footway: "步行路",
  path: "小径",
  pedestrian: "步行街",
  cycleway: "骑行道",
  service: "服务道路",
  residential: "生活区道路",
  living_street: "生活街区道路",
  unclassified: "道路",
  track: "便道",
  steps: "台阶",
  road: "道路"
};

function formatRoadLabel(name = "") {
  const raw = String(name || "").trim();
  if (!raw) return "未命名道路";
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;

  const direct = ROAD_NAME_LABELS[raw.toLowerCase()];
  if (direct) return direct;

  const nodeMatch = raw.match(/^([a-z_]+)(节点\d+)$/i);
  if (nodeMatch) {
    const label = ROAD_NAME_LABELS[nodeMatch[1].toLowerCase()] || nodeMatch[1];
    return `${label}${nodeMatch[2]}`;
  }

  const osmMatch = raw.match(/^OSM way (\d+)$/i);
  if (osmMatch) return `OSM 道路 ${osmMatch[1]}`;

  return raw.replace(/_/g, " ");
}

function formatNodeLabel(nodeOrId) {
  const node = typeof nodeOrId === "object" ? nodeOrId : findNode(nodeOrId);
  if (!node) return String(nodeOrId ?? "-");
  const name = String(node.name || "").trim();
  if (!name) return `节点 ${node.id}`;
  return formatRoadLabel(name);
}

const TRAVEL_MODE_COLORS = {
  walk: "#0b8a5b",
  bike: "#e67a00",
  cart: "#7a45c8"
};

function travelModeColor(mode = "walk") {
  return TRAVEL_MODE_COLORS[mode] || TRAVEL_MODE_COLORS.walk;
}

function groupRouteSegmentsByMode(segments) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const groups = [];
  let current = null;
  segments.forEach((segment) => {
    const mode = segment.travelMode || "walk";
    if (!current || current.travelMode !== mode) {
      if (current) groups.push(current);
      current = {
        travelMode: mode,
        from: segment.from,
        to: segment.to,
        distance: Number(segment.distance) || 0,
        minutes: Number(segment.minutes) || 0,
        roads: segment.roadName ? [segment.roadName] : []
      };
      return;
    }
    current.to = segment.to;
    current.distance += Number(segment.distance) || 0;
    current.minutes += Number(segment.minutes) || 0;
    if (segment.roadName && current.roads[current.roads.length - 1] !== segment.roadName) {
      current.roads.push(segment.roadName);
    }
  });
  if (current) groups.push(current);
  return groups;
}

function renderModeSegmentBreakdown(result) {
  const groups = groupRouteSegmentsByMode(routeSegmentsForCongestion(result));
  if (!groups.length) return "";
  const modes = unique(groups.map((group) => group.travelMode));
  const legend = modes.map((mode) => `
    <span class="mode-chip" data-mode="${mode}">
      <i style="background:${travelModeColor(mode)}"></i>${escapeHtml(travelModeLabel(mode))}
    </span>
  `).join("");
  const items = groups.map((group, index) => {
    const from = formatNodeLabel(group.from);
    const to = formatNodeLabel(group.to);
    const roadHint = group.roads.map((road) => formatRoadLabel(road)).slice(0, 2).join("、");
    return `
      <li class="mode-segment-item" data-mode="${group.travelMode}">
        <span class="mode-segment-badge" style="background:${travelModeColor(group.travelMode)}">${escapeHtml(travelModeLabel(group.travelMode))}</span>
        <div class="mode-segment-copy">
          <strong>${index + 1}. ${escapeHtml(from)} → ${escapeHtml(to)}</strong>
          <small>${group.distance.toFixed(0)} 米 · 约 ${group.minutes.toFixed(1)} 分钟${roadHint ? ` · ${escapeHtml(roadHint)}` : ""}</small>
        </div>
      </li>
    `;
  }).join("");
  return `
    <div class="mode-segment-breakdown">
      <p class="eyebrow">分段交通方式</p>
      <div class="mode-segment-legend" aria-label="交通方式图例">${legend}</div>
      <ol class="mode-segment-list">${items}</ol>
    </div>
  `;
}

function updateModeSegmentPanel(result) {
  const panel = byId("modeSegmentPanel");
  if (!panel) return;
  const html = renderModeSegmentBreakdown(result);
  if (!html) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  panel.hidden = false;
  panel.innerHTML = html;
}

function renderMapModeLegend(segments) {
  const legend = byId("mapModeLegend");
  if (!legend) return;
  const modes = unique(segments.map((segment) => segment.travelMode || "walk"));
  const mixedRoute = state.mode === "mixed" || state.routeStrategy === "transport";
  if (!segments.length || (!mixedRoute && modes.length <= 1)) {
    legend.hidden = true;
    legend.innerHTML = "";
    return;
  }
  legend.hidden = false;
  legend.innerHTML = `
    <p class="eyebrow">路线颜色</p>
    <div class="mode-segment-legend">${modes.map((mode) => `
      <span class="mode-chip" data-mode="${mode}">
        <i style="background:${travelModeColor(mode)}"></i>${escapeHtml(travelModeLabel(mode))}
      </span>
    `).join("")}</div>
  `;
}

function segmentModeSummary(result) {
  const segments = result?.segments || [];
  if (!segments.length) return routeModeLabel(result?.mode || state.mode, result?.strategy || state.routeStrategy);
  const labels = unique(segments.map((segment) => travelModeLabel(segment.travelMode)));
  const congestion = Number(result.averageCongestion || 1).toFixed(2);
  return `${labels.join("+")} · 拥挤度${congestion}`;
}

function edgeCongestion(edge, travelMode = "walk") {
  const key = congestionEdgeKey(edge, travelMode);
  if (state.userCongestionOverride?.has(key)) {
    return Number(state.userCongestionOverride.get(key));
  }
  const modeCongestion = Number(edge[`congestion_${travelMode}`]);
  if (modeCongestion > 0) return clamp(modeCongestion, 0.01, 1);
  if (Number(edge.congestion) > 0) return clamp(Number(edge.congestion), 0.01, 1);
  const name = `${state.congestionSeed || "default"}:${edge.road_name || ""}${edge.from}-${edge.to}:${travelMode}`;
  const hash = stableFraction(name);
  const base = travelMode === "cart" ? 0.7 : travelMode === "bike" ? 0.66 : 0.62;
  return clamp(base + hash * (0.98 - base), 0.55, 0.98);
}

function congestionEdgeKey(edge, travelMode = "walk") {
  return `${Number(edge.from)}>${Number(edge.to)}:${travelMode}`;
}

function syncCongestionPanelOpen() {
  const panel = byId("congestion-panel");
  const list = byId("congestionList");
  const toggle = byId("toggle-congestion-panel");
  if (!panel || !list) return;
  const open = Boolean(state.congestionPanelOpen);
  panel.classList.toggle("is-collapsed", !open);
  list.hidden = !open;
  if (toggle) {
    toggle.textContent = open ? "收起" : "展开";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function toggleCongestionPanel() {
  state.congestionPanelOpen = !state.congestionPanelOpen;
  syncCongestionPanelOpen();
}

function renderCongestionPanel(result = state.lastRouteResult) {
  const panel = byId("congestion-panel");
  const list = byId("congestionList");
  const summary = byId("congestion-panel-summary");
  if (!panel || !list) return;
  const segments = routeSegmentsForCongestion(result);
  if (!segments.length) {
    panel.hidden = true;
    list.innerHTML = "";
    if (summary) summary.textContent = "";
    return;
  }
  const wasHidden = panel.hidden;
  panel.hidden = false;
  if (wasHidden) state.congestionPanelOpen = false;
  const seen = new Set();
  const rows = [];
  segments.forEach((segment) => {
    const key = segment.edgeKey || `${segment.from}>${segment.to}:${segment.travelMode || "walk"}`;
    if (seen.has(key)) return;
    seen.add(key);
    const from = formatNodeLabel(segment.from);
    const to = formatNodeLabel(segment.to);
    const congestion = clamp(Number(segment.congestion || 1), 0.55, 0.98);
    const pct = Math.round(congestion * 100);
    const roadLabel = formatRoadLabel(segment.roadName) || `${from} → ${to}`;
    rows.push(`
      <label class="congestion-row">
        <span class="congestion-road">${escapeHtml(roadLabel)}</span>
        <small>${escapeHtml(from)} → ${escapeHtml(to)} · ${escapeHtml(travelModeLabel(segment.travelMode))}</small>
        <input type="range" min="55" max="98" value="${pct}" data-congestion-key="${escapeHtml(key)}">
        <output>${pct}%</output>
      </label>
    `);
  });
  list.innerHTML = rows.join("");
  if (summary) {
    summary.textContent = `共 ${rows.length} 段，展开后可调节`;
  }
  list.querySelectorAll("[data-congestion-key]").forEach((input) => {
    input.addEventListener("input", handleCongestionInput);
    input.addEventListener("change", handleCongestionInput);
  });
  syncCongestionPanelOpen();
}

function routeSegmentsForCongestion(result) {
  if (!result) return [];
  if (Array.isArray(result.segments)) return result.segments;
  if (Array.isArray(result.order)) return result.order.flatMap((leg) => leg.result?.segments || []);
  return [];
}

let congestionRecalcTimer = null;

function handleCongestionInput(event) {
  const input = event.currentTarget;
  const key = input.dataset.congestionKey;
  const value = clamp(Number(input.value) / 100, 0.55, 0.98);
  if (!key) return;
  state.userCongestionOverride.set(key, value);
  input.closest(".congestion-row")?.querySelector("output")?.replaceChildren(`${Math.round(value * 100)}%`);
  clearTimeout(congestionRecalcTimer);
  congestionRecalcTimer = setTimeout(recalculateCurrentRoute, 140);
}

function resetCongestion() {
  state.userCongestionOverride.clear();
  state.congestionSeed = `seed-${Date.now()}`;
  recalculateCurrentRoute();
}

function recalculateCurrentRoute() {
  const result = state.lastRouteResult;
  if (!result) {
    renderCongestionPanel(null);
    return;
  }
  if (Array.isArray(result.order)) runMultiStopRoute();
  else runShortestPath();
}

function drawRoute(path, color, routeResult = null) {
  clearRouteLayers(false);
  if (!state.map || path.length < 2) return;
  const segments = routeResult ? routeSegmentsForCongestion(routeResult) : [];
  const boundsLayers = [];

  if (segments.length) {
    segments.forEach((segment) => {
      const fromNode = findNode(segment.from);
      const toNode = findNode(segment.to);
      if (!fromNode || !toNode || fromNode.lat == null || toNode.lat == null) return;
      const latLngs = [[fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon]];
      const segColor = travelModeColor(segment.travelMode || "walk");
      const bg = L.polyline(latLngs, {
        color: "#ffffff",
        weight: 10,
        opacity: 0.92,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(state.map);
      const fg = L.polyline(latLngs, {
        color: segColor,
        weight: 5,
        opacity: 0.96,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(state.map);
      state.routeLayers.push(bg, fg);
      boundsLayers.push(bg);
    });
  } else {
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
    boundsLayers.push(bg);
  }

  path.forEach((id, index) => {
    const node = findNode(id);
    const shouldMark = index === 0 || index === path.length - 1 || Number(node?.spot_id) > 0;
    if (!shouldMark || !node || node.lat == null) return;
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

  if (boundsLayers.length) {
    state.map.fitBounds(L.featureGroup(boundsLayers).getBounds(), { padding: [48, 48] });
  }
  renderMapModeLegend(segments);
}

function clearRouteLayers(writeSummary = true) {
  state.routeLayers.forEach((layer) => layer.remove());
  state.routeLayers = [];
  renderMapModeLegend([]);
  if (writeSummary) {
    state.lastRouteResult = null;
    renderCongestionPanel(null);
    updateModeSegmentPanel(null);
  }
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
  updateRouteQuickSummary({
    title,
    strategy: strategy.label,
    distance: result.distance,
    minutes: result.minutes,
    mode: routeModeLabel(result.mode || state.mode, result.strategy)
  });
  renderCongestionPanel(result);
  updateModeSegmentPanel(result);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">${escapeHtml(title)}</p>
    <h3>${escapeHtml(start?.name || "-")} → ${escapeHtml(goal?.name || "-")}</h3>
    <p>${escapeHtml(strategy.algorithm)}，沿途经过 ${transitionCount} 个连接点。</p>
    <p>交通方式：${escapeHtml(segmentModeSummary(result))}；预计拥挤度 ${Number(result.averageCongestion || 1).toFixed(2)}。</p>
    <p>起点：${escapeHtml(start?.name || "-")}；终点：${escapeHtml(goal?.name || "-")}。</p>
    <ol>${keyPoi.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ol>
  `;
}

function summarizeMultiRoute(order, tsp) {
  const strategy = routeStrategyInfo(tsp.strategy);
  updateRouteQuickSummary({
    title: "往返多点游览",
    strategy: strategy.label,
    distance: tsp.totalDistance,
    minutes: tsp.totalMinutes,
    mode: routeModeLabel(tsp.mode || state.mode, tsp.strategy)
  });
  renderCongestionPanel(tsp);
  updateModeSegmentPanel(tsp);
  byId("route-summary").innerHTML = `
    <p class="eyebrow">往返多点游览顺序</p>
    <h3>${escapeHtml(routeModeLabel(tsp.mode || state.mode, tsp.strategy))} · ${Math.max(0, order.length - 1)} 个目的地 · 返回起点</h3>
    <p>${escapeHtml(strategy.algorithm)}，从当前位置出发，参观全部目标后回到起点。</p>
    <ol>${order.map((leg) => {
      const from = findNode(leg.from)?.name || leg.from;
      const to = findNode(leg.to)?.name || leg.to;
      const prefix = leg.returnToStart ? "返回" : "前往";
      return `<li>${prefix}：${escapeHtml(from)} → ${escapeHtml(to)} · ${leg.result.distance.toFixed(1)} 米 · ${leg.result.minutes.toFixed(1)} 分钟 · ${escapeHtml(segmentModeSummary(leg.result))}</li>`;
    }).join("")}</ol>
  `;
}

function summarize(message) {
  updateRouteQuickSummary(null);
  renderCongestionPanel(null);
  updateModeSegmentPanel(null);
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

function syncTransportModeUi() {
  const campus = isCampusRegion();
  const secondary = document.querySelector('.mode-button[data-mode="bike"], .mode-button[data-mode="cart"]');
  const mixed = document.querySelector('.mode-button[data-mode="mixed"]');
  if (secondary) {
    secondary.dataset.mode = campus ? "bike" : "cart";
    secondary.textContent = campus ? "骑行" : "电瓶车";
  }
  if (mixed) {
    mixed.textContent = campus ? "混合(步+骑)" : "混合(步+车)";
  }
  if (state.mode === "cart" && campus) state.mode = "bike";
  if (state.mode === "bike" && !campus) state.mode = "cart";
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
  const hint = byId("routeModeHint");
  if (hint) {
    hint.textContent = campus
      ? "校区：步行走全部道路，骑行仅走骑行/通用道路；混合模式按最短时间选步骑组合。"
      : "景区：步行走全部道路，电瓶车仅走观光路线；混合模式按最短时间选步+电瓶车组合。";
  }
}

window.addEventListener("resize", debounce(syncIndoorPlanOverlays, 120));
