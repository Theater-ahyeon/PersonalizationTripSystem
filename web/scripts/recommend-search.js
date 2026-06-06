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
  const indexedCandidates = keyword
    ? invertedIndexCandidates(state.spotInvertedIndex, keyword, state.spots)
    : state.spots;
  const lshCandidates = getLshCandidates(state.spotLshIndex, activeIntent || preference || categoryPreference, indexedCandidates, 36);
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
    if (shouldTightCropRecommendation(item.spot, image)) card.classList.add("tight-image-crop");
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
        ${renderSpotReviewList(spotReviewSnippets(item.spot))}
        <div class="card-actions">
          ${node ? `<button class="link-button" data-focus-node="${node.id}">地图定位</button>${isRoutableNode(node.id) ? `<button class="link-button" data-route-goal="${node.id}">设为终点</button>` : '<span class="route-node-note">可查看详情</span>'}` : ""}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  bindResultButtons(container);
}

function shouldTightCropRecommendation(spot, image) {
  const text = `${spot?.name || ""} ${spot?.category || ""} ${spot?.tags || ""} ${image || ""}`;
  return /乐寿堂|Leshoutang|建筑|历史|室内/.test(text);
}

function spotReviewSnippets(spot) {
  const related = state.diaries.filter((diary) => diaryMatchesSpot(diary, spot));
  const comments = related.flatMap((diary) => (diary.comments || [])
    .filter((comment) => comment.content)
    .map((comment) => ({
      author: comment.user_name || `用户 ${comment.user_id || ""}`,
      rating: Number(comment.rating || diary.rating || spot.rating || 0),
      content: comment.content
    })));
  if (comments.length) return comments.slice(0, 2);
  return related.slice(0, 2).map((diary) => ({
    author: diary.title || "旅行日记",
    rating: Number(diary.rating || spot.rating || 0),
    content: diaryExcerpt(publicDiaryContent(diary), 58)
  }));
}

function diaryMatchesSpot(diary, spot) {
  const name = String(spot?.name || "").trim();
  const nodeName = String(findNodeBySpot(spot?.id)?.name || "").trim();
  const text = textOfDiary(diary);
  return Boolean(name && text.includes(name)) || Boolean(nodeName && text.includes(nodeName));
}

function renderSpotReviewList(reviews) {
  if (!reviews.length) return "";
  return `
    <div class="spot-review-list" aria-label="景点评论">
      ${reviews.map((review) => `
        <blockquote class="spot-review">
          <span>★ ${Number(review.rating || 0).toFixed(1)}</span>
          <p>${escapeHtml(review.content || "")}</p>
          <cite>${escapeHtml(review.author || "旅行者")}</cite>
        </blockquote>
      `).join("")}
    </div>
  `;
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

function syncCategoryChips() {
  const value = byId("recommendCategory")?.value || "";
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === value);
  });
}
