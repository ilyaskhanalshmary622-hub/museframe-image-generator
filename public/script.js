const accessGate = document.querySelector("#access-gate");
const appShell = document.querySelector("#app-shell");
const accessPasswordInput = document.querySelector("#access-password");
const unlockButton = document.querySelector("#unlock-site");
const gateMessage = document.querySelector("#gate-message");

const apiKeyInput = document.querySelector("#api-key");
const apiKeySettings = document.querySelector("#api-key-settings");
const saveKeyButton = document.querySelector("#save-key");
const saveKeySettings = document.querySelector("#save-key-settings");
const checkBalanceButton = document.querySelector("#check-balance");
const checkKeySettings = document.querySelector("#check-key-settings");
const balanceValue = document.querySelector("#balance-value");
const balanceDetail = document.querySelector("#balance-detail");
const keyStateTitle = document.querySelector("#key-state-title");
const keyStateDesc = document.querySelector("#key-state-desc");

const navItems = document.querySelectorAll("[data-nav]");
const navShortcuts = document.querySelectorAll("[data-nav-shortcut]");
const pagePanels = document.querySelectorAll("[data-page-panel]");
const heroEyebrow = document.querySelector("#hero-eyebrow");
const heroCopy = document.querySelector("#hero-copy");
const composerTitle = document.querySelector("#composer-title");
const composerSubtitle = document.querySelector("#composer-subtitle");
const modeLabel = document.querySelector("#mode-label");

const imageModeTabs = document.querySelector("#image-mode-tabs");
const videoModeTabs = document.querySelector("#video-mode-tabs");
const imageModeButtons = document.querySelectorAll("[data-image-mode]");
const videoModeButtons = document.querySelectorAll("[data-video-mode]");
const modelCards = document.querySelectorAll("[data-model-card]");

const modelInput = document.querySelector("#model");
const ratioInput = document.querySelector("#aspect-ratio");
const imageQualityInput = document.querySelector("#image-quality");
const imageCountInput = document.querySelector("#image-count");
const videoResolutionInput = document.querySelector("#video-resolution");
const videoDurationInput = document.querySelector("#video-duration");
const promptInput = document.querySelector("#prompt");
const generateButton = document.querySelector("#generate");
const clearButton = document.querySelector("#clear");
const message = document.querySelector("#message");
const stage = document.querySelector("#image-stage");
const downloadCurrentButton = document.querySelector("#download-image");

const imageFileInput = document.querySelector("#reference-file");
const dropZone = document.querySelector("#drop-zone");
const referenceList = document.querySelector("#reference-list");
const videoStartInput = document.querySelector("#video-start-frame");
const videoEndInput = document.querySelector("#video-end-frame");
const videoReferenceInput = document.querySelector("#video-reference-file");
const startFrameZone = document.querySelector("#start-frame-zone");
const endFrameZone = document.querySelector("#end-frame-zone");
const videoReferenceZone = document.querySelector("#video-reference-zone");
const startFrameList = document.querySelector("#start-frame-list");
const endFrameList = document.querySelector("#end-frame-list");
const videoReferenceList = document.querySelector("#video-reference-list");

const historyList = document.querySelector("#history-list");
const historyCount = document.querySelector("#history-count");
const clearHistoryButton = document.querySelector("#clear-history");
const assetList = document.querySelector("#asset-list");
const assetCount = document.querySelector("#asset-count");
const clearAssetsButton = document.querySelector("#clear-assets");
const downloadAssetsButton = document.querySelector("#download-assets");
const assetKindButtons = document.querySelectorAll("[data-asset-kind]");
const assetSourceButtons = document.querySelectorAll("[data-asset-source]");
const dashboardRecent = document.querySelector("#dashboard-recent");

const metricTotal = document.querySelector("#metric-total");
const metricImage = document.querySelector("#metric-image");
const metricVideo = document.querySelector("#metric-video");
const metricHistory = document.querySelector("#metric-history");

const ACCESS_PASSWORD = "8611";
const ACCESS_STORE = "museframe_access_ok";
const KEY_STORE = "museframe_user_api_key";
const HISTORY_STORE = "museframe_prompt_history_v3";
const ASSET_STORE = "museframe_assets_v4";
const ASSET_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const SUBMIT_WARN_MS = 45 * 1000;

const IMAGE_MODELS = [
  { value: "nano-banana-pro", label: "Nano Banana Pro" },
  { value: "nano-banana", label: "Nano Banana" },
  { value: "nano-banana-fast", label: "Nano Banana Fast" },
  { value: "nano-banana-2", label: "Nano Banana 2" },
  { value: "nano-banana-2-cl", label: "Nano Banana 2 CL" },
  { value: "nano-banana-2-2k-cl", label: "Nano Banana 2 2K CL" },
  { value: "nano-banana-2-4k-cl", label: "Nano Banana 2 4K CL" },
  { value: "nano-banana-pro-vt", label: "Nano Banana Pro VT" },
  { value: "nano-banana-pro-cl", label: "Nano Banana Pro CL" },
  { value: "nano-banana-pro-vip", label: "Nano Banana Pro VIP" },
  { value: "nano-banana-pro-4k-vip", label: "Nano Banana Pro 4K VIP" },
  { value: "gpt-image-2.5", label: "GPT Image 2.5" },
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-2-vip", label: "GPT Image 2 VIP" },
  { value: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare" },
  { value: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst" },
];

const VIDEO_MODELS = [
  { value: "minimax-h3", label: "MiniMax H3" },
];

const IMAGE_RATIOS = [
  { value: "1:1", label: "1:1 方图" },
  { value: "4:5", label: "4:5 商品图" },
  { value: "3:4", label: "3:4 竖图" },
  { value: "9:16", label: "9:16 竖屏" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "3:2", label: "3:2 横图" },
  { value: "2:3", label: "2:3 竖图" },
  { value: "21:9", label: "21:9 宽屏" },
];

const VIDEO_RATIOS = [
  { value: "9:16", label: "9:16 竖屏" },
  { value: "16:9", label: "16:9 横屏" },
];

let activeTool = "image";
let imageMode = "text";
let videoMode = "text";
let assetKindFilter = "all";
let assetSourceFilter = "all";
let imageRefs = [];
let startFrame = null;
let endFrame = null;
let videoRefs = [];
let currentResults = [];
let pendingPollTimers = [];

init();

function init() {
  bindAccess();
  bindNavigation();
  bindKeyControls();
  bindModeControls();
  bindUploads();
  bindActions();
  hydrateKey();
  setActiveTool("image");
  renderHistory();
  renderAssets();
  renderDashboard();
  syncServerAssets({ silent: true });
  window.setInterval(() => syncServerAssets({ silent: true }), 30000);
}

function bindAccess() {
  const alreadyUnlocked = localStorage.getItem(ACCESS_STORE) === "1";
  if (alreadyUnlocked) unlockApp();

  unlockButton.addEventListener("click", () => {
    if (accessPasswordInput.value.trim() === ACCESS_PASSWORD) {
      localStorage.setItem(ACCESS_STORE, "1");
      unlockApp();
      return;
    }
    gateMessage.textContent = "访问密码不正确。";
  });

  accessPasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockButton.click();
  });
}

function unlockApp() {
  accessGate.classList.add("hidden");
  appShell.classList.remove("locked");
}

function bindNavigation() {
  navItems.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.nav;
      if (target === "image" || target === "video") {
        setActiveTool(target);
        showPage("studio");
        setNavActive(target);
        return;
      }
      showPage(target);
      setNavActive(target);
    });
  });

  navShortcuts.forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.navShortcut);
      setNavActive(button.dataset.navShortcut);
    });
  });
}

function showPage(pageName) {
  pagePanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.pagePanel === pageName);
  });
  renderDashboard();
  renderAssets();
}

function setNavActive(name) {
  navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === name);
  });
}

function setActiveTool(tool) {
  activeTool = tool;
  const isImage = activeTool === "image";
  document.querySelectorAll(".image-only").forEach((node) => node.classList.toggle("hidden", !isImage));
  document.querySelectorAll(".video-only").forEach((node) => node.classList.toggle("hidden", isImage));
  imageModeTabs.classList.toggle("hidden", !isImage);
  videoModeTabs.classList.toggle("hidden", isImage);

  heroEyebrow.textContent = isImage ? "AI IMAGE STUDIO" : "AI VIDEO STUDIO";
  heroCopy.textContent = isImage
    ? "输入提示词生成商品图；上传参考图后可以做图生图、产品主图、场景图、广告素材和包装视觉。"
    : "输入视频脚本或上传首帧、尾帧、多图参考，生成短视频素材，适合广告短片、产品展示和剧情钩子测试。";
  composerTitle.textContent = isImage ? "AI 生图" : "AI 生视频";
  composerSubtitle.textContent = isImage
    ? "文生图 / 图生图，结果自动存入作品库。"
    : "文生视频 / 图生视频，异步生成，完成后自动进入作品库。";
  generateButton.textContent = isImage ? "生成图片" : "生成视频";
  promptInput.placeholder = isImage
    ? "例如：高级米白色收纳盒产品主图，柔和自然光，干净背景，真实材质，商业摄影质感"
    : "例如：镜头缓慢推进，家庭厨房里产品一秒救场，人物表情从怀疑到震惊，真实广告质感";

  populateModelOptions(isImage ? IMAGE_MODELS : VIDEO_MODELS);
  populateRatioOptions(isImage ? IMAGE_RATIOS : VIDEO_RATIOS);
  syncModeVisibility();
  syncModelCards();
  syncVideoDurationLimit();
  resetStage();
}

function populateModelOptions(models) {
  modelInput.innerHTML = models.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  modelInput.value = activeTool === "image" ? "nano-banana-pro" : "minimax-h3";
}

function populateRatioOptions(ratios) {
  ratioInput.innerHTML = ratios.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  ratioInput.value = activeTool === "image" ? "1:1" : "9:16";
}

function syncVideoDurationLimit({ notify = false } = {}) {
  if (!videoResolutionInput || !videoDurationInput) return;
  const is1080p = videoResolutionInput.value === "1080p";
  const currentDuration = Number(videoDurationInput.value || 0);

  [...videoDurationInput.options].forEach((option) => {
    const seconds = Number(option.value);
    option.disabled = is1080p && seconds > 10;
    option.hidden = is1080p && seconds > 10;
  });

  if (is1080p && currentDuration > 10) {
    videoDurationInput.value = "10";
    if (notify) {
      setMessage("MiniMax H3 的 1080p 最高支持 10 秒；480p/768p 可选择 15 秒。", "error");
    }
  }
}

function bindKeyControls() {
  saveKeyButton.addEventListener("click", saveApiKey);
  saveKeySettings.addEventListener("click", () => {
    apiKeyInput.value = apiKeySettings.value;
    saveApiKey();
  });
  checkBalanceButton.addEventListener("click", checkKey);
  checkKeySettings.addEventListener("click", () => {
    apiKeyInput.value = apiKeySettings.value;
    checkKey();
  });
  apiKeyInput.addEventListener("input", () => {
    apiKeySettings.value = apiKeyInput.value;
  });
  apiKeySettings.addEventListener("input", () => {
    apiKeyInput.value = apiKeySettings.value;
  });
}

function hydrateKey() {
  const savedKey = localStorage.getItem(KEY_STORE) || "";
  apiKeyInput.value = savedKey;
  apiKeySettings.value = savedKey;
  updateKeyState(savedKey);
  if (savedKey) syncServerAssets({ silent: true });
}

function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setMessage("请先输入 Grsai API Key。", "error");
    return;
  }
  localStorage.setItem(KEY_STORE, key);
  updateKeyState(key);
  setMessage("API Key 已保存到当前浏览器。", "ok");
  syncServerAssets({ silent: true });
}

function updateKeyState(key) {
  if (!key) {
    balanceValue.textContent = "未设置 Key";
    balanceDetail.textContent = "每个用户输入自己的 Grsai API Key，仅保存在当前浏览器。";
    keyStateTitle.textContent = "未设置 Key";
    keyStateDesc.textContent = "在顶部输入自己的 Grsai API Key，保存后即可生成。";
    return;
  }
  balanceValue.textContent = "Key 已保存";
  balanceDetail.textContent = maskKey(key);
  keyStateTitle.textContent = "Key 已保存";
  keyStateDesc.textContent = maskKey(key);
}

async function checkKey() {
  const key = apiKeyInput.value.trim() || localStorage.getItem(KEY_STORE) || "";
  if (!key) {
    setMessage("请先输入 Grsai API Key。", "error");
    return;
  }
  try {
    const form = new FormData();
    form.append("apiKey", key);
    const data = await fetchJson("/api/balance", { method: "POST", body: form });
    localStorage.setItem(KEY_STORE, key);
    updateKeyState(key);
    setMessage(data.detail || "Key 可用。", "ok");
  } catch (error) {
    setMessage(`检测失败：${friendlyError(error)}`, "error");
  }
}

function bindModeControls() {
  imageModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      imageMode = button.dataset.imageMode;
      imageModeButtons.forEach((item) => item.classList.toggle("active", item === button));
      syncModeVisibility();
    });
  });

  videoModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      videoMode = button.dataset.videoMode;
      videoModeButtons.forEach((item) => item.classList.toggle("active", item === button));
      syncModeVisibility();
    });
  });

  modelCards.forEach((card) => {
    card.addEventListener("click", () => {
      const model = card.dataset.modelCard;
      if ([...modelInput.options].some((option) => option.value === model)) {
        modelInput.value = model;
        syncModelCards();
      }
    });
  });
  modelInput.addEventListener("change", syncModelCards);
  videoResolutionInput.addEventListener("change", () => syncVideoDurationLimit({ notify: true }));
  videoDurationInput.addEventListener("change", () => syncVideoDurationLimit({ notify: true }));
}

function syncModeVisibility() {
  const isImage = activeTool === "image";
  const mode = isImage ? imageMode : videoMode;
  const isReference = mode === "reference";
  document.querySelectorAll(".image-only").forEach((node) => node.classList.toggle("hidden", !isImage));
  document.querySelectorAll(".video-only").forEach((node) => node.classList.toggle("hidden", isImage));
  document.querySelectorAll(".drop-zone.image-only").forEach((node) => node.classList.toggle("hidden", !isImage || !isReference));
  document.querySelectorAll(".video-frames.video-only").forEach((node) => node.classList.toggle("hidden", isImage || !isReference));
  referenceList.classList.toggle("hidden", !isImage || !isReference);
  startFrameList.classList.toggle("hidden", isImage || !isReference);
  endFrameList.classList.toggle("hidden", isImage || !isReference);
  videoReferenceList.classList.toggle("hidden", isImage || !isReference);
  modeLabel.textContent = `${mode === "text" ? "文生" : "图生"}${isImage ? "图" : "视频"}模式`;
}

function syncModelCards() {
  modelCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.modelCard === modelInput.value);
  });
}

function bindUploads() {
  dropZone.addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", async () => {
    imageRefs = await appendFileItems(imageRefs, [...imageFileInput.files], 8);
    imageFileInput.value = "";
    renderReferenceList();
  });
  bindDrop(dropZone, async (files) => {
    imageRefs = await appendFileItems(imageRefs, files, 8);
    renderReferenceList();
  });

  startFrameZone.addEventListener("click", () => videoStartInput.click());
  endFrameZone.addEventListener("click", () => videoEndInput.click());
  videoReferenceZone.addEventListener("click", () => videoReferenceInput.click());
  videoStartInput.addEventListener("change", async () => {
    [startFrame] = await filesToItems([...videoStartInput.files].slice(0, 1));
    videoStartInput.value = "";
    renderVideoFrames();
  });
  videoEndInput.addEventListener("change", async () => {
    [endFrame] = await filesToItems([...videoEndInput.files].slice(0, 1));
    videoEndInput.value = "";
    renderVideoFrames();
  });
  videoReferenceInput.addEventListener("change", async () => {
    videoRefs = await appendFileItems(videoRefs, [...videoReferenceInput.files], 6);
    videoReferenceInput.value = "";
    renderVideoFrames();
  });
  bindDrop(startFrameZone, async (files) => {
    [startFrame] = await filesToItems(files.slice(0, 1));
    renderVideoFrames();
  });
  bindDrop(endFrameZone, async (files) => {
    [endFrame] = await filesToItems(files.slice(0, 1));
    renderVideoFrames();
  });
  bindDrop(videoReferenceZone, async (files) => {
    videoRefs = await appendFileItems(videoRefs, files, 6);
    renderVideoFrames();
  });
}

function bindDrop(zone, onFiles) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("dragover");
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
    if (files.length) await onFiles(files);
  });
}

function bindActions() {
  generateButton.addEventListener("click", generate);
  clearButton.addEventListener("click", clearCurrentInputs);
  downloadCurrentButton.addEventListener("click", downloadCurrent);
  clearHistoryButton.addEventListener("click", clearHistory);
  clearAssetsButton.addEventListener("click", clearAssets);
  downloadAssetsButton.addEventListener("click", downloadAllAssets);
  assetKindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      assetKindFilter = button.dataset.assetKind;
      assetKindButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderAssets();
    });
  });
  assetSourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      assetSourceFilter = button.dataset.assetSource;
      assetSourceButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderAssets();
    });
  });
}

async function generate() {
  const key = apiKeyInput.value.trim() || localStorage.getItem(KEY_STORE) || "";
  const prompt = promptInput.value.trim();
  if (!key) {
    setMessage("请先输入并保存 Grsai API Key。", "error");
    return;
  }
  if (!prompt) {
    setMessage("先输入提示词。", "error");
    return;
  }

  const refs = getActiveFiles();
  if (activeTool === "image" && imageMode === "reference" && refs.length === 0) {
    setMessage("图生图模式需要先上传参考图。", "error");
    return;
  }
  if (activeTool === "video" && videoMode === "reference" && refs.length === 0) {
    setMessage("图生视频模式建议至少上传首帧、尾帧或参考图。", "error");
    return;
  }

  localStorage.setItem(KEY_STORE, key);
  updateKeyState(key);
  syncVideoDurationLimit({ notify: true });
  clearPendingPolls();
  currentResults = [];
  generateButton.disabled = true;
  let submitWarnTimer = null;
  setLoading(
    activeTool === "image" ? "正在提交生图任务" : "正在提交视频任务",
    "正在把提示词和参考图发送给 Grsai，先等待接口返回任务 ID。"
  );
  setMessage("任务正在提交，先不要关闭页面。", "ok");

  try {
    submitWarnTimer = window.setTimeout(() => {
      setLoading(
        "接口还在提交任务",
        "还没拿到任务 ID。常见原因：视频排队、参考图过大、接口响应慢或 Key 额度异常。建议继续等 1-2 分钟。"
      );
      setMessage("还在等待 Grsai 返回任务 ID，不是浏览器卡死。", "ok");
    }, SUBMIT_WARN_MS);

    const form = new FormData();
    form.append("apiKey", key);
    form.append("mediaType", activeTool);
    form.append("mode", activeTool === "image" ? imageMode : videoMode);
    form.append("model", modelInput.value);
    form.append("prompt", prompt);
    form.append("aspectRatio", ratioInput.value);
    form.append("imageQuality", imageQualityInput.value);
    form.append("count", activeTool === "image" ? imageCountInput.value : "1");
    form.append("resolution", videoResolutionInput.value);
    form.append("duration", videoDurationInput.value);
    if (activeTool === "video") {
      form.append("hasStartFrame", startFrame ? "1" : "");
      form.append("hasEndFrame", endFrame ? "1" : "");
      form.append("videoReferenceCount", String(videoRefs.length));
      form.append("fileRoles", JSON.stringify(getActiveFileRoles()));
    }
    refs.forEach((item) => form.append("files", item.file, item.file.name));

    const data = await fetchJson("/api/generate", { method: "POST", body: form });
    window.clearTimeout(submitWarnTimer);
    savePrompt(prompt, data);
    await handleGenerateResponse(data, prompt);
  } catch (error) {
    window.clearTimeout(submitWarnTimer);
    resetStage("暂未生成成功", friendlyError(error));
    setMessage(`生成失败：${friendlyError(error)}`, "error");
  } finally {
    generateButton.disabled = false;
  }
}

async function handleGenerateResponse(data, prompt) {
  const mediaType = data.mediaType || activeTool;
  if (Array.isArray(data.images) && data.images.length) {
    finishResults(data.images.map((url) => ({ url, mediaType: "image" })), prompt);
    return;
  }
  if (data.imageUrl || data.videoUrl || data.url) {
    const url = data.imageUrl || data.videoUrl || data.url;
    finishResults([{ url, mediaType: inferMediaType(url, mediaType) }], prompt);
    return;
  }
  if (Array.isArray(data.tasks) && data.tasks.length) {
    registerPendingTasks(data.tasks, prompt, mediaType);
    pollTasks(data.tasks, prompt, mediaType).catch((error) => {
      setMessage(`任务仍在后台生成：${friendlyError(error)}`, "ok");
      syncServerAssets({ silent: true });
    });
    return;
  }
  if (data.taskId || data.id) {
    const tasks = [{ taskId: data.taskId || data.id }];
    registerPendingTasks(tasks, prompt, mediaType);
    pollTasks(tasks, prompt, mediaType).catch((error) => {
      setMessage(`任务仍在后台生成：${friendlyError(error)}`, "ok");
      syncServerAssets({ silent: true });
    });
    return;
  }
  throw new Error(JSON.stringify(data));
}

async function pollTasks(tasks, prompt, mediaType) {
  const started = Date.now();
  let completed = [];
  setLoading(
    `${tasks.length} 个任务生成中`,
    "已经拿到任务 ID，正在每 4 秒查询生成结果。视频通常比图片更慢。"
  );
  setMessage("已拿到任务 ID，正在轮询生成结果。", "ok");

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const checks = await Promise.all(tasks.map((task) => fetchTask(task.taskId || task.id)));
    completed = checks
      .map((item) => normalizeTaskResult(item, mediaType))
      .filter(Boolean);
    const progressInfo = checks.map((item) => item?.progress).filter((item) => item !== undefined && item !== null);
    updateLoadingProgress(completed.length, tasks.length, progressInfo);
    if (completed.length >= tasks.length) {
      finishResults(completed, prompt);
      return;
    }
  }
  markTasksRunning(tasks, prompt, mediaType);
  setLoading(
    "任务仍在后台生成",
    "任务已保存到作品库。视频或高规格图片可能需要更久，稍后打开作品库会继续同步。"
  );
  setMessage("任务还在后台生成，已保存到作品库；稍后回来也能继续查看。", "ok");
}

async function fetchTask(taskId) {
  if (!taskId) return null;
  const key = apiKeyInput.value.trim() || localStorage.getItem(KEY_STORE) || "";
  return fetchJson(`/api/result?id=${encodeURIComponent(taskId)}`, {
    headers: { "X-Image-Api-Key": key },
  });
}

function normalizeTaskResult(data, mediaType) {
  if (!data) return null;
  const status = `${data.status || ""}`.toLowerCase();
  const url = data.imageUrl || data.videoUrl || data.url || firstResultUrl(data);
  if (url) {
    return {
      id: data.taskId || data.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
      taskId: data.taskId || data.id || "",
      url,
      mediaType: inferMediaType(url, mediaType),
      status: "success",
    };
  }
  if (status === "failed" || status === "error") {
    throw new Error(data.error || JSON.stringify(data));
  }
  return null;
}

function firstResultUrl(data) {
  if (!Array.isArray(data.results)) return "";
  const found = data.results.find((item) => item.url || item.imageUrl || item.videoUrl);
  return found ? found.url || found.imageUrl || found.videoUrl : "";
}

function finishResults(results, prompt) {
  currentResults = results;
  renderCurrentResults(results);
  saveAssetBatch(results, prompt);
  setMessage(`生成成功，已保存 ${results.length} 个作品到作品库。`, "ok");
  renderAssets();
  renderDashboard();
  syncServerAssets({ silent: true });
}

function registerPendingTasks(tasks, prompt, mediaType) {
  const now = Date.now();
  const assets = getAssets();
  tasks.forEach((task, index) => {
    const taskId = task.taskId || task.id || "";
    const id = taskId || (crypto.randomUUID ? crypto.randomUUID() : `${now}-${index}`);
    upsertLocalAsset(assets, {
      id,
      taskId,
      mediaType,
      prompt,
      model: modelInput.value,
      ratio: ratioInput.value,
      mode: activeTool === "image" ? imageMode : videoMode,
      status: "running",
      createdAt: now,
      updatedAt: now,
    });
  });
  localStorage.setItem(ASSET_STORE, JSON.stringify(pruneAssets(assets).slice(0, 200)));
  renderAssets();
  renderDashboard();
  setMessage("任务已提交，已保存到作品库，生成完成后会自动同步。", "ok");
}

function markTasksRunning(tasks, prompt, mediaType) {
  registerPendingTasks(tasks, prompt, mediaType);
}

async function syncServerAssets({ silent = false } = {}) {
  const key = apiKeyInput.value.trim() || localStorage.getItem(KEY_STORE) || "";
  if (!key) return;
  try {
    const data = await fetchJson("/api/assets", {
      headers: { "X-Image-Api-Key": key },
    });
    mergeServerAssets(data.assets || []);
    renderAssets();
    renderDashboard();
    if (!silent) setMessage("作品库已同步。", "ok");
  } catch (error) {
    if (!silent) setMessage(`同步作品库失败：${friendlyError(error)}`, "error");
  }
}

function mergeServerAssets(serverAssets) {
  if (!Array.isArray(serverAssets) || !serverAssets.length) return;
  const assets = getAssets();
  serverAssets.forEach((item) => {
    upsertLocalAsset(assets, {
      id: item.id || item.taskId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
      taskId: item.taskId || "",
      url: item.url || "",
      mediaType: item.mediaType || inferMediaType(item.url, "image"),
      prompt: item.prompt || "",
      model: item.model || "",
      ratio: item.ratio || "",
      mode: item.mode || "",
      status: item.status || (item.url ? "success" : "running"),
      progress: item.progress,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
      lastError: item.lastError || "",
    });
  });
  localStorage.setItem(ASSET_STORE, JSON.stringify(pruneAssets(assets).slice(0, 200)));
}

function upsertLocalAsset(assets, next) {
  const index = assets.findIndex((item) => {
    const sameTask = next.taskId && item.taskId === next.taskId;
    const sameId = next.id && item.id === next.id;
    return sameTask || sameId;
  });
  if (index >= 0) {
    assets[index] = { ...assets[index], ...next };
    return;
  }
  assets.unshift(next);
}

function renderCurrentResults(results) {
  if (!results.length) {
    resetStage();
    return;
  }
  const gridClass = results.length > 1 ? "result-grid" : "";
  stage.innerHTML = `<div class="${gridClass}">${results.map(renderResultMedia).join("")}</div>`;
  downloadCurrentButton.disabled = false;
}

function renderResultMedia(item) {
  if (item.mediaType === "video") {
    return `<video src="${escapeAttr(item.url)}" controls playsinline></video>`;
  }
  return `<img src="${escapeAttr(item.url)}" alt="MuseFrame generated result">`;
}

function getActiveFiles() {
  if (activeTool === "image") return imageMode === "reference" ? imageRefs : [];
  if (videoMode !== "reference") return [];
  return [startFrame, endFrame, ...videoRefs].filter(Boolean);
}

function getActiveFileRoles() {
  if (activeTool === "image") return imageRefs.map((_, index) => `image_reference_${index + 1}`);
  if (videoMode !== "reference") return [];
  const roles = [];
  if (startFrame) roles.push("start_frame");
  if (endFrame) roles.push("end_frame");
  videoRefs.forEach((_, index) => roles.push(`video_reference_${index + 1}`));
  return roles;
}

function clearCurrentInputs() {
  promptInput.value = "";
  imageRefs = [];
  startFrame = null;
  endFrame = null;
  videoRefs = [];
  imageFileInput.value = "";
  videoStartInput.value = "";
  videoEndInput.value = "";
  videoReferenceInput.value = "";
  renderReferenceList();
  renderVideoFrames();
  resetStage();
  setMessage("已清空当前输入。", "ok");
}

function setLoading(title, detail = "正在提交任务，请保持页面打开。") {
  stage.innerHTML = `
    <div class="empty-state">
      <div class="loader"></div>
      <h3>${escapeHtml(title)}</h3>
      <p id="loading-progress">正在提交任务，请保持页面打开。</p>
    </div>
  `;
  const progressNode = document.querySelector("#loading-progress");
  if (progressNode) progressNode.textContent = detail;
  downloadCurrentButton.disabled = true;
}

function updateLoadingProgress(done, total, progressInfo = []) {
  const node = document.querySelector("#loading-progress");
  if (node) {
    const progressText = progressInfo.length ? `，进度：${progressInfo.join(" / ")}` : "";
    node.textContent = `已完成 ${done}/${total}${progressText}，正在等待剩余任务。`;
    return;
  }
  if (node) node.textContent = `已完成 ${done}/${total}，正在等待剩余任务。`;
}

function resetStage(title = "等待生成", detail = "输入提示词，或拖入参考图后生成。") {
  stage.innerHTML = `
    <div class="empty-state">
      <span>✦</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
  currentResults = [];
  downloadCurrentButton.disabled = true;
}

function renderReferenceList() {
  referenceList.innerHTML = imageRefs.map((item, index) => refCard(item, `remove-image-ref="${index}"`, `@参考${index + 1}`)).join("");
  referenceList.querySelectorAll("[remove-image-ref]").forEach((button) => {
    button.addEventListener("click", () => {
      imageRefs.splice(Number(button.getAttribute("remove-image-ref")), 1);
      renderReferenceList();
    });
  });
}

function renderVideoFrames() {
  startFrameList.innerHTML = startFrame ? refCard(startFrame, "remove-start-frame", "@首帧") : "";
  endFrameList.innerHTML = endFrame ? refCard(endFrame, "remove-end-frame", "@尾帧") : "";
  videoReferenceList.innerHTML = videoRefs.map((item, index) => refCard(item, `remove-video-ref="${index}"`, `@参考${index + 1}`)).join("");
  startFrameList.querySelector("[remove-start-frame]")?.addEventListener("click", () => {
    startFrame = null;
    renderVideoFrames();
  });
  endFrameList.querySelector("[remove-end-frame]")?.addEventListener("click", () => {
    endFrame = null;
    renderVideoFrames();
  });
  videoReferenceList.querySelectorAll("[remove-video-ref]").forEach((button) => {
    button.addEventListener("click", () => {
      videoRefs.splice(Number(button.getAttribute("remove-video-ref")), 1);
      renderVideoFrames();
    });
  });
}

function refCard(item, removeAttr, label = "") {
  return `
    <div class="ref-card">
      <img src="${escapeAttr(item.dataUrl)}" alt="">
      ${label ? `<span class="ref-label">${escapeHtml(label)}</span>` : ""}
      <button type="button" ${removeAttr}>×</button>
    </div>
  `;
}

async function appendFileItems(currentItems, files, max) {
  const available = Math.max(0, max - currentItems.length);
  if (!available) return currentItems;
  const nextItems = await filesToItems(files.slice(0, available));
  return [...currentItems, ...nextItems].slice(0, max);
}

async function filesToItems(files) {
  const items = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    items.push({ file, dataUrl: await fileToDataUrl(file) });
  }
  return items;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.error || `接口返回 ${response.status}`);
  }
  return data;
}

function savePrompt(prompt, data) {
  const list = getHistory();
  list.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    prompt,
    tool: activeTool,
    mode: activeTool === "image" ? imageMode : videoMode,
    model: modelInput.value,
    ratio: ratioInput.value,
    createdAt: Date.now(),
    task: data.taskId || data.id || "",
  });
  localStorage.setItem(HISTORY_STORE, JSON.stringify(list.slice(0, 24)));
  renderHistory();
  renderDashboard();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORE)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const list = getHistory();
  historyCount.textContent = list.length;
  metricHistory.textContent = list.length;
  if (!list.length) {
    historyList.innerHTML = `<div class="history-item"><p>暂无记录，生成一次后会自动保存提示词。</p></div>`;
    return;
  }
  historyList.innerHTML = list.map((item) => `
    <article class="history-item">
      <strong>${item.tool === "video" ? "视频" : "图片"} · ${escapeHtml(item.model)} · ${escapeHtml(item.ratio)}</strong>
      <p>${escapeHtml(item.prompt)}</p>
      <button class="ghost" type="button" data-reuse-prompt="${escapeAttr(item.id)}">复用提示词</button>
    </article>
  `).join("");
  historyList.querySelectorAll("[data-reuse-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = getHistory().find((entry) => entry.id === button.dataset.reusePrompt);
      if (item) promptInput.value = item.prompt;
    });
  });
}

function clearHistory() {
  localStorage.removeItem(HISTORY_STORE);
  renderHistory();
  renderDashboard();
}

function saveAssetBatch(results, prompt) {
  const now = Date.now();
  const assets = getAssets();
  results.forEach((item, index) => {
    upsertLocalAsset(assets, {
      id: item.id || item.taskId || (crypto.randomUUID ? crypto.randomUUID() : `${now}-${index}`),
      taskId: item.taskId || "",
      url: item.url,
      mediaType: item.mediaType || inferMediaType(item.url, activeTool),
      prompt,
      model: modelInput.value,
      ratio: ratioInput.value,
      mode: activeTool === "image" ? imageMode : videoMode,
      status: "success",
      createdAt: now,
    });
  });
  localStorage.setItem(ASSET_STORE, JSON.stringify(pruneAssets(assets).slice(0, 200)));
}

function getAssets() {
  try {
    return pruneAssets(JSON.parse(localStorage.getItem(ASSET_STORE)) || []);
  } catch {
    return [];
  }
}

function pruneAssets(assets) {
  const cutoff = Date.now() - ASSET_TTL_MS;
  return assets.filter((item) => (item.createdAt || 0) >= cutoff);
}

function filteredAssets() {
  return getAssets().filter((item) => {
    if (assetKindFilter !== "all" && item.mediaType !== assetKindFilter) return false;
    if (assetSourceFilter !== "all" && item.mode !== assetSourceFilter) return false;
    return true;
  });
}

function renderAssets() {
  const assets = filteredAssets();
  const allAssets = getAssets();
  assetCount.textContent = `${assets.length} / ${allAssets.length} 条记录`;
  localStorage.setItem(ASSET_STORE, JSON.stringify(allAssets));
  if (!assets.length) {
    assetList.classList.add("empty");
    assetList.innerHTML = "当前筛选条件下暂无作品。";
    return;
  }
  assetList.classList.remove("empty");
  assetList.innerHTML = assets.map((item) => `
    <article class="asset-card">
      <div class="asset-thumb">${renderAssetMedia(item)}</div>
      <h3>${item.mediaType === "video" ? "视频资产" : "图片资产"} · ${escapeHtml(item.model)}</h3>
      <p>${escapeHtml(item.prompt || "")}</p>
      <div class="asset-meta">
        <span>${item.mode === "reference" ? "图生" : "文生"} · ${escapeHtml(item.ratio || "")}</span>
        <span>${statusLabel(item.status)} · ${formatDate(item.createdAt)}</span>
      </div>
      <div class="asset-actions">
        <button class="ghost" type="button" data-preview-asset="${escapeAttr(item.id)}" ${item.url ? "" : "disabled"}>预览</button>
        <button class="ghost" type="button" data-download-asset="${escapeAttr(item.id)}" ${item.url ? "" : "disabled"}>下载</button>
      </div>
    </article>
  `).join("");
  assetList.querySelectorAll("[data-preview-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = getAssets().find((entry) => entry.id === button.dataset.previewAsset);
      if (item) {
        setActiveTool(item.mediaType === "video" ? "video" : "image");
        showPage("studio");
        setNavActive(item.mediaType === "video" ? "video" : "image");
        currentResults = [item];
        renderCurrentResults([item]);
      }
    });
  });
  assetList.querySelectorAll("[data-download-asset]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = getAssets().find((entry) => entry.id === button.dataset.downloadAsset);
      if (item?.url) await downloadOne(item.url, filenameForAsset(item));
    });
  });
}

function renderAssetMedia(item) {
  if (item.url) return renderResultMedia(item);
  return `
    <div class="asset-placeholder">
      <strong>${statusLabel(item.status)}</strong>
      <span>${item.taskId ? `任务 ID：${escapeHtml(item.taskId.slice(0, 10))}` : "等待接口返回结果"}</span>
      ${item.lastError ? `<small>${escapeHtml(item.lastError)}</small>` : ""}
    </div>
  `;
}

function statusLabel(status) {
  if (status === "success" || status === "succeeded") return "已完成";
  if (status === "failed" || status === "error") return "生成失败";
  return "生成中";
}

function renderDashboard() {
  const assets = getAssets();
  const images = assets.filter((item) => item.mediaType === "image").length;
  const videos = assets.filter((item) => item.mediaType === "video").length;
  metricTotal.textContent = assets.length;
  metricImage.textContent = images;
  metricVideo.textContent = videos;
  metricHistory.textContent = getHistory().length;
  const recent = assets.slice(0, 6);
  if (!recent.length) {
    dashboardRecent.classList.add("empty");
    dashboardRecent.innerHTML = "暂无生成作品。";
    return;
  }
  dashboardRecent.classList.remove("empty");
  dashboardRecent.innerHTML = recent.map((item) => `
    <article class="asset-card">
      <div class="asset-thumb">${renderAssetMedia(item)}</div>
      <h3>${item.mediaType === "video" ? "视频" : "图片"} · ${escapeHtml(item.model)}</h3>
    </article>
  `).join("");
}

async function clearAssets() {
  const key = apiKeyInput.value.trim() || localStorage.getItem(KEY_STORE) || "";
  if (key) {
    try {
      await fetchJson("/api/assets/clear", {
        method: "POST",
        headers: { "X-Image-Api-Key": key },
      });
    } catch (error) {
      setMessage(`清空后端作品库失败：${friendlyError(error)}`, "error");
    }
  }
  localStorage.removeItem(ASSET_STORE);
  renderAssets();
  renderDashboard();
}

async function downloadCurrent() {
  if (!currentResults.length) return;
  if (currentResults.length === 1) {
    await downloadOne(currentResults[0].url, filenameForAsset(currentResults[0]));
    return;
  }
  await downloadUrls(currentResults.map((item) => item.url), "museframe-current");
}

async function downloadAllAssets() {
  const assets = filteredAssets().filter((item) => item.url);
  if (!assets.length) {
    setMessage("当前没有可下载的资产。", "error");
    return;
  }
  await downloadUrls(assets.map((item) => item.url), "museframe-assets");
}

async function downloadUrls(urls, label) {
  for (let index = 0; index < urls.length; index += 1) {
    await downloadOne(urls[index], `${label}-${index + 1}`);
    await sleep(250);
  }
}

async function downloadOne(url, filename) {
  try {
    const response = await fetch(downloadHref(url, filename));
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `下载接口返回 ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    setMessage("下载已开始。", "ok");
  } catch (error) {
    setMessage(`下载失败：${friendlyError(error)}`, "error");
  }
}

function downloadHref(url, filename) {
  return `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
}

function filenameForAsset(item) {
  const ext = item.mediaType === "video" ? "mp4" : "png";
  return `museframe-${item.mediaType || "asset"}-${Date.now()}.${ext}`;
}

function inferMediaType(url, fallback = "image") {
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url || "")) return "video";
  return fallback === "video" ? "video" : "image";
}

function clearPendingPolls() {
  pendingPollTimers.forEach((timer) => clearTimeout(timer));
  pendingPollTimers = [];
}

function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    pendingPollTimers.push(timer);
  });
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function friendlyError(error) {
  const text = error?.message || String(error);
  if (text === "Failed to fetch") return "浏览器没有连上后端，请确认打开的是 MuseFrame 正式网址并刷新页面。";
  if (text.includes("insufficient credits")) return "当前 Key 积分不足，请更换 Key 或充值。";
  if (text.includes("apikey")) return "API Key 无效或余额不足，请检查 Key。";
  return text;
}

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 12) return "已保存";
  return `${key.slice(0, 5)}...${key.slice(-6)}`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
