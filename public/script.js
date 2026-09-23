const gate = document.querySelector("#gate");
const app = document.querySelector("#app");
const accessPassword = document.querySelector("#access-password");
const unlockButton = document.querySelector("#unlock");
const gateMessage = document.querySelector("#gate-message");
const fileInput = document.querySelector("#reference-file");
const dropZone = document.querySelector("#drop-zone");
const referenceList = document.querySelector("#reference-list");
const uploadPlaceholder = document.querySelector("#upload-placeholder");
const promptInput = document.querySelector("#prompt");
const ratioInput = document.querySelector("#ratio");
const qualityInput = document.querySelector("#quality");
const editModeInput = document.querySelector("#edit-mode");
const editBriefInput = document.querySelector("#edit-brief");
const generateButton = document.querySelector("#generate");
const clearButton = document.querySelector("#clear");
const clearHistoryButton = document.querySelector("#clear-history");
const imageStage = document.querySelector("#image-stage");
const message = document.querySelector("#message");
const modeLabel = document.querySelector("#mode-label");
const historyList = document.querySelector("#history-list");
const energyValue = document.querySelector("#energy-value");
const energyFill = document.querySelector("#energy-fill");

const PASSWORD_KEY = "museframe-password";
const HISTORY_KEY = "museframe-history";

let referenceFiles = [];
let energy = Number(localStorage.getItem("museframe-energy")) || 86;

init();

function init() {
  const password = sessionStorage.getItem(PASSWORD_KEY);
  if (password) unlock(false);
  updateEnergy();
  renderHistory();

  unlockButton.addEventListener("click", () => unlock(true));
  accessPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlock(true);
  });

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

  clearButton.addEventListener("click", clearForm);
  clearHistoryButton.addEventListener("click", clearHistory);
  generateButton.addEventListener("click", generate);
}

function unlock(fromInput) {
  const password = fromInput ? accessPassword.value.trim() : sessionStorage.getItem(PASSWORD_KEY);
  if (!password) {
    gateMessage.textContent = "请输入访问密码。";
    return;
  }
  sessionStorage.setItem(PASSWORD_KEY, password);
  gate.classList.add("hidden");
  app.classList.remove("locked");
}

async function generate() {
  const prompt = promptInput.value.trim();
  const password = sessionStorage.getItem(PASSWORD_KEY) || "";
  if (!prompt) {
    setMessage("先输入提示词。", "error");
    promptInput.focus();
    return;
  }

  savePrompt(prompt);
  setLoading(true, "提交中...");
  showLoading("正在提交生图任务", "任务创建后会自动查询结果，请不要关闭页面。");

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("mode", referenceFiles.length ? "image-to-image" : "text-to-image");
    formData.append("ratio", ratioInput.value);
    formData.append("quality", qualityInput.value);
    formData.append("editMode", editModeInput.value);
    formData.append("editBrief", editBriefInput.value.trim());
    referenceFiles.forEach((file) => formData.append("images", file));

    const created = await postForm("/api/generate", formData, password);
    if (created.imageUrl) {
      finish(created.imageUrl);
      return;
    }
    if (!created.taskId) throw new Error("生图服务没有返回任务 ID");

    setLoading(true, "生成中...");
    const result = await poll(created.taskId, password);
    finish(result.imageUrl);
  } catch (error) {
    showError(prompt, error.message);
    setMessage(`生成失败：${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

async function postForm(url, formData, password) {
  const response = await fetch(url, {
    method: "POST",
    headers: {"X-MuseFrame-Password": password},
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `接口返回 ${response.status}`);
  return data;
}

async function poll(taskId, password) {
  for (let i = 1; i <= 120; i += 1) {
    await sleep(3000);
    showLoading("正在生成图片", `任务 ID：${taskId}。已查询 ${i} 次。`);
    const response = await fetch(`/api/result?id=${encodeURIComponent(taskId)}`, {
      headers: {"X-MuseFrame-Password": password},
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `查询失败 ${response.status}`);
    if (data.imageUrl) return data;
    if (data.status && !["running", "pending", "processing"].includes(data.status)) {
      throw new Error(`任务状态异常：${data.status}`);
    }
  }
  throw new Error(`生成时间过长，请稍后重试。任务 ID：${taskId}`);
}

function finish(imageUrl) {
  imageStage.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="生成图片">`;
  consumeEnergy();
  setMessage("生成完成。", "success");
}

function showLoading(title, detail) {
  imageStage.innerHTML = `
    <div class="loading">
      <div class="loading-ring"></div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>
  `;
}

function showError(prompt, detail) {
  imageStage.innerHTML = `
    <div class="empty">
      <strong>暂未生成成功</strong>
      <span>${escapeHtml(detail || "请检查 API Key、额度、模型或接口节点。")}</span>
      <span>本次提示词：${escapeHtml(prompt.slice(0, 88))}${prompt.length > 88 ? "..." : ""}</span>
    </div>
  `;
}

function setLoading(active, text = "生成图片") {
  generateButton.disabled = active;
  generateButton.textContent = active ? text : "生成图片";
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = type;
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
  editBriefInput.value = "";
  referenceFiles = [];
  modeLabel.textContent = "文生图模式";
  renderReferences();
  setMessage("已清空。");
}

function savePrompt(prompt) {
  const history = getHistory();
  const item = {
    prompt,
    mode: referenceFiles.length ? "图生图" : "文生图",
    ratio: ratioInput.value,
    quality: qualityInput.value,
    time: new Date().toLocaleString("zh-CN", {hour12: false}),
  };
  localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...history.filter((old) => old.prompt !== prompt)].slice(0, 12)));
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyList.innerHTML = `<div class="history-empty">暂无记录。生成一次后会自动保存提示词。</div>`;
    return;
  }
  historyList.innerHTML = history.map((item) => `
    <article class="history-item">
      <b>${escapeHtml(item.mode)} · ${escapeHtml(item.time)}</b>
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
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function consumeEnergy() {
  const costMap = {"1k": 2, "2k": 4, "4k": 8, "8k": 16};
  energy = Math.max(0, energy - (costMap[qualityInput.value] || 4));
  localStorage.setItem("museframe-energy", String(energy));
  updateEnergy();
}

function updateEnergy() {
  energyValue.textContent = `${energy}%`;
  energyFill.style.width = `${energy}%`;
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
