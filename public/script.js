const accessGate = document.querySelector("#access-gate");
const appShell = document.querySelector("#app-shell");
const accessPasswordInput = document.querySelector("#access-password");
const unlockButton = document.querySelector("#unlock-site");
const gateMessage = document.querySelector("#gate-message");
const apiKeyInput = document.querySelector("#api-key");
const saveKeyButton = document.querySelector("#save-key");
const checkBalanceButton = document.querySelector("#check-balance");
const balanceValue = document.querySelector("#balance-value");
const balanceDetail = document.querySelector("#balance-detail");
const toolTabs = document.querySelectorAll(".tool-tab");
const heroEyebrow = document.querySelector("#hero-eyebrow");
const heroCopy = document.querySelector("#hero-copy");
const fileInput = document.querySelector("#reference-file");
const dropZone = document.querySelector("#drop-zone");
const referenceList = document.querySelector("#reference-list");
const uploadPlaceholder = document.querySelector("#upload-placeholder");
const uploadTitle = document.querySelector("#upload-title");
const uploadDesc = document.querySelector("#upload-desc");
const modelInput = document.querySelector("#model");
const aspectRatioInput = document.querySelector("#aspect-ratio");
const imageCountInput = document.querySelector("#image-count");
const videoResolutionInput = document.querySelector("#video-resolution");
const videoDurationInput = document.querySelector("#video-duration");
const promptInput = document.querySelector("#prompt");
const generateButton = document.querySelector("#generate");
const clearButton = document.querySelector("#clear");
const clearHistoryButton = document.querySelector("#clear-history");
const downloadButton = document.querySelector("#download-image");
const downloadAssetsButton = document.querySelector("#download-assets");
const clearAssetsButton = document.querySelector("#clear-assets");
const assetCount = document.querySelector("#asset-count");
const imageStage = document.querySelector("#image-stage");
const message = document.querySelector("#message");
const modeLabel = document.querySelector("#mode-label");
const historyList = document.querySelector("#history-list");
const assetList = document.querySelector("#asset-list");

const KEY_STORE = "museframe-api-key";
const HISTORY_STORE = "museframe-history";
const ASSET_STORE = "museframe-assets";
const ACCESS_STORE = "museframe-access-ok";
const ACCESS_PASSWORD = "8611";
const MAX_REFERENCE_FILES = 8;
const ASSET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let referenceFiles = [];
let currentImageUrls = [];
let activeTool = "image";

const IMAGE_MODELS = [
  ["gpt-image-2.5", "gpt-image-2.5"],
  ["gpt-image-2", "gpt-image-2"],
  ["gpt-image-2-vip", "gpt-image-2-vip"],
  ["gpt-image-2.5-flare", "gpt-image-2.5-flare"],
  ["gpt-image-2.5-sunburst", "gpt-image-2.5-sunburst"],
];

const VIDEO_MODELS = [
  ["minimax-h3", "minimax-h3"],
];

const IMAGE_RATIOS = [
  ["1024x1024", "1:1 方图"],
  ["1280x720", "16:9 横版"],
  ["720x1280", "9:16 竖版"],
  ["1152x864", "4:3 横版"],
  ["864x1152", "3:4 竖版"],
  ["1536x1024", "3:2 横版"],
  ["1024x1536", "2:3 竖版"],
  ["1120x896", "5:4 横版"],
  ["896x1120", "4:5 竖版"],
  ["1920x832", "21:9 超宽"],
  ["832x1920", "9:21 长竖"],
];

const VIDEO_RATIOS = [
  ["portrait", "9:16 竖屏"],
  ["landscape", "16:9 横屏"],
];

init();

function init() {
  initGate();

  const savedKey = localStorage.getItem(KEY_STORE) || "";
  if (savedKey) {
    apiKeyInput.value = savedKey;
    setBalance("Key 已保存", maskKey(savedKey));
  }

  saveKeyButton.addEventListener("click", saveKey);
  checkBalanceButton.addEventListener("click", checkBalance);
  generateButton.addEventListener("click", generate);
  clearButton.addEventListener("click", clearForm);
  clearHistoryButton.addEventListener("click", clearHistory);
  downloadButton.addEventListener("click", downloadCurrentImage);
  downloadAssetsButton.addEventListener("click", downloadAllAssets);
  clearAssetsButton.addEventListener("click", clearAssets);
  toolTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTool(tab.dataset.tool || "image"));
  });

  fileInput.addEventListener("change", async () => {
    await addReferenceFiles(fileInput.files);
    fileInput.value = "";
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

  dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    await addReferenceFiles(event.dataTransfer.files);
  });

  renderHistory();
  renderAssets();
  setActiveTool("image");
}

function initGate() {
  if (sessionStorage.getItem(ACCESS_STORE) === "1") {
    unlockApp();
    return;
  }
  accessPasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") verifyAccess();
  });
  unlockButton.addEventListener("click", verifyAccess);
  setTimeout(() => accessPasswordInput.focus(), 80);
}

function verifyAccess() {
  if (accessPasswordInput.value.trim() !== ACCESS_PASSWORD) {
    gateMessage.textContent = "密码不对。";
    accessPasswordInput.select();
    return;
  }
  sessionStorage.setItem(ACCESS_STORE, "1");
  unlockApp();
}

function unlockApp() {
  accessGate.classList.add("hidden");
  appShell.classList.remove("locked");
}

function setActiveTool(tool) {
  activeTool = tool === "video" ? "video" : "image";
  toolTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tool === activeTool));

  document.querySelectorAll(".image-only").forEach((item) => item.classList.toggle("hidden", activeTool !== "image"));
  document.querySelectorAll(".video-only").forEach((item) => item.classList.toggle("hidden", activeTool !== "video"));

  const models = activeTool === "video" ? VIDEO_MODELS : IMAGE_MODELS;
  const ratios = activeTool === "video" ? VIDEO_RATIOS : IMAGE_RATIOS;
  modelInput.innerHTML = models.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  aspectRatioInput.innerHTML = ratios.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

  if (activeTool === "video") {
    heroEyebrow.textContent = "AI VIDEO STUDIO";
    heroCopy.textContent = "输入视频脚本或上传首帧/参考图，生成短视频素材。适合广告短片、产品展示、剧情钩子和投放素材测试。";
    uploadTitle.textContent = "点击上传 / 拖入首帧或参考图";
    uploadDesc.textContent = "可放产品图、角色图、首帧图、场景参考图，最多 8 张。";
    promptInput.placeholder = "例如：8秒竖屏短视频，一个年轻女性在极简卧室里打开高级收纳盒，镜头从近景推入，展示产品材质和容量，真实商业广告质感。";
    generateButton.textContent = "生成视频";
  } else {
    heroEyebrow.textContent = "PRODUCT IMAGE STUDIO";
    heroCopy.textContent = "输入提示词生成商品图；上传参考图后可做图生图。适合产品主图、场景图、广告素材、包装视觉和商单提案。";
    uploadTitle.textContent = "点击上传 / 拖入参考图";
    uploadDesc.textContent = "可放产品图、Logo、材质图、场景参考图，最多 8 张。";
    promptInput.placeholder = "例如：生成一张高级真实的真空压缩收纳袋商品图，暖米白背景，鼠尾草绿文字，产品正面朝前，质感清晰，1:1 电商主图风格。";
    generateButton.textContent = "生成图片";
  }

  modeLabel.textContent = referenceFiles.length
    ? (activeTool === "video" ? "图生视频模式" : "图生图模式")
    : (activeTool === "video" ? "文生视频模式" : "文生图模式");
}

function saveKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setMessage("先输入 Grsai API Key。", "error");
    return;
  }
  localStorage.setItem(KEY_STORE, key);
  setBalance("Key 已保存", maskKey(key));
  setMessage("你的 Key 已保存到当前浏览器。别人使用时需要输入自己的 Key。", "success");
}

async function checkBalance() {
  const key = getKey();
  if (!key) return;

  setBalance("检测中", "正在确认 Key 是否可用。");
  try {
    const formData = new FormData();
    formData.append("apiKey", key);
    formData.append("model", modelInput.value);
    const data = await postForm("/api/balance", formData);
    setBalance(data.balance || "Key 可用", data.detail || maskKey(key));
    setMessage("Key 可用。真实余额请以 Grsai 后台为准。", "success");
  } catch (error) {
    setBalance("检测失败", friendlyError(error));
    setMessage(friendlyError(error), "error");
  }
}

async function generate() {
  const key = getKey();
  const prompt = promptInput.value.trim();
  if (!key || !prompt) {
    if (!prompt) {
      setMessage("先输入提示词。", "error");
      promptInput.focus();
    }
    return;
  }

  currentImageUrls = [];
  downloadButton.disabled = true;
  savePrompt(prompt);
  showLoading(
    activeTool === "video" ? "正在提交视频任务" : "正在提交生图任务",
    referenceFiles.length ? "正在上传参考图并连接 Grsai。" : `正在连接 Grsai ${activeTool === "video" ? "生视频" : "文生图"}接口。`,
  );
  setLoading(true, activeTool === "video" ? "生成视频中..." : "生成中...");

  try {
    const formData = new FormData();
    formData.append("mediaType", activeTool);
    formData.append("prompt", prompt);
    formData.append("model", modelInput.value);
    formData.append("aspectRatio", aspectRatioInput.value);
    formData.append("count", activeTool === "video" ? "1" : imageCountInput.value);
    formData.append("resolution", videoResolutionInput.value);
    formData.append("duration", videoDurationInput.value);
    formData.append("mode", referenceFiles.length ? `${activeTool}-with-reference` : `${activeTool}-text`);
    formData.append("apiKey", key);
    referenceFiles.forEach((file) => formData.append("images", file));

    const created = await postForm("/api/generate", formData);
    const taskIds = normalizeTaskIds(created);
    const directImages = normalizeImageUrls(created);
    if (directImages.length) {
      finish(directImages);
      return;
    }
    if (!taskIds.length) throw new Error(`${activeTool === "video" ? "生视频" : "生图"}接口没有返回任务 ID。`);

    const resultUrls = await pollTasks(taskIds, key);
    finish(resultUrls);
  } catch (error) {
    const detail = friendlyError(error);
    showError(prompt, detail);
    setMessage(`生成失败：${detail}`, "error");
  } finally {
    setLoading(false);
  }
}

function normalizeTaskIds(data) {
  if (Array.isArray(data?.tasks)) return data.tasks.map((item) => item.taskId).filter(Boolean);
  return data?.taskId ? [data.taskId] : [];
}

function normalizeImageUrls(data) {
  if (Array.isArray(data?.images)) return data.images.filter(Boolean);
  return data?.imageUrl ? [data.imageUrl] : [];
}

async function postForm(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `接口返回 ${response.status}`);
  return data;
}

async function pollTasks(taskIds, key) {
  const remaining = new Set(taskIds);
  const images = [];
  for (let i = 1; i <= 120; i += 1) {
    await sleep(3000);
    showLoading(
      activeTool === "video" ? "正在生成视频" : "正在生成图片",
      `已完成 ${images.length}/${taskIds.length} 个结果，正在第 ${i} 次查询。`,
    );

    for (const taskId of Array.from(remaining)) {
      const data = await fetchJson(`/api/result?id=${encodeURIComponent(taskId)}`, {
        headers: {"X-Image-Api-Key": key},
      });
      if (data.imageUrl) {
        images.push(data.imageUrl);
        remaining.delete(taskId);
      } else if (data.status && !["running", "pending", "processing"].includes(data.status)) {
        remaining.delete(taskId);
      }
    }

    if (!remaining.size && images.length) return images;
  }
  throw new Error("生成时间过长，请稍后重试。");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `接口返回 ${response.status}`);
  return data;
}

function finish(imageUrls) {
  currentImageUrls = imageUrls;
  saveAssetBatch(imageUrls);
  imageStage.innerHTML = activeTool === "video"
    ? `<div class="result-grid count-1">${imageUrls.map((url) => `
        <video src="${escapeHtml(url)}" controls playsinline></video>
      `).join("")}</div>`
    : `<div class="result-grid count-${Math.min(imageUrls.length, 4)}">
        ${imageUrls.map((url, index) => `
          <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(url)}" alt="生成图片 ${index + 1}">
          </a>
        `).join("")}
      </div>`;
  downloadButton.disabled = false;
  setMessage(activeTool === "video" ? "视频生成完成。" : `生成完成，共 ${imageUrls.length} 张。`, "success");
  renderAssets();
}

function showLoading(title, detail) {
  imageStage.innerHTML = `
    <div class="loading">
      <div class="loading-orb"></div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function showError(prompt, detail) {
  imageStage.innerHTML = `
    <div class="empty">
      <strong>暂未生成成功</strong>
      <span>${escapeHtml(detail || "请检查 API Key、模型名称或接口节点。")}</span>
      <span>本次提示词：${escapeHtml(prompt.slice(0, 80))}${prompt.length > 80 ? "..." : ""}</span>
    </div>
  `;
}

async function addReferenceFiles(files) {
  const images = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
  if (!images.length) return;

  setMessage("正在优化参考图体积...");
  const optimized = [];
  for (const file of images) {
    optimized.push(await compressImage(file));
  }

  referenceFiles = [...referenceFiles, ...optimized].slice(0, MAX_REFERENCE_FILES);
  modeLabel.textContent = referenceFiles.length
    ? (activeTool === "video" ? "图生视频模式" : "图生图模式")
    : (activeTool === "video" ? "文生视频模式" : "文生图模式");
  renderReferences();
  setMessage(`已添加 ${referenceFiles.length} 张参考图。`, "success");
}

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") + "-museframe.jpg";
          resolve(new File([blob], name, {type: "image/jpeg", lastModified: Date.now()}));
        },
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function renderReferences() {
  referenceList.innerHTML = "";
  uploadPlaceholder.style.display = referenceFiles.length ? "none" : "grid";
  if (!referenceFiles.length) return;

  const count = document.createElement("div");
  count.className = "reference-count";
  count.textContent = `已添加 ${referenceFiles.length} 张参考图`;
  referenceList.appendChild(count);
  modeLabel.textContent = referenceFiles.length
    ? (activeTool === "video" ? "图生视频模式" : "图生图模式")
    : (activeTool === "video" ? "文生视频模式" : "文生图模式");

  referenceFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "reference-item";
    const previewUrl = URL.createObjectURL(file);
    item.innerHTML = `
      <img src="${previewUrl}" alt="参考图 ${index + 1}">
      <button type="button">×</button>
    `;
    item.querySelector("button").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      referenceFiles.splice(index, 1);
      modeLabel.textContent = referenceFiles.length
        ? (activeTool === "video" ? "图生视频模式" : "图生图模式")
        : (activeTool === "video" ? "文生视频模式" : "文生图模式");
      renderReferences();
    });
    referenceList.appendChild(item);
  });
}

function clearForm() {
  promptInput.value = "";
  referenceFiles = [];
  currentImageUrls = [];
  downloadButton.disabled = true;
  modeLabel.textContent = activeTool === "video" ? "文生视频模式" : "文生图模式";
  renderReferences();
  imageStage.innerHTML = `
    <div class="empty">
      <strong>等待生成</strong>
      <span>输入提示词，或拖入参考图后生成。</span>
    </div>
  `;
  setMessage("已清空。");
}

function savePrompt(prompt) {
  const history = getHistory();
  const item = {
    prompt,
    mode: referenceFiles.length
      ? (activeTool === "video" ? "图生视频" : "图生图")
      : (activeTool === "video" ? "文生视频" : "文生图"),
    model: modelInput.value,
    ratio: aspectRatioInput.options[aspectRatioInput.selectedIndex].text,
    count: activeTool === "video" ? "1" : imageCountInput.value,
    mediaType: activeTool,
    duration: activeTool === "video" ? videoDurationInput.value : "",
    resolution: activeTool === "video" ? videoResolutionInput.value : "",
    time: new Date().toLocaleString("zh-CN", {hour12: false}),
  };
  localStorage.setItem(
    HISTORY_STORE,
    JSON.stringify([item, ...history.filter((old) => old.prompt !== prompt)].slice(0, 12)),
  );
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORE)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyList.innerHTML = `<div class="history-empty">暂无记录，生成一次后会自动保存提示词。</div>`;
    return;
  }

  historyList.innerHTML = history.map((item) => `
    <article class="history-item">
      <b>${escapeHtml(item.mode)} · ${escapeHtml(item.model)} · ${escapeHtml(item.ratio || "")} · ${escapeHtml(item.count || "1")}张</b>
      <p class="prompt-preview">${escapeHtml(shortText(item.prompt, 88))}</p>
      <p class="prompt-full hidden">${escapeHtml(item.prompt)}</p>
      <div class="history-actions">
        <button class="soft toggle-prompt" type="button">展开全文</button>
        <button type="button" data-prompt="${escapeHtml(item.prompt)}">复用提示词</button>
      </div>
    </article>
  `).join("");

  historyList.querySelectorAll(".toggle-prompt").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".history-item");
      const preview = card.querySelector(".prompt-preview");
      const full = card.querySelector(".prompt-full");
      const expanded = full.classList.toggle("hidden") === false;
      preview.classList.toggle("hidden", expanded);
      button.textContent = expanded ? "收起" : "展开全文";
    });
  });

  historyList.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt || "";
      promptInput.focus();
      setMessage("已填入历史提示词。");
    });
  });
}

function clearHistory() {
  localStorage.removeItem(HISTORY_STORE);
  renderHistory();
}

function downloadCurrentImage() {
  if (!currentImageUrls.length) return;
  downloadUrls(currentImageUrls, "current");
}

function saveAssetBatch(imageUrls) {
  const prompt = promptInput.value.trim();
  const item = {
    id: `asset-${Date.now()}`,
    urls: imageUrls,
    prompt,
    model: modelInput.value,
    ratio: aspectRatioInput.options[aspectRatioInput.selectedIndex].text,
    count: imageUrls.length,
    mediaType: activeTool,
    duration: activeTool === "video" ? videoDurationInput.value : "",
    resolution: activeTool === "video" ? videoResolutionInput.value : "",
    createdAt: Date.now(),
  };
  const assets = pruneAssets([item, ...getAssets()]);
  localStorage.setItem(ASSET_STORE, JSON.stringify(assets));
}

function getAssets() {
  try {
    return pruneAssets(JSON.parse(localStorage.getItem(ASSET_STORE)) || []);
  } catch {
    return [];
  }
}

function pruneAssets(assets) {
  const minTime = Date.now() - ASSET_RETENTION_MS;
  return assets
    .filter((item) => item && item.createdAt >= minTime && Array.isArray(item.urls) && item.urls.length)
    .slice(0, 80);
}

function renderAssets() {
  const assets = getAssets();
  localStorage.setItem(ASSET_STORE, JSON.stringify(assets));
  const total = assets.reduce((sum, item) => sum + item.urls.length, 0);
  if (assetCount) {
    assetCount.textContent = total ? `${total} 个资产` : "0 个资产";
  }

  if (!assets.length) {
    assetList.innerHTML = `<div class="history-empty">最近 7 天还没有生成资产。</div>`;
    downloadAssetsButton.disabled = true;
    return;
  }

  downloadAssetsButton.disabled = false;
  assetList.innerHTML = assets.map((item) => `
    <article class="asset-item">
      <div class="asset-thumbs">
        ${item.urls.slice(0, 4).map((url, index) => `
          <a href="${downloadHref(url, `${item.id}-${index + 1}.${fileExtensionFor(url)}`)}" download>
            ${item.mediaType === "video"
              ? `<video src="${escapeHtml(url)}" muted playsinline></video>`
              : `<img src="${escapeHtml(url)}" alt="资产 ${index + 1}">`}
          </a>
        `).join("")}
      </div>
      <div class="asset-meta">
        <b>${escapeHtml(item.model)} · ${escapeHtml(item.ratio || "")} · ${item.mediaType === "video" ? `${escapeHtml(item.resolution || "")} · ${escapeHtml(item.duration || "")}秒` : `${item.urls.length} 张`}</b>
        <small>${escapeHtml(formatTime(item.createdAt))}</small>
        <p>${escapeHtml(item.prompt || "未记录提示词")}</p>
        <button type="button" data-asset-id="${escapeHtml(item.id)}">下载这一组</button>
      </div>
    </article>
  `).join("");

  assetList.querySelectorAll("[data-asset-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = getAssets().find((item) => item.id === button.dataset.assetId);
      if (target) downloadUrls(target.urls, target.id);
    });
  });
}

function downloadAllAssets() {
  const urls = getAssets().flatMap((item) => item.urls);
  if (!urls.length) return;
  downloadUrls(urls, "7days");
}

function clearAssets() {
  localStorage.removeItem(ASSET_STORE);
  renderAssets();
  setMessage("最近 7 天资产记录已清空。");
}

function downloadUrls(urls, label) {
  urls.forEach((url, index) => {
    const link = document.createElement("a");
    link.href = downloadHref(url, `museframe-${label}-${index + 1}.${fileExtensionFor(url)}`);
    link.download = `museframe-${label}-${index + 1}.${fileExtensionFor(url)}`;
    link.click();
  });
}

function downloadHref(url, filename) {
  return `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
}

function fileExtensionFor(url) {
  const match = String(url).match(/\.(mp4|mov|webm|m4v|png|jpg|jpeg)(?=($|\?))/i);
  if (!match) return "png";
  return match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
}

function formatTime(value) {
  return new Date(value).toLocaleString("zh-CN", {hour12: false});
}

function getKey() {
  const key = apiKeyInput.value.trim() || localStorage.getItem(KEY_STORE) || "";
  if (!key) {
    setMessage("先输入并保存 Grsai API Key。", "error");
    apiKeyInput.focus();
    return "";
  }
  localStorage.setItem(KEY_STORE, key);
  return key;
}

function setBalance(value, detail) {
  balanceValue.textContent = value;
  balanceDetail.textContent = detail;
}

function setLoading(active, text = "生成图片") {
  generateButton.disabled = active;
  generateButton.textContent = active ? text : (activeTool === "video" ? "生成视频" : "生成图片");
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = type;
}

function maskKey(key) {
  if (key.length <= 12) return "已保存";
  return `${key.slice(0, 5)}...${key.slice(-6)}`;
}

function friendlyError(error) {
  const text = error?.message || String(error || "");
  const lower = text.toLowerCase();
  if (lower.includes("apikey expired")) {
    return "这个 Grsai API Key 已过期或额度不可用。请换一个新的 Key 后重试。";
  }
  if (lower.includes("apikey error") || lower.includes("invalid api key")) {
    return "Grsai API Key 不可用。请确认输入的是完整 Key，没有空格、引号或复制遗漏。";
  }
  if (text === "Failed to fetch") {
    return "当前页面没有连到 MuseFrame 后端。请只打开正式网址，不要打开 GitHub、file 本地页或旧链接；如果已经是正式网址，请按 Ctrl+F5 强制刷新。";
  }
  if (text.includes("timeout") || text.includes("timed out")) {
    return "接口连接超时。建议先用文生图测试，图生图时减少参考图数量。";
  }
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortText(value, limit = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
