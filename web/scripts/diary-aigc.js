let aigcStatusRetryTimer = null;

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
    <p>当前区域：${escapeHtml(pack?.name || "颐和园")}</p>
  `;
}

function loadAppSettings() {
  try {
    return { ...state.appSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}") };
  } catch {
    return state.appSettings;
  }
}

function loadDiaryScope() {
  const value = localStorage.getItem(STORAGE_KEYS.diaryScope);
  return value === "mine" ? "mine" : "all";
}

function loadAigcConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.aigcConfig) || "{}");
    return {
      ...state.aigcConfig,
      ...saved,
      enabled: Boolean(saved.enabled),
      baseUrl: saved.baseUrl || state.aigcConfig.baseUrl,
      model: saved.model || state.aigcConfig.model,
      apiKey: saved.apiKey || ""
    };
  } catch {
    return state.aigcConfig;
  }
}

function renderSettingsForm() {
  byId("themeSelect").value = state.appSettings.theme || "light";
  byId("compactCardsToggle").checked = Boolean(state.appSettings.compactCards);
  byId("defaultViewSelect").value = state.appSettings.defaultView || "recommendView";
  byId("defaultRouteModeSelect").value = state.appSettings.defaultRouteMode || "walk";
  byId("defaultDiarySortSelect").value = state.appSettings.defaultDiarySort || "heat";
  byId("aigcEnabledToggle").checked = Boolean(state.aigcConfig.enabled);
  byId("aigcBaseUrlInput").value = state.aigcConfig.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  byId("aigcModelInput").value = state.aigcConfig.model || "qwen-plus";
  byId("aigcApiKeyInput").value = state.aigcConfig.apiKey || "";
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
  state.aigcConfig = {
    enabled: byId("aigcEnabledToggle").checked,
    baseUrl: normalizeAigcBaseUrl(byId("aigcBaseUrlInput").value.trim()),
    model: byId("aigcModelInput").value.trim() || "qwen-plus",
    apiKey: byId("aigcApiKeyInput").value.trim()
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.appSettings));
  localStorage.setItem(STORAGE_KEYS.aigcConfig, JSON.stringify(state.aigcConfig));
  applyAppSettings();
  byId("diarySort").value = state.appSettings.defaultDiarySort;
  state.mode = state.appSettings.defaultRouteMode;
  updateModeButtons();
  renderDiaryList();
  byId("settingsFeedback").textContent = "设置已保存。";
  refreshAigcServiceStatus();
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

function renderDiaryList() {
  const keyword = byId("diaryKeyword").value.trim().toLowerCase();
  const mode = byId("diarySearchMode").value;
  const sort = byId("diarySort").value;
  const user = selectedUser();
  const diaryScope = byId("diaryScopeSelect")?.value || state.diaryScope || "all";
  state.diaryScope = diaryScope;
  const interest = (user?.preference_tags || []).join(" ");
  const scopedDiaries = diaryScope === "mine"
    ? state.diaries.filter((diary) => Number(diary.user_id) === Number(user?.id))
    : state.diaries;
  const indexedDiaries = keyword && mode !== "title"
    ? invertedIndexCandidates(state.diaryInvertedIndex, keyword, scopedDiaries)
    : scopedDiaries;
  const lshCandidates = mode === "title"
    ? indexedDiaries
    : (sort === "interest"
    ? getLshCandidates(state.diaryLshIndex, `${interest} ${keyword}`, indexedDiaries, 8)
    : indexedDiaries);
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
  const pageSize = state.diaryPageSize || 10;
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  state.diaryPage = Math.min(Math.max(1, Number(state.diaryPage) || 1), pageCount);
  const pageStart = (state.diaryPage - 1) * pageSize;
  const pageResults = results.slice(pageStart, pageStart + pageSize);

  const container = byId("diaryResults");
  const note = byId("diaryAlgorithmNote");
  if (note) {
    const searchLabel = mode === "title" ? "按标题查找" : mode === "destination" ? "按目的地查找" : "按正文查找";
    note.innerHTML = `
      <span>${diaryScope === "mine" ? "我的日记" : "全部日记"}</span>
      <span>${searchLabel}</span>
      <span>${sort === "interest" ? "按你的偏好重排" : "按社区反馈排序"}</span>
      <span>第 ${state.diaryPage}/${pageCount} 页，显示 ${pageResults.length}/${results.length} 篇旅行故事</span>
    `;
  }
  renderDiaryPager(pageCount, results.length);
  container.innerHTML = "";
  if (!pageResults.length) {
    container.innerHTML = `
      <article class="result-card">
        <p class="eyebrow">检索结果</p>
        <h3>没有找到匹配日记</h3>
        <p>可以切换全文检索、标题检索或目的地查询，再输入新的关键词。</p>
      </article>
    `;
    return;
  }
  pageResults.forEach((item) => {
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

function renderDiaryPager(pageCount, resultCount) {
  const pager = byId("diaryPager");
  if (!pager) return;
  if (resultCount <= state.diaryPageSize) {
    pager.innerHTML = "";
    return;
  }
  pager.innerHTML = `
    <button class="secondary-button" type="button" data-diary-page="prev" ${state.diaryPage <= 1 ? "disabled" : ""}>上一页</button>
    <span>第 ${state.diaryPage} / ${pageCount} 页</span>
    <button class="secondary-button" type="button" data-diary-page="next" ${state.diaryPage >= pageCount ? "disabled" : ""}>下一页</button>
  `;
  pager.querySelectorAll("[data-diary-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.diaryPage += button.dataset.diaryPage === "next" ? 1 : -1;
      renderDiaryList();
      focusResultRegion("diaryResults");
    });
  });
}

function diaryCardImage(diary) {
  if (diary?.image) return resolveAssetPath(diary.image);
  const text = `${diary.destination || ""} ${(diary.tags || []).join(" ")} ${diary.content || ""}`;
  if (/桥|湖|水|夕阳|昆明湖|十七孔/.test(text)) return WATER_IMAGE;
  if (/校园|清华|学校|图书馆|教学楼/.test(text)) return CAMPUS_IMAGE;
  if (/建筑|殿|楼|文化|展厅|博物馆/.test(text)) return BUILDING_IMAGE;
  const index = Math.abs(Math.floor(stableFraction(`${diary.id}|${diary.title}`) * DIARY_IMAGES.length)) % DIARY_IMAGES.length;
  return DIARY_IMAGES[index];
}

function matchesDiarySearch(diary, keyword, mode) {
  if (!keyword) return true;
  if (mode === "title") return kmpContains(String(diary.title || "").toLowerCase(), keyword);
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
  const context = collectDiaryAigcContext();
  byId("diaryContentInput").value = [
    `今天的路线围绕${context.destination || "旅行目的地"}展开，重点体验${preference}。`,
    context.content || "从入口进入后依次记录建筑、湖景和服务设施，把路线、照片和当天心情整理成一篇完整游记。"
  ].filter(Boolean).join("\n\n");
  renderAigcPanel({
    title: "日记草稿已填入正文",
    hint: "已根据用户偏好整理可编辑草稿，可继续点击 AI 分镜生成配图或视频。",
    bodyHtml: `<p>${escapeHtml(byId("diaryContentInput").value)}</p>`
  });
}

function collectDiaryAigcContext() {
  const user = selectedUser();
  const pack = findRegionPack(state.currentRegionPackId);
  return {
    regionName: pack?.name || "旅行区域",
    title: byId("diaryTitleInput")?.value.trim() || "",
    destination: byId("diaryDestinationInput")?.value.trim() || pack?.name || "",
    content: byId("diaryContentInput")?.value.trim() || "",
    media: byId("diaryMediaInput")?.value.trim() || "",
    tags: splitTags(byId("diaryTagsInput")?.value || ""),
    preferences: user?.preference_tags || []
  };
}

function formatAigcAudioLabel(videoAudio) {
  if (videoAudio === "auto") return " · 有声";
  if (videoAudio === "custom") return " · 自定义音频";
  if (videoAudio === "none") return " · 静音";
  return "";
}

function formatAigcVideoHint(audioMode) {
  if (audioMode === "custom") return "视频已按自定义音频生成。";
  if (audioMode === "auto") return "视频由 wan2.7 自动生成背景音乐与环境音效。";
  return "视频为静音短片（当前模型不含自动配音）。";
}

function scheduleAigcStatusRetry(delayMs = 5000) {
  window.clearTimeout(aigcStatusRetryTimer);
  aigcStatusRetryTimer = window.setTimeout(() => {
    refreshAigcServiceStatus();
  }, delayMs);
}

async function refreshAigcServiceStatus() {
  const status = byId("aigcServiceStatus");
  if (!status) return;
  window.clearTimeout(aigcStatusRetryTimer);
  const browserConfigured = hasBrowserAigcConfig();
  state.aigc.directConfigured = browserConfigured;
  try {
    const response = await fetch(`${AIGC_API_BASE}/api/aigc/health`, { cache: "no-store" });
    const data = await response.json();
    state.aigc.ready = Boolean(data.ok);
    state.aigc.proxyReady = Boolean(data.ok);
    state.aigc.proxyConfigured = Boolean(data.configured);
    state.aigc.configured = Boolean(data.configured) || browserConfigured;
    state.aigc.textModel = data.textModel || "";
    state.aigc.imageModel = data.imageModel || "";
    state.aigc.videoModel = data.videoModel || "";
    state.aigc.videoAudio = data.videoAudio || "none";
    if (data.configured) {
      status.textContent = `AIGC 服务已连接（${data.textModel} / ${data.imageModel} / ${data.videoModel}${formatAigcAudioLabel(data.videoAudio)}）`;
      status.dataset.aigcMode = "proxy";
    } else if (browserConfigured) {
      status.textContent = "已启用浏览器直连分镜接口；代理未配置 DASHSCOPE_API_KEY，配图/视频仍需启动代理。";
      status.dataset.aigcMode = "browser-direct-storyboard";
      scheduleAigcStatusRetry(8000);
    } else {
      status.textContent = "AIGC 代理已启动，但未配置 DASHSCOPE_API_KEY（将使用本地模拟）";
      status.dataset.aigcMode = "mock";
      scheduleAigcStatusRetry(8000);
    }
    status.classList.toggle("aigc-ready", Boolean(data.configured) || browserConfigured);
  } catch {
    state.aigc.proxyReady = false;
    state.aigc.proxyConfigured = false;
    state.aigc.directConfigured = browserConfigured;
    state.aigc.ready = false;
    state.aigc.configured = browserConfigured;
    if (browserConfigured) {
      status.textContent = "已启用浏览器直连分镜接口；AIGC 代理未启动，分镜可用，配图/视频需运行 web/scripts/start-aigc.ps1。";
      status.dataset.aigcMode = "browser-direct-storyboard";
      status.classList.add("aigc-ready");
      scheduleAigcStatusRetry(8000);
    } else {
      status.textContent = "AIGC 代理未启动：请运行 web/scripts/start-aigc.ps1（未连接时使用本地模拟）";
      status.dataset.aigcMode = "mock";
      status.classList.remove("aigc-ready");
      scheduleAigcStatusRetry(5000);
    }
  }
}

function renderAigcPanel({ title, hint, bodyHtml = "", storyboard = null, videoUrl = "" }) {
  const container = byId("aigcStoryboard");
  if (!container) return;
  const framesHtml = storyboard?.frames?.length
    ? `<div class="aigc-frame-grid">${storyboard.frames.map((frame, index) => `
        <article class="frame-card">
          ${frame.image_url ? `<img src="${escapeHtml(frame.image_url)}" alt="${escapeHtml(frame.title || `镜头 ${index + 1}`)}" loading="lazy">` : ""}
          <div class="frame-card-body">
            <h4>${escapeHtml(frame.title || `镜头 ${index + 1}`)}</h4>
            <p>${escapeHtml(frame.narration || frame.visual_prompt || "")}</p>
            ${frame.duration_sec ? `<small>${frame.duration_sec}s</small>` : ""}
          </div>
        </article>
      `).join("")}</div>`
    : "";
  const videoHtml = videoUrl
    ? `<div class="aigc-video-wrap"><video class="aigc-video-player" controls playsinline src="${escapeHtml(videoUrl)}"></video></div>`
    : "";
  const motionHtml = storyboard?.frames?.length ? renderAigcMotion(storyboard) : "";
  container.innerHTML = `
    <strong>${escapeHtml(title || "AIGC 输出")}</strong>
    ${hint ? `<p class="storyboard-hint">${escapeHtml(hint)}</p>` : ""}
    ${storyboard?.summary ? `<p>${escapeHtml(storyboard.summary)}</p>` : ""}
    ${motionHtml}
    ${framesHtml}
    ${videoHtml}
    ${bodyHtml}
  `;
}

function renderAigcMotion(storyboard) {
  const frames = (storyboard.frames || []).slice(0, 5);
  const points = frames.map((frame, index) => {
    const left = 10 + (index * (80 / Math.max(1, frames.length - 1)));
    const top = index % 2 ? 62 : 34;
    return `<span class="aigc-motion-point" style="left:${left}%;top:${top}%;animation-delay:${(index * 0.35).toFixed(2)}s">${index + 1}</span>`;
  }).join("");
  const labels = frames.map((frame, index) => `<li><span>${index + 1}</span>${escapeHtml(frame.title || `Frame ${index + 1}`)}</li>`).join("");
  return `
    <div class="aigc-motion-stage" aria-label="AIGC travel animation preview">
      <div class="aigc-motion-map">
        <span class="aigc-motion-line"></span>
        ${points}
      </div>
      <ol class="aigc-motion-steps">${labels}</ol>
    </div>
  `;
}

function renderAigcLoading(message) {
  renderAigcPanel({
    title: "AI 生成中…",
    hint: message || "正在调用 DashScope，请稍候（视频生成可能需要 1–3 分钟）",
    bodyHtml: `<p class="aigc-progress"><span class="aigc-spinner" aria-hidden="true"></span>处理中</p>`
  });
}

function normalizeAigcBaseUrl(value) {
  const base = String(value || "https://dashscope.aliyuncs.com/compatible-mode/v1").trim().replace(/\/+$/, "");
  return base || "https://dashscope.aliyuncs.com/compatible-mode/v1";
}

function hasBrowserAigcConfig() {
  return Boolean(state.aigcConfig?.enabled && state.aigcConfig?.apiKey);
}

function hasAigcProxyConfigured() {
  return Boolean(state.aigc.proxyConfigured);
}

function buildBrowserAigcPrompt(context) {
  const user = selectedUser();
  const preferences = (user?.preference_tags || []).slice(0, 5).join("、") || "文化、路线、拍照";
  return [
    "请为旅行日记生成一个中文旅行故事板，只返回 JSON，不要 Markdown。",
    "JSON 格式：",
    '{"title":"标题","summary":"80字以内摘要","video_prompt":"视频生成提示词","frames":[{"title":"镜头标题","narration":"旁白","visual_prompt":"英文图像提示词","duration_sec":3}]}',
    "frames 必须为 4 个，duration_sec 为 2 到 5。",
    `标题：${context.title || "未填写"}`,
    `目的地：${context.destination || "未填写"}`,
    `正文：${context.content || "未填写"}`,
    `用户偏好：${preferences}`
  ].join("\n");
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("AIGC 返回为空。");
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("AIGC 返回不是可解析的 JSON。");
    return JSON.parse(raw.slice(start, end + 1));
  }
}

function normalizeBrowserStoryboard(data, context) {
  const storyboard = data && typeof data === "object" ? data : {};
  const frames = Array.isArray(storyboard.frames) ? storyboard.frames.slice(0, 4) : [];
  const safeFrames = frames.map((frame, index) => ({
    title: String(frame?.title || `镜头 ${index + 1}`),
    narration: String(frame?.narration || frame?.summary || ""),
    visual_prompt: String(frame?.visual_prompt || frame?.prompt || `${context.destination || "travel"} cinematic travel shot`),
    duration_sec: Math.min(5, Math.max(2, Number(frame?.duration_sec || 3)))
  }));
  while (safeFrames.length < 4) {
    const index = safeFrames.length;
    safeFrames.push({
      title: `镜头 ${index + 1}`,
      narration: index === 0 ? "抵达目的地，建立旅行氛围。" : "沿路线记录关键景别与体验。",
      visual_prompt: `${context.destination || "travel destination"} cinematic travel vlog frame ${index + 1}`,
      duration_sec: 3
    });
  }
  return {
    title: String(storyboard.title || context.title || `${context.destination || "旅行"}分镜`),
    summary: String(storyboard.summary || "由浏览器直连 AIGC 接口生成的旅行故事板。"),
    video_prompt: String(storyboard.video_prompt || `${context.destination || "travel"} cinematic travel vlog`),
    frames: safeFrames
  };
}

async function callBrowserAigcStoryboard(context) {
  const baseUrl = normalizeAigcBaseUrl(state.aigcConfig.baseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.aigcConfig.apiKey}`
    },
    body: JSON.stringify({
      model: state.aigcConfig.model || "qwen-plus",
      messages: [
        { role: "system", content: "你是旅行短视频分镜策划助手，输出必须是严格 JSON。" },
        { role: "user", content: buildBrowserAigcPrompt(context) }
      ],
      temperature: 0.7
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `浏览器直连 AIGC 请求失败 (${response.status})`;
    throw new Error(message);
  }
  const content = data?.choices?.[0]?.message?.content || data?.output?.text || "";
  return normalizeBrowserStoryboard(extractJsonObject(content), context);
}

function mockStoryboard() {
  const user = selectedUser();
  const context = collectDiaryAigcContext();
  const preference = (user?.preference_tags || ["文化", "路线"]).slice(0, 3);
  return {
    title: context.title || `${context.destination || "旅行"}分镜`,
    summary: "本地模拟分镜（未连接 API 或调用失败时使用）",
    video_prompt: `旅行 Vlog：${context.destination}，偏好 ${preference.join("、")}`,
    frames: [
      {
        title: "开场",
        narration: `从${context.destination || "入口"}出发，偏好标签 ${preference.join("、")}。`,
        visual_prompt: `${context.destination} travel gate morning photo`,
        duration_sec: 3
      },
      {
        title: "转场",
        narration: "沿规划路线经过主要节点和停留点。",
        visual_prompt: "scenic walking route map travel photo",
        duration_sec: 3
      },
      {
        title: "中景",
        narration: "记录评分、热度与关键词，形成推荐说明字幕。",
        visual_prompt: "travel landmark detail shot cinematic",
        duration_sec: 3
      },
      {
        title: "结尾",
        narration: "生成 8 秒短片脚本草稿，用作日记封面。",
        visual_prompt: "sunset travel vlog ending shot",
        duration_sec: 2
      }
    ]
  };
}

async function callAigcApi(path, payload) {
  const response = await fetch(`${AIGC_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `AIGC 请求失败 (${response.status})`);
  }
  return data;
}

async function generateAigcStoryboard({ useApi = true } = {}) {
  const context = collectDiaryAigcContext();
  if (!context.title && !context.content && !context.destination) {
    renderAigcPanel({ title: "请先填写标题、目的地或正文", hint: "AI 分镜需要基础日记内容。" });
    return;
  }
  if (useApi && hasAigcProxyConfigured()) {
    try {
      renderAigcLoading("Qwen 正在生成分镜脚本…");
      const data = await callAigcApi("/api/aigc/storyboard", { context });
      state.aigc.storyboard = data.storyboard;
      renderAigcPanel({
        title: data.storyboard.title || "AI 分镜脚本",
        hint: "分镜脚本已生成，可继续「AI 分镜配图」或「AI 旅行视频」。",
        storyboard: data.storyboard
      });
      return;
    } catch (error) {
      renderAigcPanel({
        title: "API 分镜失败，已回退本地模拟",
        hint: error.message || String(error),
        storyboard: mockStoryboard()
      });
      state.aigc.storyboard = mockStoryboard();
      return;
    }
  }
  if (useApi && hasBrowserAigcConfig()) {
    try {
      renderAigcLoading(`${state.aigcConfig.model || "AIGC"} 正在通过浏览器直连生成分镜脚本…`);
      const storyboard = await callBrowserAigcStoryboard(context);
      state.aigc.storyboard = storyboard;
      renderAigcPanel({
        title: storyboard.title || "AI 分镜脚本",
        hint: "分镜脚本已通过浏览器直连接口生成；配图和视频需要启动本地 AIGC 代理。",
        storyboard
      });
      return;
    } catch (error) {
      renderAigcPanel({
        title: "浏览器直连分镜失败，已回退本地模拟",
        hint: error.message || String(error),
        storyboard: mockStoryboard()
      });
      state.aigc.storyboard = mockStoryboard();
      return;
    }
  }
  state.aigc.storyboard = mockStoryboard();
  renderAigcPanel({
    title: "旅行分镜（本地模拟）",
    hint: "在设置中启用浏览器直连分镜接口，或配置 .env 并启动 aigc-proxy 后可调用真实 API。",
    storyboard: state.aigc.storyboard
  });
}

async function generateAigcImages() {
  const context = collectDiaryAigcContext();
  if (!hasAigcProxyConfigured()) {
    renderAigcPanel({
      title: "配图需要本地 AIGC 代理",
      hint: hasBrowserAigcConfig()
        ? "你填写的浏览器 API Key 已可用于分镜脚本；分镜配图调用 DashScope 原生图像任务，需要运行 web/scripts/start-aigc.ps1 并在 .env 中配置 DASHSCOPE_API_KEY。"
        : "请先配置 DASHSCOPE_API_KEY 并启动 web/scripts/start-aigc.ps1。",
      storyboard: state.aigc.storyboard
    });
    return;
  }
  try {
    renderAigcLoading("万相正在逐帧生成配图（约 30–90 秒）…");
    const data = await callAigcApi("/api/aigc/images", {
      context,
      storyboard: state.aigc.storyboard
    });
    state.aigc.storyboard = data.storyboard;
    renderAigcPanel({
      title: "AI 分镜配图完成",
      hint: "图片由通义万相生成，可继续生成旅行短视频。",
      storyboard: data.storyboard,
      videoUrl: state.aigc.videoUrl
    });
  } catch (error) {
    renderAigcPanel({ title: "AI 生图失败", hint: error.message || String(error), storyboard: state.aigc.storyboard });
  }
}

async function generateAigcVideo() {
  const context = collectDiaryAigcContext();
  if (!hasAigcProxyConfigured()) {
    renderAigcPanel({
      title: "视频需要本地 AIGC 代理",
      hint: hasBrowserAigcConfig()
        ? "你填写的浏览器 API Key 已可用于分镜脚本；视频生成调用 DashScope 原生异步任务，需要运行 web/scripts/start-aigc.ps1 并在 .env 中配置 DASHSCOPE_API_KEY。"
        : "请先配置 DASHSCOPE_API_KEY 并启动 web/scripts/start-aigc.ps1。",
      storyboard: state.aigc.storyboard
    });
    return;
  }
  try {
    renderAigcLoading(`万相 ${state.aigc.videoModel || "视频模型"} 正在生成旅行视频（约 1–3 分钟）…`);
    const data = await callAigcApi("/api/aigc/video", {
      context,
      storyboard: state.aigc.storyboard
    });
    state.aigc.storyboard = data.storyboard || state.aigc.storyboard;
    state.aigc.videoUrl = data.video_url || "";
    renderAigcPanel({
      title: "AI 旅行视频已生成",
      hint: formatAigcVideoHint(data.audio_mode),
      storyboard: state.aigc.storyboard,
      videoUrl: state.aigc.videoUrl
    });
  } catch (error) {
    renderAigcPanel({ title: "AI 视频生成失败", hint: error.message || String(error), storyboard: state.aigc.storyboard });
  }
}

async function generateAigcPipeline() {
  const context = collectDiaryAigcContext();
  if (!context.title && !context.content && !context.destination) {
    renderAigcPanel({ title: "请先填写标题、目的地或正文", hint: "一键生成需要基础日记内容。" });
    return;
  }
  if (!hasAigcProxyConfigured()) {
    await generateAigcStoryboard({ useApi: hasBrowserAigcConfig() });
    renderAigcPanel({
      title: hasBrowserAigcConfig() ? "已生成分镜，配图/视频等待代理" : "未连接 API，仅展示本地模拟",
      hint: hasBrowserAigcConfig()
        ? "浏览器直连已完成分镜脚本；要一键生成配图和视频，请运行 web/scripts/start-aigc.ps1 并配置 DASHSCOPE_API_KEY。"
        : "配置浏览器直连可生成分镜；配置 .env 并启动代理后可一键生成脚本 + 配图 + 视频。",
      storyboard: state.aigc.storyboard
    });
    return;
  }
  try {
    renderAigcLoading("一键生成：分镜脚本 → 配图 → 短视频，请耐心等待…");
    const data = await callAigcApi("/api/aigc/pipeline", {
      context,
      withImages: true,
      withVideo: true
    });
    state.aigc.storyboard = data.storyboard;
    state.aigc.videoUrl = data.video_url || "";
    renderAigcPanel({
      title: data.storyboard?.title || "AI 旅行故事板",
      hint: data.audio_mode === "custom"
        ? "已完成脚本、配图与自定义音频视频。"
        : data.audio_mode === "auto"
          ? "已完成脚本、配图与有声短视频（自动配音）。"
          : "已完成脚本、配图与静音短视频。",
      storyboard: data.storyboard,
      videoUrl: state.aigc.videoUrl
    });
  } catch (error) {
    renderAigcPanel({ title: "一键生成失败", hint: error.message || String(error), storyboard: state.aigc.storyboard });
  }
}
