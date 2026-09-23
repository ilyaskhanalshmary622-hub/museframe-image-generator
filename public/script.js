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
const promptInput = document.querySelector("#prompt");
const generateButton = document.querySelector("#generate");
const clearButton = document.querySelector("#clear");
const clearHistoryButton = document.querySelector("#clear-history");
const downloadButton = document.querySelector("#download-image");
const imageStage = document.querySelector("#image-stage");
const message = document.querySelector("#message");
const modeLabel = document.querySelector("#mode-label");
const historyList = document.querySelector("#history-list");

const KEY_STORE = "museframe-api-key";
const HISTORY_STORE = "museframe-history";

let referenceFiles = [];
let currentImageUrl = "";

init();

function init() {
  const savedKey = localStorage.getItem(KEY_STORE) || "";
  if (savedKey) {
    apiKeyInput.value = savedKey;
    setBalance("Key 已设置", maskKey(savedKey));
  }

  saveKeyButton.addEventListener("click", saveKey);
  checkBalanceButton.addEventListener("click", checkBalance);
  generateButton.addEventListener("click", generate);
  clearButton.addEventListener("click", clearForm);
  clearHistoryButton.addEventListener("click", clearHistory);
  downloadButton.addEventListener("click", downloadCurrentImage);

  fileInput.addEventListener("change", () => {
    addReferenceFiles(fileInput.files);
    fileInput.value = "";
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    addReferenceFiles(event.dataTransfer.files);
  });

  renderHistory();
}

function saveKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setMessage("先输入 Grsai API Key。", "error");
    return;
  }
  localStorage.setItem(KEY_STORE, key);
  setBalance("Key 已设置", maskKey(key));
  setMessage("API Key 已保存在当前浏览器。", "success");
}

async function checkBalance() {
  const key = getKey();
  if (!key) return;

  setBalance("查询中", "正在尝试读取余额接口...");
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
  } catch (error) {
    setBalance("Key 已设置", "未读取到余额接口，生图不受影响。");
    setMessage(error.message, "error");
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

  currentImageUrl = "";
  downloadButton.disabled = true;
  savePrompt(prompt);
  showLoading("正在提交任务", "正在连接 Grsai 生图接口，请稍等。");
  setLoading(true, "生成中...");

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", modelInput.value);
    formData.append("mode", referenceFiles.length ? "image-to-image" : "text-to-image");
    referenceFiles.forEach((file) => formData.append("images", file));

    const created = await postForm("/api/generate", formData, key);
    if (created.imageUrl) {
      finish(created.imageUrl);
      return;
    }
    if (!created.taskId) throw new Error("生图接口没有返回任务 ID。");

    const result = await poll(created.taskId, key);
    finish(result.imageUrl);
  } catch (error) {
    showError(prompt, error.message);
    setMessage(`生成失败：${error.message}`, "error");
  } finally {
    setLoading(false);
  }
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

async function poll(taskId, key) {
  for (let i = 1; i <= 120; i += 1) {
    await sleep(3000);
    showLoading("正在生成图片", `任务已提交，正在第 ${i} 次查询结果。`);
    const data = await fetchJson(`/api/result?id=${encodeURIComponent(taskId)}`, {
      headers: {"X-Image-Api-Key": key},
    });
    if (data.imageUrl) return data;
    if (data.status && !["running", "pending", "processing"].includes(data.status)) {
      throw new Error(`任务状态异常：${data.status}`);
    }
  }
  throw new Error("生成时间过长，请稍后重试。");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `接口返回 ${response.status}`);
  return data;
}

function finish(imageUrl) {
  currentImageUrl = imageUrl;
  imageStage.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="生成图片">`;
  downloadButton.disabled = false;
  setMessage("生成完成。", "success");
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
      <span>${escapeHtml(detail || "请检查 API Key、模型或接口节点。")}</span>
      <span>本次提示词：${escapeHtml(prompt.slice(0, 80))}${prompt.length > 80 ? "..." : ""}</span>
    </div>
  `;
}

function addReferenceFiles(files) {
  const images = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
  referenceFiles = [...referenceFiles, ...images].slice(0, 12);
  modeLabel.textContent = referenceFiles.length ? "图生图模式" : "文生图模式";
  renderReferences();
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
    item.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="参考图 ${index + 1}">
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
  currentImageUrl = "";
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
      <b>${escapeHtml(item.mode)} · ${escapeHtml(item.model)}</b>
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
  if (!currentImageUrl) return;
  const link = document.createElement("a");
  link.href = currentImageUrl;
  link.download = `museframe-${Date.now()}.png`;
  link.target = "_blank";
  link.click();
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
