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
    const image = restaurantCardImage(item.restaurant, item.nearNode);
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
