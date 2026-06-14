
// ── CONFIG ────────────────────────────────────
const API_URL        = "/chat";          
const STORAGE_KEY    = "nexbot_sessions"; 

// ── DOM REFS ──────────────────────────────────
const sidebar       = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const menuBtn       = document.getElementById("menuBtn");
const newChatBtn    = document.getElementById("newChatBtn");
const themeToggle   = document.getElementById("themeToggle");
const clearChatBtn  = document.getElementById("clearChatBtn");
const chatArea      = document.getElementById("chatArea");
const messagesEl    = document.getElementById("messages");
const welcomeScreen = document.getElementById("welcomeScreen");
const chatHistoryEl = document.getElementById("chatHistory");
const historyEmpty  = document.getElementById("historyEmpty");
const userInput     = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const chips         = document.querySelectorAll(".chip");

// ── STATE ─────────────────────────────────────
let isTyping       = false;
let darkMode       = true;
let activeSession  = null;   // ID of the currently open chat session



let sessions = loadSessions();

// ── INIT ──────────────────────────────────────
renderHistoryList();
showWelcome(true);

// ── SIDEBAR ───────────────────────────────────
sidebarToggle.addEventListener("click", () => sidebar.classList.add("collapsed"));
menuBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

// ── THEME ─────────────────────────────────────
themeToggle.addEventListener("click", () => {
  darkMode = !darkMode;
  document.body.classList.toggle("light-mode", !darkMode);
});

// ── CHIPS ─────────────────────────────────────
chips.forEach(chip => {
  chip.addEventListener("click", () => {
    userInput.value = chip.getAttribute("data-prompt");
    updateSendBtn();
    sendMessage();
  });
});

// ── CLEAR CURRENT CHAT ────────────────────────
clearChatBtn.addEventListener("click", () => {
  if (!activeSession) return;
  const idx = sessions.findIndex(s => s.id === activeSession);
  if (idx !== -1) {
    sessions[idx].messages = [];
    saveSessions();
  }
  messagesEl.innerHTML = "";
  showWelcome(true);
});

// ── NEW CHAT ──────────────────────────────────
newChatBtn.addEventListener("click", () => {
  activeSession = null;
  messagesEl.innerHTML = "";
  showWelcome(true);
  userInput.value = "";
  updateSendBtn();
  renderHistoryList();          // deselect all
});

// ── TEXTAREA AUTO-RESIZE ──────────────────────
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 180) + "px";
  updateSendBtn();
});

// ── ENTER TO SEND ─────────────────────────────
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});
sendBtn.addEventListener("click", () => { if (!sendBtn.disabled) sendMessage(); });

// ── SEND MESSAGE ──────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isTyping) return;

  // ── If no active session, create one now ──
  if (!activeSession) {
    activeSession = createSession(text);
    renderHistoryList();
  }

  // Show chat UI
  showWelcome(false);

  // Render & save user message
  const userMsg = { role: "user", text, time: currentTime() };
  saveMessageToSession(activeSession, userMsg);
  renderMessage(userMsg);

  // Clear input & lock UI
  userInput.value = "";
  userInput.style.height = "auto";
  isTyping = true;
  updateSendBtn();

  const typingEl = showTyping();
  scrollToBottom();

  // Build history array for Flask (all previous messages in this session)
  const session = getSession(activeSession);
  const history = session
    ? session.messages
        .slice(0, -1)                         // exclude the message we just added
        .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }))
    : [];

  try {
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try { const d = await response.json(); if (d.error) errMsg = d.error; } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (!data.reply && !data.error) throw new Error("Unexpected response from server.");
    if (data.error) throw new Error(data.error);

    // Save & render bot reply
    const botMsg = { role: "bot", text: data.reply, time: currentTime() };
    saveMessageToSession(activeSession, botMsg);
    removeTyping(typingEl);
    renderMessage(botMsg);

  } catch (err) {
    removeTyping(typingEl);
    renderErrorBubble(err.message);
    console.error("[NexBot] API error:", err);
  } finally {
    isTyping = false;
    updateSendBtn();
    scrollToBottom();
  }
}


//  SESSION MANAGEMENT

function createSession(firstMessage) {
  const session = {
    id:        crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title:     firstMessage.length > 40 ? firstMessage.slice(0, 40) + "…" : firstMessage,
    createdAt: Date.now(),
    messages:  [],
  };
  sessions.unshift(session);   // newest first
  saveSessions();
  return session.id;
}

function getSession(id) {
  return sessions.find(s => s.id === id) || null;
}

function saveMessageToSession(id, msg) {
  const session = getSession(id);
  if (!session) return;
  session.messages.push(msg);
  saveSessions();
}

function deleteSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  saveSessions();
  if (activeSession === id) {
    activeSession = null;
    messagesEl.innerHTML = "";
    showWelcome(true);
  }
  renderHistoryList();
}

// ── localStorage helpers ──
function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (_) { return []; }
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (_) {}
}

//  SIDEBAR HISTORY LIST


function renderHistoryList() {
  // Remove all dynamic items (keep #historyEmpty)
  chatHistoryEl.querySelectorAll(".history-item").forEach(el => el.remove());

  if (sessions.length === 0) {
    historyEmpty.style.display = "block";
    return;
  }

  historyEmpty.style.display = "none";

  sessions.forEach(session => {
    const li = document.createElement("li");
    li.className = "history-item" + (session.id === activeSession ? " active" : "");
    li.dataset.id = session.id;

    li.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
      <span title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</span>
      <button class="delete-btn" title="Delete chat">✕</button>
    `;

    // Click on item → load session
    li.addEventListener("click", e => {
      if (e.target.closest(".delete-btn")) return; // handled separately
      loadSession(session.id);
    });

    // Delete button
    li.querySelector(".delete-btn").addEventListener("click", e => {
      e.stopPropagation();
      deleteSession(session.id);
    });

    chatHistoryEl.appendChild(li);
  });
}

function loadSession(id) {
  activeSession = id;
  const session = getSession(id);
  if (!session) return;

  // Re-render all messages
  messagesEl.innerHTML = "";
  showWelcome(false);

  session.messages.forEach(msg => renderMessage(msg));
  scrollToBottom();

  renderHistoryList();   // update active highlight
}


//  RENDER HELPERS

function showWelcome(show) {
  welcomeScreen.style.display = show ? "flex" : "none";
  messagesEl.style.display    = show ? "none" : "flex";
}

function renderMessage(msg) {
  const isUser = msg.role === "user";
  const wrapper = document.createElement("div");
  wrapper.className = `message ${isUser ? "user" : "bot"}`;

  const avatarEl = document.createElement("div");
  avatarEl.className = "msg-avatar";
  avatarEl.textContent = isUser ? "YOU" : "NB";

  const msgWrap = document.createElement("div");
  msgWrap.className = "msg-wrap";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = isUser ? escapeHtml(msg.text) : formatText(msg.text);

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = msg.time || "";

  msgWrap.appendChild(bubble);
  msgWrap.appendChild(timeEl);
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(msgWrap);
  messagesEl.appendChild(wrapper);
}

function renderErrorBubble(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot";

  const avatarEl = document.createElement("div");
  avatarEl.className = "msg-avatar";
  avatarEl.textContent = "NB";

  const msgWrap = document.createElement("div");
  msgWrap.className = "msg-wrap";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.style.cssText = "border-color:rgba(255,80,80,0.35);background:rgba(255,50,50,0.1);";
  bubble.innerHTML = `<span style="color:#ff6b6b;">⚠ ${escapeHtml(message)}</span>`;

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = currentTime();

  msgWrap.appendChild(bubble);
  msgWrap.appendChild(timeEl);
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(msgWrap);
  messagesEl.appendChild(wrapper);
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "typing-indicator";

  const avatarEl = document.createElement("div");
  avatarEl.className = "msg-avatar";
  avatarEl.style.cssText = "background:linear-gradient(135deg,#7c5cfc,#a688ff);color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:600;flex-shrink:0;margin-top:2px;";
  avatarEl.textContent = "NB";

  const bubble = document.createElement("div");
  bubble.className = "typing-bubble";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    bubble.appendChild(dot);
  }

  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  return wrapper;
}

function removeTyping(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ── Basic Markdown → HTML ──
function formatText(text) {
  let html = escapeHtml(text);

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:rgba(0,0,0,0.25);border-radius:8px;padding:12px;overflow-x:auto;margin:8px 0;font-size:0.82em;font-family:'Courier New',monospace;line-height:1.5;">${code.trim()}</pre>`
  );
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/^[•\-]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\s*<li>[\s\S]*?<\/li>)*/g,
    m => `<ul style="padding-left:18px;margin:6px 0;">${m}</ul>`);
  html = html.replace(/\n/g, "<br>");
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateSendBtn() {
  sendBtn.disabled = userInput.value.trim() === "" || isTyping;
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Close sidebar on outside click (mobile)
document.addEventListener("click", e => {
  if (window.innerWidth <= 640 &&
      !sidebar.contains(e.target) &&
      !menuBtn.contains(e.target)) {
    sidebar.classList.add("collapsed");
  }
});