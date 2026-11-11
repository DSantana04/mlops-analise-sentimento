const body = document.body;
const form = document.querySelector("#comment-form");
const textarea = document.querySelector("#comment");
const count = document.querySelector("#char-count");
const submit = document.querySelector("#submit-button");
const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = document.querySelector("#theme-label");
const accessibilityToggle = document.querySelector("#accessibility-toggle");
const accessibilityPanel = document.querySelector("#accessibility-panel");
const dyslexiaToggle = document.querySelector("#dyslexia-toggle");
const largeTextToggle = document.querySelector("#large-text-toggle");
const visionSelect = document.querySelector("#vision-select");
const apiBaseUrl = (window.OQSENTE_API_URL || "").replace(/\/$/, "");
const feedbackModal = document.querySelector("#feedback-modal");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackStatus = document.querySelector("#feedback-status");
let currentResult = null;
const views = ["composer-view", "loading-view", "result-view", "error-view"];

function showView(activeView) {
  views.forEach((view) => {
    document.querySelector(`#${view}`).hidden = view !== activeView;
  });
}

function setTheme() {
  body.classList.toggle("light");
  themeLabel.textContent = body.classList.contains("light") ? "Tema escuro" : "Tema claro";
}

function saveAccessibility() {
  localStorage.setItem("oqsente-accessibility", JSON.stringify({
    dyslexia: dyslexiaToggle.checked,
    largeText: largeTextToggle.checked,
    vision: visionSelect.value,
  }));
}

function applyAccessibility() {
  body.classList.toggle("dyslexia-mode", dyslexiaToggle.checked);
  body.classList.toggle("large-text", largeTextToggle.checked);
  body.dataset.colorVision = visionSelect.value;
  saveAccessibility();
}

function loadAccessibility() {
  try {
    const saved = JSON.parse(localStorage.getItem("oqsente-accessibility"));
    if (!saved) return;
    dyslexiaToggle.checked = Boolean(saved.dyslexia);
    largeTextToggle.checked = Boolean(saved.largeText);
    visionSelect.value = saved.vision || "normal";
    applyAccessibility();
  } catch (error) {
    localStorage.removeItem("oqsente-accessibility");
  }
}

function toggleAccessibility() {
  const isOpen = accessibilityPanel.hidden;
  accessibilityPanel.hidden = !isOpen;
  accessibilityToggle.setAttribute("aria-expanded", String(isOpen));
}

function resetAccessibility() {
  dyslexiaToggle.checked = false;
  largeTextToggle.checked = false;
  visionSelect.value = "normal";
  applyAccessibility();
}

function updateInput() {
  const length = textarea.value.length;
  count.textContent = `${length} / 1000`;
  submit.disabled = length < 3 || length > 1000;
}

function setMood(result) {
  body.dataset.mood = result.incerto ? "uncertain" : result.polaridade === "Positivo" ? "positive" : "negative";
}

function buildAnalysis(result) {
  if (result.incerto) return "Há sinais mistos ou sutis neste comentário. A confiança ficou abaixo do nível de segurança, então vale ler o resultado como uma tendência, não como uma certeza.";
  return result.polaridade === "Positivo" ? "As palavras escolhidas carregam uma direção de satisfação e aprovação. O modelo encontrou uma presença mais forte de sinais positivos no texto." : "O comentário concentra sinais de frustração ou desaprovação. O modelo identificou uma direção emocional negativa predominante.";
}

function renderResult(result) {
  currentResult = result;
  setMood(result);
  document.querySelector("#sentiment").textContent = result.sentimento;
  document.querySelector("#confidence").textContent = `${Math.round(result.confianca * 100)}%`;
  document.querySelector("#polarity").textContent = result.polaridade;
  document.querySelector("#analysis").textContent = buildAnalysis(result);
  document.querySelector("#quoted-comment").textContent = result.texto;
  document.querySelector("#result-version").textContent = `modelo ${result.versao_modelo}`;
  document.querySelector("#metrics").innerHTML = [
    ["acurácia", `${Math.round(result.metricas.acuracia * 100)}%`],
    ["f1 macro", result.metricas.f1_macro.toFixed(2)],
    ["teste", `${result.metricas.amostras_teste} amostras`],
    ["classes", result.metricas.classes.join(" / ")],
  ].map(([label, value]) => `<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join("");
}

async function sendFeedback(payload) {
  const response = await fetch(`${apiBaseUrl}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, texto: currentResult.texto, sentimento_modelo: currentResult.sentimento }),
  });
  if (!response.ok) throw new Error("feedback failed");
}

async function reactToResult(event) {
  const button = event.currentTarget;
  try {
    await sendFeedback({ reacao: button.dataset.reaction });
    document.querySelectorAll(".feedback-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    feedbackStatus.textContent = "Obrigado pelo sinal.";
  } catch (error) {
    feedbackStatus.textContent = "Não foi possível registrar agora.";
  }
}

function closeFeedback() {
  feedbackModal.hidden = true;
}

async function submitFeedback(event) {
  event.preventDefault();
  const sentiment = new FormData(feedbackForm).get("human-sentiment");
  const submitButton = feedbackForm.querySelector(".submit-button");
  submitButton.disabled = true;
  try {
    await sendFeedback({
      avaliacao_usuario: sentiment,
      reacao: "relato",
      relato: document.querySelector("#report-text").value.trim() || null,
    });
    closeFeedback();
    feedbackStatus.textContent = "Relato recebido. Obrigado por ajudar.";
    feedbackForm.reset();
  } catch (error) {
    feedbackStatus.textContent = "Não foi possível registrar o relato.";
  } finally {
    submitButton.disabled = false;
  }
}

async function predict(event) {
  event.preventDefault();
  showView("loading-view");
  try {
    const response = await fetch(`${apiBaseUrl}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: textarea.value.trim() }),
    });
    if (!response.ok) throw new Error("prediction failed");
    renderResult(await response.json());
    showView("result-view");
  } catch (error) {
    showView("error-view");
  }
}

function newComment() {
  body.dataset.mood = "idle";
  textarea.value = "";
  updateInput();
  showView("composer-view");
  closeFeedback();
  textarea.focus();
}

textarea.addEventListener("input", updateInput);
form.addEventListener("submit", predict);
themeToggle.addEventListener("click", setTheme);
accessibilityToggle.addEventListener("click", toggleAccessibility);
document.querySelector("#accessibility-close").addEventListener("click", toggleAccessibility);
dyslexiaToggle.addEventListener("change", applyAccessibility);
largeTextToggle.addEventListener("change", applyAccessibility);
visionSelect.addEventListener("change", applyAccessibility);
document.querySelector("#reset-accessibility").addEventListener("click", resetAccessibility);
document.querySelector("#new-comment").addEventListener("click", newComment);
document.querySelector("#retry").addEventListener("click", newComment);
document.querySelectorAll(".feedback-button").forEach((button) => button.addEventListener("click", reactToResult));
document.querySelector("#report-feedback").addEventListener("click", () => { feedbackModal.hidden = false; });
document.querySelector("#feedback-close").addEventListener("click", closeFeedback);
document.querySelector("#feedback-cancel").addEventListener("click", closeFeedback);
feedbackForm.addEventListener("submit", submitFeedback);
updateInput();
loadAccessibility();