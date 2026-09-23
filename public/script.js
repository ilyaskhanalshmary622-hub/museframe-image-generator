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
const fileInput = document.querySelector("#reference-file");
const dropZone = document.querySelector("#drop-zone");
const referenceList = document.querySelector("#reference-list");
const uploadPlaceholder = document.querySelector("#upload-placeholder");
const modelInput = document.querySelector("#model");
const aspectRatioInput = document.querySelector("#aspect-ratio");
const imageCountInput = document.querySelector("#image-count");
const promptInput = document.querySelector("#prompt");
const generateButton = document.querySelector("#generate");
const clearButton = document.querySelector("#clear");
const clearHistoryButton = document.querySelector("#clear-history");
const downloadButton = document.querySelector("#download-image");
const downloadAssetsButton = document.querySelector("#download-assets");
const clearAssetsButton = document.querySelector("#clear-assets");
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

function saveKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setMessage("先输入 Grsai API Key。", "error");
    return;
  }
  localStorage.setItem(KEY_STORE, key);
  setBalance("Key 已保存", maskKey(key));
  setMessage("API Key 已保存到当前浏览器。", "success");
}

async function checkBalance() {
  const key = getKey();
  if (!key) return;

  setBalance("检测中", "正在确认 Key 是否可用。");
  try {
    const data = await fetchJson("/api/balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Image-Api-Key": key,
      },
      body: JSON.stringify({model: modelInput.value}),
    });
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
    "正在提交生图任务",
    referenceFiles.length ? "正在上传参考图并连接 Grsai。" : "正在连接 Grsai 文生图接口。",
  );
  setLoading(true, "生成中...");

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", modelInput.value);
    formData.append("aspectRatio", aspectRatioInput.value);
    formData.append("count", imageCountInput.value);
    formData.append("mode", referenceFiles.length ? "image-to-image" : "text-to-image");
    referenceFiles.forEach((file) => formData.append("images", file));

    const created = await postForm("/api/generate", formData, key);
    const taskIds = normalizeTaskIds(created);
    const directImages = normalizeImageUrls(created);
    if (directImages.length) {
      finish(directImages);
      return;
    }
    if (!taskIds.length) throw new Error("生图接口没有返回任务 ID。");

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

async function postForm(url, formData, key) {
  const response = await fetch(url, {
    method: "POST",
    headers: {"X-Image-Api-Key": key},
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
    showLoading("正在生成图片", `已完成 ${images.length}/${taskIds.length} 张，正在第 ${i} 次查询结果。`);

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
  imageStage.innerHTML = `
    <div class="result-grid count-${Math.min(imageUrls.length, 4)}">
      ${imageUrls.map((url, index) => `
        <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(url)}" alt="生成图片 ${index + 1}">
        </a>
      `).join("")}
    </div>
  `;
  downloadButton.disabled = false;
  setMessage(`生成完成，共 ${imageUrls.length} 张。`, "success");
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
  modeLabel.textContent = referenceFiles.length ? "图生图模式" : "文生图模式";
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
      modeLabel.textContent = referenceFiles.length ? "图生图模式" : "文生图模式";
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
  modeLabel.textContent = "文生图模式";
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
    mode: referenceFiles.length ? "图生图" : "文生图",
    model: modelInput.value,
    ratio: aspectRatioInput.options[aspectRatioInput.selectedIndex].text,
    count: imageCountInput.value,
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
      <p>${escapeHtml(item.prompt)}</p>
      <button type="button" data-prompt="${escapeHtml(item.prompt)}">复用提示词</button>
    </article>
  `).join("");

  historyList.querySelectorAll("button").forEach((button) => {
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
          <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(url)}" alt="资产 ${index + 1}">
          </a>
        `).join("")}
      </div>
      <div class="asset-meta">
        <b>${escapeHtml(item.model)} · ${escapeHtml(item.ratio || "")} · ${item.urls.length} 张</b>
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
    link.href = url;
    link.download = `museframe-${label}-${index + 1}.png`;
    link.target = "_blank";
    link.click();
  });
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
  generateButton.textContent = active ? text : "生成图片";
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
  if (text === "Failed to fetch") {
    return "浏览器没有连上后端，请确认打开的是 MuseFrame 正式网址并刷新页面。";
  }
  if (text.includes("timeout") || text.includes("timed out")) {
    return "接口连接超时。建议先用文生图测试，图生图时减少参考图数量。";
  }
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
