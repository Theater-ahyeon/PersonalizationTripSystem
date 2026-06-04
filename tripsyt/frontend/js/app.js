/**
 * Tripsyt 个性化旅游系统 - 前端逻辑
 * 纯HTML/CSS/JavaScript实现
 */

// ========== 全局配置 ==========
const API_BASE = "/api";

// ========== 工具函数 ==========

/** 显示提示消息 */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    toast.style.transition = "0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/** 显示/隐藏加载遮罩 */
function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}
function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

/** 打开弹窗 */
function openModal(id) {
  document.getElementById(id).classList.add("show");
}
/** 关闭弹窗 */
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

/** 封装API请求 */
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(API_BASE + url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== 0 && data.code !== 200) {
      throw new Error(data.message || "请求失败");
    }
    return data.data;
  } catch (err) {
    showToast(err.message || "网络错误，请检查后端服务", "error");
    throw err;
  }
}

/** 生成评分星星HTML */
function starsHTML(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  let html = "";
  for (let i = 0; i < full; i++) html += "★";
  if (half) html += "☆";
  return `<span style="color:#f59e0b">${html}</span> <span style="color:#64748b">${rating.toFixed(1)}</span>`;
}

/** 景区图标映射 */
const areaIcons = ["🏔", "🏖", "🏯", "🌳", "🌊", "🏕", "⛩", "🕌", "⛰", "🏝"];
function getAreaIcon(index) {
  return areaIcons[index % areaIcons.length];
}

/** 美食图标映射 */
const foodIcons = ["🍜", "🍲", "🥘", "🍱", "🧆", "🥟", "🍖", "🦐", "🥩", "🍛"];
function getFoodIcon(index) {
  return foodIcons[index % foodIcons.length];
}

/** 日记图标 */
const diaryIcons = ["📝", "📖", "✏️", "📒", "📓"];
function getDiaryIcon(index) {
  return diaryIcons[index % diaryIcons.length];
}

/** 设施图标映射 */
const placeIconMap = {
  restaurant: "🍽",
  restroom: "🚻",
  parking: "🅿️",
  shop: "🛍",
  hotel: "🏨",
  attraction: "📍",
};
function getPlaceIcon(category) {
  return placeIconMap[category] || "📍";
}

/** 设施颜色映射 */
const placeColorMap = {
  restaurant: "#ef4444",
  restroom: "#3b82f6",
  parking: "#6366f1",
  shop: "#f59e0b",
  hotel: "#10b981",
  attraction: "#ec4899",
};
function getPlaceColor(category) {
  return placeColorMap[category] || "#64748b";
}

// ========== Tab切换 ==========
function initTabs() {
  const tabs = document.querySelectorAll("#navTabs .tab");
  const pages = document.querySelectorAll(".page");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // 切换Tab激活状态
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // 切换页面显示
      const target = tab.dataset.tab;
      pages.forEach((p) => p.classList.remove("active"));
      document.getElementById("page-" + target).classList.add("active");

      // 移动端关闭菜单
      document.getElementById("navTabs").classList.remove("show");

      // 首次切换时加载数据
      loadPageData(target);
    });
  });

  // 移动端菜单切换
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("navTabs").classList.toggle("show");
  });
}

/** 页面首次加载标记 */
const pageLoaded = {};

/** 根据Tab名加载对应数据 */
function loadPageData(tab) {
  if (pageLoaded[tab]) return;
  switch (tab) {
    case "recommend":
      loadAreas();
      break;
    case "route":
      loadRouteAreas();
      break;
    case "place":
      loadPlaceLocations();
      break;
    case "diary":
      loadDiaries();
      break;
    case "exchange":
      break; // 交流页需手动搜索
    case "food":
      loadFoods();
      break;
  }
  pageLoaded[tab] = true;
}

// ========== 旅游推荐 ==========
let currentAreas = [];

async function loadAreas() {
  try {
    showLoading();
    const sort = document.getElementById("recSort").value;
    const topK = document.getElementById("recTopK").value;
    const search = document.getElementById("recSearch").value.trim();
    let url = `/areas?sort=${sort}&topK=${topK}`;
    if (search) url += `&keyword=${encodeURIComponent(search)}`;
    currentAreas = await apiFetch(url);
    renderAreas(currentAreas);
  } catch {
    renderAreas([]);
  } finally {
    hideLoading();
  }
}

function renderAreas(areas) {
  const container = document.getElementById("areaList");
  if (!areas || areas.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无景区数据</div>';
    return;
  }
  container.innerHTML = areas
    .map(
      (area, i) => `
        <div class="card" onclick="showAreaDetail(${area.id || i})">
            <div class="card-header">
                <span class="card-icon">${getAreaIcon(i)}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${area.name || "未命名景区"}</div>
                <div class="card-meta">
                    <span class="heat">🔥 ${area.heat || 0}</span>
                    <span class="rating">${starsHTML(area.rating || 0)}</span>
                </div>
                <div class="card-tags">
                    ${(area.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}
                    ${area.category ? `<span class="tag">${area.category}</span>` : ""}
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

async function showAreaDetail(areaId) {
  try {
    showLoading();
    const area = await apiFetch(`/areas/${areaId}`);
    document.getElementById("areaDetailName").textContent =
      area.name || "景区详情";
    document.getElementById("areaDetailInfo").innerHTML = `
        <p><span class="label">热度：</span>🔥 ${area.heat || 0}</p>
        <p><span class="label">评分：</span>${starsHTML(area.rating || 0)}</p>
        <p><span class="label">类别：</span>${area.category || "-"}</p>
        <p><span class="label">省份：</span>${area.province || "-"}</p>
        <p><span class="label">描述：</span>${area.description || "-"}</p>
    `;
    // 加载建筑物列表
    try {
      const buildings = await apiFetch(`/buildings?areaId=${areaId}`);
      const buildingContainer = document.getElementById("buildingList");
      if (!buildings || buildings.length === 0) {
        buildingContainer.innerHTML =
          '<div class="empty-state">暂无建筑物信息</div>';
      } else {
        buildingContainer.innerHTML = buildings
          .slice(0, 20)
          .map(
            (b, i) => `
            <div class="card" style="min-width:140px;max-width:180px;">
                <div class="card-header" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
                    <span class="card-icon">🏛</span>
                </div>
                <div class="card-body">
                    <div class="card-title">${b.name || "建筑物"}</div>
                    <div class="card-meta">
                        <span>类型：${b.type || "-"}</span>
                        <span>楼层：${b.floors || "-"}</span>
                    </div>
                </div>
            </div>
        `,
          )
          .join("");
      }
    } catch (e) {
      document.getElementById("buildingList").innerHTML =
        '<div class="empty-state">加载建筑物失败</div>';
    }
    openModal("areaDetailModal");
  } catch {
    showToast("加载景区详情失败", "error");
  } finally {
    hideLoading();
  }
}

function initRecommendEvents() {
  document.getElementById("recSearchBtn").addEventListener("click", () => {
    pageLoaded.recommend = false;
    loadAreas();
  });
  document.getElementById("recSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      pageLoaded.recommend = false;
      loadAreas();
    }
  });
  document.getElementById("recSort").addEventListener("change", () => {
    pageLoaded.recommend = false;
    loadAreas();
  });
  document.getElementById("recTopK").addEventListener("change", () => {
    pageLoaded.recommend = false;
    loadAreas();
  });
}

// ========== 路线规划 ==========
let routeGraphData = null; // 当前景区图数据
let canvasOffset = { x: 0, y: 0 }; // 画布偏移（拖拽）
let canvasScale = 1; // 画布缩放
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let highlightPath = []; // 高亮路径节点ID列表

async function loadRouteAreas() {
  try {
    const areas = await apiFetch("/areas?sort=heat&topK=20");
    const select = document.getElementById("routeAreaSelect");
    select.innerHTML = '<option value="">请选择景区</option>';
    (areas || []).forEach((area) => {
      select.innerHTML += `<option value="${area.id}">${area.name}</option>`;
    });
  } catch {
    // 静默处理
  }
}

async function onRouteAreaChange() {
  const areaId = document.getElementById("routeAreaSelect").value;
  if (!areaId) return;

  try {
    showLoading();
    // 加载景区图数据
    routeGraphData = await apiFetch(`/areas/${areaId}/graph`);
    highlightPath = [];
    canvasOffset = { x: 0, y: 0 };
    canvasScale = 1;

    // 填充起点和终点下拉框
    const nodes = routeGraphData.nodes || [];
    const startSelect = document.getElementById("routeStart");
    const endSelect = document.getElementById("routeEnd");
    startSelect.innerHTML = '<option value="">请选择起点</option>';
    endSelect.innerHTML = '<option value="">请选择终点</option>';

    nodes.forEach((node) => {
      startSelect.innerHTML += `<option value="${node.id}">${node.name}</option>`;
      endSelect.innerHTML += `<option value="${node.id}">${node.name}</option>`;
    });

    // 填充室内导航建筑物
    const indoorSelect = document.getElementById("indoorBuilding");
    indoorSelect.innerHTML = '<option value="">请选择建筑物</option>';
    const buildings = routeGraphData.buildings || [];
    buildings.forEach((b) => {
      if (b.floors > 1) {
        indoorSelect.innerHTML += `<option value="${b.id}">${b.name} (${b.floors}层)</option>`;
      }
    });

    drawRouteMap();
  } catch {
    showToast("加载景区图数据失败", "error");
  } finally {
    hideLoading();
  }
}

/** 绘制路线地图 */
function drawRouteMap() {
  const canvas = document.getElementById("routeCanvas");
  const container = document.getElementById("canvasContainer");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight || 500;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvasOffset.x, canvasOffset.y);
  ctx.scale(canvasScale, canvasScale);

  if (!routeGraphData) {
    ctx.restore();
    return;
  }

  const nodes = routeGraphData.nodes || [];
  const edges = routeGraphData.edges || [];

  // 使用节点的x,y坐标，如果没有则自动布局
  const positions = autoLayout(nodes, canvas.width, canvas.height);

  // 绘制边
  edges.forEach((edge) => {
    const from = positions[edge.from];
    const to = positions[edge.to];
    if (!from || !to) return;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);

    const isHighlighted =
      highlightPath.length > 1 && isEdgeInPath(edge.from, edge.to);
    if (isHighlighted) {
      ctx.strokeStyle = "#F44336";
      ctx.lineWidth = 4;
    } else {
      const transport = edge.transport || "walk";
      switch (transport) {
        case "walk":
          ctx.strokeStyle = "#999";
          break;
        case "bike":
          ctx.strokeStyle = "#4CAF50";
          break;
        case "shuttle":
          ctx.strokeStyle = "#2196F3";
          break;
        default:
          ctx.strokeStyle = "#999";
      }
      ctx.lineWidth = 2;
    }
    ctx.stroke();

    // 距离标签
    if (edge.distance) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(edge.distance.toFixed(0) + "m", mx, my - 6);
    }
  });

  // 绘制节点
  nodes.forEach((node, idx) => {
    const pos = positions[idx]; // 使用0-based索引
    if (!pos) return;

    const isInPath = highlightPath.includes(idx);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isInPath ? 18 : 14, 0, Math.PI * 2);
    ctx.fillStyle = isInPath ? "#F44336" : "#1a73e8";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#1a202c";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(node.name, pos.x, pos.y + 28);
  });

  ctx.restore();
}

/** 自动布局算法（力导向简化版） */
function autoLayout(nodes, width, height) {
  const positions = {};
  if (!nodes || nodes.length === 0) return positions;

  const hasCoords = nodes.some(
    (n) => n.x !== undefined && n.y !== undefined && (n.x !== 0 || n.y !== 0),
  );
  if (hasCoords) {
    // 找到坐标范围，归一化到画布
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
      }
    });
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 60;
    nodes.forEach((n, i) => {
      if (n.x !== undefined && n.y !== undefined) {
        positions[i] = {
          x: padding + ((n.x - minX) / rangeX) * (width - 2 * padding),
          y: padding + ((n.y - minY) / rangeY) * (height - 2 * padding),
        };
      } else {
        positions[i] = { x: width / 2, y: height / 2 };
      }
    });
    return positions;
  }

  // 环形布局
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions[i] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
  return positions;
}

/** 判断边是否在高亮路径中 */
function isEdgeInPath(from, to) {
  for (let i = 0; i < highlightPath.length - 1; i++) {
    if (
      (highlightPath[i] === from && highlightPath[i + 1] === to) ||
      (highlightPath[i] === to && highlightPath[i + 1] === from)
    ) {
      return true;
    }
  }
  return false;
}

/** 规划路线 */
async function planRoute() {
  const areaId = document.getElementById("routeAreaSelect").value;
  const start = document.getElementById("routeStart").value;
  const endSelect = document.getElementById("routeEnd");
  const ends = Array.from(endSelect.selectedOptions).map((o) => o.value);
  const strategy = document.getElementById("routeStrategy").value;
  const transport = document.getElementById("routeTransport").value;

  if (!areaId) {
    showToast("请选择景区", "error");
    return;
  }
  if (!start) {
    showToast("请选择起点", "error");
    return;
  }
  if (ends.length === 0) {
    showToast("请选择终点", "error");
    return;
  }

  try {
    showLoading();
    let result;
    const startInt = parseInt(start);
    const areaIdInt = parseInt(areaId);

    if (ends.length === 1) {
      // 单终点
      const endInt = parseInt(ends[0]);
      if (strategy === "shortest") {
        result = await apiFetch("/route/shortest", {
          method: "POST",
          body: JSON.stringify({
            start: startInt,
            end: endInt,
            areaId: areaIdInt,
          }),
        });
      } else if (strategy === "fastest") {
        result = await apiFetch("/route/fastest", {
          method: "POST",
          body: JSON.stringify({
            start: startInt,
            end: endInt,
            areaId: areaIdInt,
          }),
        });
      } else if (strategy === "transport") {
        const transportMap = { walk: 1, bike: 2, shuttle: 4 };
        result = await apiFetch("/route/transport", {
          method: "POST",
          body: JSON.stringify({
            start: startInt,
            end: endInt,
            areaId: areaIdInt,
            transport: transportMap[transport] || 1,
          }),
        });
      } else {
        result = await apiFetch("/route/shortest", {
          method: "POST",
          body: JSON.stringify({
            start: startInt,
            end: endInt,
            areaId: areaIdInt,
          }),
        });
      }
    } else {
      // 多终点 - 途经多点
      const waypoints = ends.map(Number);
      result = await apiFetch("/route/multipoint", {
        method: "POST",
        body: JSON.stringify({ start: startInt, waypoints, areaId: areaIdInt }),
      });
    }

    // 显示路线结果
    const resultDiv = document.getElementById("routeResult");
    const resultContent = document.getElementById("routeResultContent");
    resultDiv.style.display = "block";

    if (result && result.found) {
      highlightPath = result.path || [];

      // 获取节点名称映射
      const nodeMap = {};
      if (routeGraphData && routeGraphData.nodes) {
        routeGraphData.nodes.forEach((n) => {
          nodeMap[n.id] = n.name;
        });
      }

      const pathNames = (result.path || [])
        .map((id) => nodeMap[id] || `节点${id}`)
        .join(" → ");

      let infoHtml = `<p><strong>总距离：</strong>${(result.totalDistance || 0).toFixed(1)}m</p>`;
      if (result.totalTime > 0) {
        infoHtml += `<p><strong>预计时间：</strong>${(result.totalTime || 0).toFixed(1)}秒</p>`;
      }
      infoHtml += `<p><strong>路径：</strong>${pathNames}</p>`;
      resultContent.innerHTML = infoHtml;
    } else {
      highlightPath = [];
      resultContent.innerHTML = "<p>未找到路线</p>";
    }

    drawRouteMap();
  } catch {
    showToast("路线规划失败", "error");
  } finally {
    hideLoading();
  }
}

/** 室内导航 */
async function planIndoorRoute() {
  const buildingId = document.getElementById("indoorBuilding").value;
  const floor = document.getElementById("indoorFloor").value;
  const start = document.getElementById("indoorStart").value;
  const end = document.getElementById("indoorEnd").value;

  if (!buildingId || !floor || !start || !end) {
    showToast("请完整选择建筑物、楼层、起点和终点", "error");
    return;
  }

  try {
    showLoading();
    const result = await apiFetch("/route/indoor", {
      method: "POST",
      body: JSON.stringify({
        buildingId: parseInt(buildingId),
        floor: parseInt(floor),
        start: parseInt(start),
        end: parseInt(end),
      }),
    });

    showToast("室内路线规划成功", "success");
    // 可在此绘制室内地图
    if (result && result.path) {
      showToast(
        `路线：${result.path.map((n) => n.name || n).join(" → ")}`,
        "info",
      );
    }
  } catch {
    showToast("室内路线规划失败", "error");
  } finally {
    hideLoading();
  }
}

/** 加载建筑物楼层 */
async function onIndoorBuildingChange() {
  const buildingId = document.getElementById("indoorBuilding").value;
  if (!buildingId) return;

  try {
    const data = await apiFetch(`/buildings/${buildingId}`);
    const floorSelect = document.getElementById("indoorFloor");
    floorSelect.innerHTML = '<option value="">请选择楼层</option>';
    const floors = data.floors || [];
    floors.forEach((f) => {
      floorSelect.innerHTML += `<option value="${f}">${f}层</option>`;
    });
  } catch {
    // 静默处理
  }
}

/** 加载楼层房间 */
async function onIndoorFloorChange() {
  const buildingId = document.getElementById("indoorBuilding").value;
  const floor = document.getElementById("indoorFloor").value;
  if (!buildingId || !floor) return;

  try {
    const data = await apiFetch(`/buildings/${buildingId}/floors/${floor}`);
    const rooms = data.rooms || data.nodes || [];
    const startSelect = document.getElementById("indoorStart");
    const endSelect = document.getElementById("indoorEnd");
    startSelect.innerHTML = '<option value="">请选择起点</option>';
    endSelect.innerHTML = '<option value="">请选择终点</option>';
    rooms.forEach((r) => {
      startSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
      endSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
    });
  } catch {
    // 静默处理
  }
}

/** 初始化画布交互（拖拽和缩放） */
function initCanvasInteraction() {
  const canvas = document.getElementById("routeCanvas");

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStart = {
      x: e.clientX - canvasOffset.x,
      y: e.clientY - canvasOffset.y,
    };
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    canvasOffset.x = e.clientX - dragStart.x;
    canvasOffset.y = e.clientY - dragStart.y;
    drawRouteMap();
  });

  canvas.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("mouseleave", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    canvasScale = Math.max(0.3, Math.min(3, canvasScale * delta));
    drawRouteMap();
  });

  canvas.style.cursor = "grab";
}

function initRouteEvents() {
  document
    .getElementById("routeAreaSelect")
    .addEventListener("change", onRouteAreaChange);
  document.getElementById("planRouteBtn").addEventListener("click", planRoute);
  document
    .getElementById("indoorRouteBtn")
    .addEventListener("click", planIndoorRoute);
  document
    .getElementById("indoorBuilding")
    .addEventListener("change", onIndoorBuildingChange);
  document
    .getElementById("indoorFloor")
    .addEventListener("change", onIndoorFloorChange);

  // 策略切换时显示/隐藏交通工具选择
  document.getElementById("routeStrategy").addEventListener("change", (e) => {
    const transportGroup = document.getElementById("transportGroup");
    transportGroup.style.display =
      e.target.value === "transport" || e.target.value === "mixed"
        ? "block"
        : "none";
  });
}

// ========== 场所查询 ==========
let placePositions = {}; // 设施在地图上的位置

async function loadPlaceLocations() {
  try {
    const areas = await apiFetch("/areas?sort=heat&topK=20");
    const select = document.getElementById("placeLocation");
    select.innerHTML = '<option value="">请选择位置</option>';
    (areas || []).forEach((area) => {
      select.innerHTML += `<option value="${area.id}">${area.name}</option>`;
    });
  } catch {
    // 静默处理
  }
}

async function searchPlaces() {
  const location = document.getElementById("placeLocation").value;
  const range = document.getElementById("placeRange").value;
  const category = document.getElementById("placeCategory").value;

  if (!location) {
    showToast("请选择当前位置", "error");
    return;
  }

  try {
    showLoading();
    let url = `/places?location=${location}&range=${range}`;
    if (category) url += `&category=${category}`;
    const places = await apiFetch(url);
    renderPlaces(places);
    drawPlaceMap(places);
  } catch {
    renderPlaces([]);
  } finally {
    hideLoading();
  }
}

function renderPlaces(places) {
  const container = document.getElementById("placeList");
  if (!places || places.length === 0) {
    container.innerHTML = '<div class="empty-state">未找到附近设施</div>';
    return;
  }
  container.innerHTML = places
    .map(
      (p, i) => `
        <div class="place-item">
            <div class="place-icon" style="background:${getPlaceColor(p.category)}20;color:${getPlaceColor(p.category)}">
                ${getPlaceIcon(p.category)}
            </div>
            <div class="place-info">
                <div class="place-name">${p.name || "未命名"}</div>
                <div class="place-category">${p.category || "-"}</div>
            </div>
            <div class="place-distance">${p.distance || "-"}m</div>
        </div>
    `,
    )
    .join("");
}

/** 绘制场所地图 */
function drawPlaceMap(places) {
  const canvas = document.getElementById("placeCanvas");
  const container = document.getElementById("placeCanvasContainer");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight || 500;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!places || places.length === 0) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxRange =
    parseInt(document.getElementById("placeRange").value) || 1000;
  const scale = (Math.min(canvas.width, canvas.height) * 0.4) / maxRange;

  // 绘制范围圆
  ctx.beginPath();
  ctx.arc(cx, cy, maxRange * scale, 0, Math.PI * 2);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 绘制中心点（当前位置）
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#1a73e8";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("当前位置", cx, cy + 22);

  // 绘制设施
  placePositions = {};
  places.forEach((p, i) => {
    const angle = (2 * Math.PI * i) / places.length;
    const dist = (p.distance || 0) * scale;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);
    placePositions[p.id || i] = { x, y };

    const color = getPlaceColor(p.category);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#1a202c";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.name, x, y - 12);
  });
}

function initPlaceEvents() {
  document
    .getElementById("placeSearchBtn")
    .addEventListener("click", searchPlaces);
}

// ========== 旅游日记 ==========
let currentDiaries = [];
let currentDiaryId = null;

async function loadDiaries() {
  try {
    showLoading();
    const sort = document.getElementById("diarySort").value;
    currentDiaries = await apiFetch(`/diaries?sort=${sort}`);
    renderDiaries(currentDiaries);
  } catch {
    renderDiaries([]);
  } finally {
    hideLoading();
  }
}

function renderDiaries(diaries) {
  const container = document.getElementById("diaryList");
  if (!diaries || diaries.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无日记</div>';
    return;
  }
  container.innerHTML = diaries
    .map(
      (d, i) => `
        <div class="card diary-card" onclick="showDiaryDetail(${d.id || i})">
            <div class="card-header">
                <span class="card-icon">${getDiaryIcon(i)}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${d.title || "无标题"}</div>
                <div class="card-meta">
                    <span>✍ ${d.author || "匿名"}</span>
                    <span class="heat">🔥 ${d.heat || 0}</span>
                    <span class="rating">${starsHTML(d.rating || 0)}</span>
                </div>
                <div class="card-meta" style="margin-top:4px">
                    <span>📍 ${d.destination || "-"}</span>
                    <span>👁 ${d.views || 0}</span>
                    <span>${d.createdAt || ""}</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

async function showDiaryDetail(diaryId) {
  try {
    showLoading();
    currentDiaryId = diaryId;
    const diary = await apiFetch(`/diaries/${diaryId}`);
    document.getElementById("diaryDetailTitle").textContent =
      diary.title || "日记详情";
    document.getElementById("diaryDetailMeta").innerHTML = `
            <span>✍ ${diary.author || "匿名"}</span>
            <span>📍 ${diary.destination || "-"}</span>
            <span>🔥 ${diary.heat || 0}</span>
            <span>👁 ${diary.views || 0}</span>
            <span>${diary.createdAt || ""}</span>
        `;
    document.getElementById("diaryDetailBody").textContent =
      diary.content || "";

    // 设置评分星星
    const rating = diary.rating || 0;
    const stars = document.querySelectorAll("#diaryRating .star");
    stars.forEach((star) => {
      const val = parseInt(star.dataset.value);
      star.classList.toggle("active", val <= rating);
    });
    document.getElementById("ratingText").textContent =
      rating > 0 ? `${rating}分` : "点击评分";

    openModal("diaryDetailModal");
  } catch {
    showToast("加载日记详情失败", "error");
  } finally {
    hideLoading();
  }
}

/** 提交日记 */
async function submitDiary() {
  const title = document.getElementById("diaryTitle").value.trim();
  const destination = document.getElementById("diaryDestination").value.trim();
  const content = document.getElementById("diaryContent").value.trim();

  if (!title) {
    showToast("请输入标题", "error");
    return;
  }
  if (!content) {
    showToast("请输入内容", "error");
    return;
  }

  try {
    showLoading();
    await apiFetch("/diaries", {
      method: "POST",
      body: JSON.stringify({
        title,
        content,
        destination,
        userId: 1, // 默认用户ID
      }),
    });
    showToast("日记发布成功！", "success");
    closeModal("createDiaryModal");
    // 清空表单
    document.getElementById("diaryTitle").value = "";
    document.getElementById("diaryDestination").value = "";
    document.getElementById("diaryContent").value = "";
    // 重新加载
    pageLoaded.diary = false;
    loadDiaries();
  } catch {
    // 错误已在apiFetch中处理
  } finally {
    hideLoading();
  }
}

/** 评分 */
async function rateDiary(rating) {
  if (!currentDiaryId) return;
  try {
    await apiFetch(`/diaries/${currentDiaryId}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
    // 更新星星显示
    const stars = document.querySelectorAll("#diaryRating .star");
    stars.forEach((star) => {
      const val = parseInt(star.dataset.value);
      star.classList.toggle("active", val <= rating);
    });
    document.getElementById("ratingText").textContent = `${rating}分`;
    showToast("评分成功", "success");
  } catch {
    showToast("评分失败", "error");
  }
}

function initDiaryEvents() {
  document.getElementById("createDiaryBtn").addEventListener("click", () => {
    openModal("createDiaryModal");
  });
  document
    .getElementById("submitDiaryBtn")
    .addEventListener("click", submitDiary);
  document.getElementById("diarySort").addEventListener("change", () => {
    pageLoaded.diary = false;
    loadDiaries();
  });

  // 评分星星点击
  document.querySelectorAll("#diaryRating .star").forEach((star) => {
    star.addEventListener("click", () => {
      rateDiary(parseInt(star.dataset.value));
    });
    star.addEventListener("mouseenter", () => {
      const val = parseInt(star.dataset.value);
      document.querySelectorAll("#diaryRating .star").forEach((s) => {
        s.classList.toggle("active", parseInt(s.dataset.value) <= val);
      });
    });
    star.addEventListener("mouseleave", () => {
      // 恢复到实际评分状态
      const ratingText = document.getElementById("ratingText").textContent;
      const currentRating = parseInt(ratingText) || 0;
      document.querySelectorAll("#diaryRating .star").forEach((s) => {
        s.classList.toggle(
          "active",
          parseInt(s.dataset.value) <= currentRating,
        );
      });
    });
  });
}

// ========== 日记交流 ==========
let compressedData = null;
let originalData = null;

async function searchExchange() {
  const dest = document.getElementById("exDestSearch").value.trim();
  const title = document.getElementById("exTitleSearch").value.trim();
  const fullText = document.getElementById("exFullTextSearch").value.trim();

  if (!dest && !title && !fullText) {
    showToast("请输入搜索条件", "error");
    return;
  }

  try {
    showLoading();
    let url = "/diaries/search?";
    const params = [];
    if (dest) params.push(`destination=${encodeURIComponent(dest)}`);
    if (title) params.push(`title=${encodeURIComponent(title)}`);
    if (fullText) params.push(`keyword=${encodeURIComponent(fullText)}`);
    url += params.join("&");

    originalData = await apiFetch(url);
    renderExchangeList(originalData);
  } catch {
    renderExchangeList([]);
  } finally {
    hideLoading();
  }
}

function renderExchangeList(diaries) {
  const container = document.getElementById("exchangeList");
  if (!diaries || diaries.length === 0) {
    container.innerHTML = '<div class="empty-state">未找到相关日记</div>';
    return;
  }
  container.innerHTML = diaries
    .map(
      (d, i) => `
        <div class="card diary-card" onclick="showDiaryDetail(${d.id || i})">
            <div class="card-header">
                <span class="card-icon">${getDiaryIcon(i)}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${d.title || "无标题"}</div>
                <div class="card-meta">
                    <span>✍ ${d.author || "匿名"}</span>
                    <span class="heat">🔥 ${d.heat || 0}</span>
                    <span class="rating">${starsHTML(d.rating || 0)}</span>
                </div>
                <div class="card-meta" style="margin-top:4px">
                    <span>📍 ${d.destination || "-"}</span>
                    <span>${d.createdAt || ""}</span>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

/** 压缩数据 */
async function compressData() {
  if (!originalData) {
    showToast("请先搜索日记数据", "error");
    return;
  }
  try {
    showLoading();
    const result = await apiFetch("/diaries/compress", {
      method: "POST",
      body: JSON.stringify({ data: originalData }),
    });
    compressedData = result;
    const originalSize = JSON.stringify(originalData).length;
    const compressedSize =
      result.compressedSize || (result.data ? result.data.length : 0);
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    document.getElementById("compressInfo").textContent =
      `原始大小：${originalSize}B → 压缩后：${compressedSize}B（压缩率：${ratio}%）`;
    showToast("数据压缩成功", "success");
  } catch {
    showToast("压缩失败", "error");
  } finally {
    hideLoading();
  }
}

/** 解压数据 */
async function decompressData() {
  if (!compressedData) {
    showToast("请先压缩数据", "error");
    return;
  }
  try {
    showLoading();
    const result = await apiFetch("/diaries/decompress", {
      method: "POST",
      body: JSON.stringify(compressedData),
    });
    renderExchangeList(result);
    document.getElementById("compressInfo").textContent += " | 已解压显示";
    showToast("数据解压成功", "success");
  } catch {
    showToast("解压失败", "error");
  } finally {
    hideLoading();
  }
}

function initExchangeEvents() {
  document
    .getElementById("exSearchBtn")
    .addEventListener("click", searchExchange);
  document
    .getElementById("exFullTextSearch")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchExchange();
    });
  document
    .getElementById("compressBtn")
    .addEventListener("click", compressData);
  document
    .getElementById("decompressBtn")
    .addEventListener("click", decompressData);
}

// ========== 美食推荐 ==========
let currentFoods = [];

async function loadFoods() {
  try {
    // 先加载景区列表
    const areas = await apiFetch("/areas?sort=heat&topK=20");
    const select = document.getElementById("foodAreaSelect");
    if (select) {
      select.innerHTML = '<option value="">请选择景区</option>';
      (areas || []).forEach((area) => {
        select.innerHTML += `<option value="${area.id}">${area.name}</option>`;
      });
    }
  } catch {
    // 静默处理
  }
}

async function onFoodAreaChange() {
  const areaId = document.getElementById("foodAreaSelect").value;
  if (!areaId) return;

  try {
    showLoading();
    const sort = document.getElementById("foodSort")?.value || "heat";
    const topK = document.getElementById("foodTopK")?.value || 10;
    const cuisine = document.getElementById("foodCuisine")?.value || "";
    const keyword = document.getElementById("foodSearch")?.value?.trim() || "";

    let url = `/foods?areaId=${areaId}&sort=${sort}&topK=${topK}`;
    if (cuisine) url += `&cuisine=${encodeURIComponent(cuisine)}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    const foods = await apiFetch(url);
    renderFoods(foods);
  } catch {
    renderFoods([]);
  } finally {
    hideLoading();
  }
}

function renderFoods(foods) {
  const container = document.getElementById("foodList");
  if (!foods || foods.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无美食推荐</div>';
    return;
  }
  container.innerHTML = foods
    .map(
      (f, i) => `
        <div class="card food-card">
            <div class="card-header">
                <span class="card-icon">${getFoodIcon(i)}</span>
            </div>
            <div class="card-body">
                <div class="card-title">${f.name || "未命名美食"}</div>
                <div class="card-meta">
                    <span class="heat">🔥 ${f.heat || 0}</span>
                    <span class="rating">${starsHTML(f.rating || 0)}</span>
                </div>
                <div class="card-tags">
                    ${f.cuisine ? `<span class="tag cuisine">${f.cuisine}</span>` : ""}
                    ${f.restaurant ? `<span class="tag">🏪 ${f.restaurant}</span>` : ""}
                    ${f.distance ? `<span class="tag distance">📍 ${f.distance}m</span>` : ""}
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

function initFoodEvents() {
  const foodAreaSelect = document.getElementById("foodAreaSelect");
  if (foodAreaSelect) {
    foodAreaSelect.addEventListener("change", onFoodAreaChange);
  }
  document.getElementById("foodSearchBtn").addEventListener("click", () => {
    onFoodAreaChange();
  });
  document.getElementById("foodSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      onFoodAreaChange();
    }
  });
  document.getElementById("foodSort").addEventListener("change", () => {
    onFoodAreaChange();
  });
  document.getElementById("foodTopK").addEventListener("change", () => {
    onFoodAreaChange();
  });
  document.getElementById("foodCuisine").addEventListener("change", () => {
    onFoodAreaChange();
  });
}

// ========== 窗口大小变化时重绘Canvas ==========
function initResizeHandler() {
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (routeGraphData) drawRouteMap();
    }, 200);
  });
}

// ========== 初始化 ==========
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initRecommendEvents();
  initRouteEvents();
  initCanvasInteraction();
  initPlaceEvents();
  initDiaryEvents();
  initExchangeEvents();
  initFoodEvents();
  initResizeHandler();

  // 默认加载旅游推荐页
  loadPageData("recommend");
  pageLoaded.recommend = true;
});
