/* F19 Tattoo Studio – Production Chatbot Widget (v3)
 * Embed on any website:
 *   <script src="https://YOUR-DOMAIN/f19-chat.js" defer></script>
 * Recommended: host this file on Hostinger directly for 24/7 independence.
 * Edge function runs on Supabase 24/7 — no Lovable preview dependency.
 */
(function () {
  if (window.__f19ChatLoaded) return;
  window.__f19ChatLoaded = true;

  var API_URL = "https://edwmlzhbrtchnjfdntrc.supabase.co/functions/v1/website-chatbot";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd21semhicnRjaG5qZmRudHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Mjc4MDcsImV4cCI6MjA4ODAwMzgwN30.KYca-5nNojNuTz8XSBoJW6WIu0_8Fg9SrOpqT1L0xdI";
  var STORE_KEY = "f19_chat_v3";

  // --- Persistent session + messages ---
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) {}
  var sessionId = saved.sessionId || ("s_" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  var messages = Array.isArray(saved.messages) ? saved.messages : [];
  var sending = false;

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ sessionId: sessionId, messages: messages.slice(-50) })); } catch (e) {}
  }

  var QUICK_ACTIONS = [
    { icon: "🔥", label: "Book Consultation", msg: "I want to book a tattoo consultation" },
    { icon: "💰", label: "Tattoo Pricing", msg: "What are your tattoo prices?" },
    { icon: "🎨", label: "Tattoo Styles", msg: "What tattoo styles do you offer?" },
    { icon: "📍", label: "Studio Location", msg: "Where is your studio located?" },
    { icon: "📅", label: "Book Appointment", msg: "I want to book an appointment today" },
    { icon: "✨", label: "Custom Design", msg: "I need help with a custom tattoo design" },
  ];

  var host = document.createElement("div");
  host.id = "f19-chat-root";
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML =
    '<style>' +
    ':host,*{box-sizing:border-box}' +
    '.f19c-hidden{display:none !important}' +
    '.f19c-bubble{-webkit-appearance:none !important;appearance:none !important;position:fixed !important;right:24px !important;bottom:24px !important;width:64px !important;height:64px !important;min-width:64px !important;min-height:64px !important;max-width:64px !important;max-height:64px !important;padding:0 !important;margin:0 !important;border:0 !important;border-radius:999px !important;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%) !important;color:#ffffff !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;box-shadow:0 14px 34px rgba(220,38,38,.34) !important;z-index:2147483646 !important;outline:none !important;line-height:1 !important;font:inherit !important;transition:transform .2s ease, box-shadow .2s ease !important}' +
    '.f19c-bubble:hover{transform:scale(1.05) !important;box-shadow:0 18px 40px rgba(220,38,38,.4) !important}' +
    '.f19c-bubble svg{width:28px !important;height:28px !important;display:block !important;flex:none !important}' +
    '.f19c-dot{position:absolute !important;top:6px !important;right:6px !important;width:14px !important;height:14px !important;border-radius:999px !important;background:#22c55e !important;border:2px solid #fff !important}' +
    '.f19c-panel{position:fixed !important;right:24px !important;bottom:104px !important;width:380px !important;max-width:calc(100vw - 32px) !important;height:580px !important;max-height:calc(100vh - 136px) !important;background:#ffffff !important;border:1px solid rgba(229,231,235,.95) !important;border-radius:24px !important;box-shadow:0 26px 70px rgba(15,23,42,.22) !important;z-index:2147483647 !important;display:none !important;overflow:hidden !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important;color:#111827 !important;flex-direction:column !important}' +
    '.f19c-panel.f19c-open{display:flex !important;animation:f19cIn .22s ease !important}' +
    '@keyframes f19cIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}' +
    '.f19c-header{display:flex !important;align-items:flex-start !important;justify-content:space-between !important;gap:12px !important;padding:18px 18px 16px !important;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%) !important;color:#ffffff !important}' +
    '.f19c-title{min-width:0 !important}' +
    '.f19c-title h3{margin:0 !important;font-size:16px !important;font-weight:700 !important;line-height:1.2 !important;color:#ffffff !important}' +
    '.f19c-title p{margin:4px 0 0 !important;font-size:12px !important;line-height:1.35 !important;color:rgba(255,255,255,.86) !important;display:flex !important;align-items:center !important;gap:6px !important}' +
    '.f19c-title .f19c-live{width:8px !important;height:8px !important;border-radius:999px !important;background:#22c55e !important;display:inline-block !important;box-shadow:0 0 0 0 rgba(34,197,94,.6) !important;animation:f19cPulse 1.8s infinite !important}' +
    '@keyframes f19cPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}' +
    '.f19c-htools{display:flex !important;gap:6px !important;align-items:center !important}' +
    '.f19c-iconbtn{-webkit-appearance:none !important;appearance:none !important;width:32px !important;height:32px !important;min-width:32px !important;border:0 !important;border-radius:999px !important;background:rgba(255,255,255,.12) !important;color:#ffffff !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;padding:0 !important;margin:0 !important;font-size:14px !important;line-height:1 !important;flex:none !important}' +
    '.f19c-body{flex:1 1 auto !important;overflow-y:auto !important;padding:16px !important;background:#f8fafc !important;display:flex !important;flex-direction:column !important;gap:10px !important}' +
    '.f19c-msg{max-width:84% !important;padding:12px 14px !important;border-radius:18px !important;font-size:14px !important;line-height:1.55 !important;white-space:pre-wrap !important;word-break:break-word !important;box-shadow:none !important}' +
    '.f19c-user{align-self:flex-end !important;background:#dc2626 !important;color:#ffffff !important;border-bottom-right-radius:6px !important}' +
    '.f19c-bot{align-self:flex-start !important;background:#ffffff !important;color:#111827 !important;border:1px solid #e5e7eb !important;border-bottom-left-radius:6px !important}' +
    '.f19c-typing{align-self:flex-start !important;display:flex !important;gap:5px !important;padding:12px 14px !important;background:#ffffff !important;border:1px solid #e5e7eb !important;border-radius:18px !important}' +
    '.f19c-typing span{width:7px !important;height:7px !important;border-radius:999px !important;background:#9ca3af !important;animation:f19cBlink 1.2s infinite !important}' +
    '.f19c-typing span:nth-child(2){animation-delay:.2s !important}' +
    '.f19c-typing span:nth-child(3){animation-delay:.4s !important}' +
    '@keyframes f19cBlink{0%,80%,100%{opacity:.28}40%{opacity:1}}' +
    '.f19c-quick{display:flex !important;flex-wrap:wrap !important;gap:6px !important;padding:10px 12px 4px !important;background:#f8fafc !important;border-top:1px solid #eef2f7 !important}' +
    '.f19c-qbtn{-webkit-appearance:none !important;appearance:none !important;border:1px solid #fecaca !important;background:#fff5f5 !important;color:#991b1b !important;font-size:12px !important;font-weight:600 !important;padding:7px 11px !important;border-radius:999px !important;cursor:pointer !important;line-height:1 !important;font-family:inherit !important;transition:background .15s !important}' +
    '.f19c-qbtn:hover{background:#fee2e2 !important}' +
    '.f19c-input{display:grid !important;grid-template-columns:minmax(0,1fr) 44px !important;align-items:center !important;gap:10px !important;padding:12px !important;background:#ffffff !important;border-top:1px solid #e5e7eb !important}' +
    '.f19c-input input{-webkit-appearance:none !important;appearance:none !important;width:100% !important;min-width:0 !important;height:44px !important;padding:0 16px !important;border:1.5px solid #dc2626 !important;border-radius:999px !important;background:#ffffff !important;color:#111827 !important;font-size:14px !important;line-height:44px !important;outline:none !important;margin:0 !important;box-shadow:none !important;font-family:inherit !important}' +
    '.f19c-input input::placeholder{color:#9ca3af !important;opacity:1 !important}' +
    '.f19c-input input:focus{border-color:#b91c1c !important}' +
    '.f19c-input button{-webkit-appearance:none !important;appearance:none !important;width:44px !important;height:44px !important;min-width:44px !important;min-height:44px !important;max-width:44px !important;max-height:44px !important;padding:0 !important;margin:0 !important;border:0 !important;border-radius:999px !important;background:#dc2626 !important;color:#ffffff !important;display:flex !important;align-items:center !important;justify-content:center !important;cursor:pointer !important;box-shadow:none !important;flex:none !important;justify-self:end !important;align-self:center !important}' +
    '.f19c-input button:disabled{opacity:.55 !important;cursor:not-allowed !important}' +
    '.f19c-input button svg{width:18px !important;height:18px !important;display:block !important;flex:none !important}' +
    '@media(max-width:820px){.f19c-bubble{right:16px !important;bottom:16px !important}.f19c-panel{right:8px !important;left:8px !important;bottom:84px !important;width:auto !important;max-width:none !important;height:min(580px,calc(100vh - 104px)) !important;border-radius:20px !important}}' +
    '</style>' +
    '<button class="f19c-bubble" aria-label="Open chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="f19c-dot"></span></button>' +
    '<div class="f19c-panel" aria-live="polite">' +
    '<div class="f19c-header"><div class="f19c-title"><h3>F19 Tattoo Assistant</h3><p><span class="f19c-live"></span>Online · replies instantly</p></div><div class="f19c-htools"><button class="f19c-iconbtn f19c-reset" aria-label="New chat" title="New chat">⟳</button><button class="f19c-iconbtn f19c-close" aria-label="Close">✕</button></div></div>' +
    '<div class="f19c-body" id="f19c-body"></div>' +
    '<div class="f19c-quick" id="f19c-quick"></div>' +
    '<form class="f19c-input"><input type="text" placeholder="Type a message..." autocomplete="off" /><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></form>' +
    '</div>';

  var bubble = shadow.querySelector(".f19c-bubble");
  var panel = shadow.querySelector(".f19c-panel");
  var body = shadow.querySelector("#f19c-body");
  var quick = shadow.querySelector("#f19c-quick");
  var form = shadow.querySelector("form");
  var input = shadow.querySelector("input");
  var sendBtn = shadow.querySelector("button[type=submit]");
  var closeBtn = shadow.querySelector(".f19c-close");
  var resetBtn = shadow.querySelector(".f19c-reset");

  function renderMsg(role, text) {
    var div = document.createElement("div");
    div.className = "f19c-msg " + (role === "user" ? "f19c-user" : "f19c-bot");
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping(show) {
    var t = body.querySelector("#f19c-typing");
    if (show && !t) {
      t = document.createElement("div");
      t.id = "f19c-typing";
      t.className = "f19c-typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
    } else if (!show && t) {
      t.remove();
    }
  }

  function renderQuick() {
    quick.innerHTML = "";
    if (messages.filter(function (m) { return m.role === "user"; }).length >= 2) {
      quick.style.display = "none";
      return;
    }
    quick.style.display = "flex";
    QUICK_ACTIONS.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "f19c-qbtn";
      b.textContent = a.icon + " " + a.label;
      b.addEventListener("click", function () { sendText(a.msg); });
      quick.appendChild(b);
    });
  }

  function restore() {
    body.innerHTML = "";
    messages.forEach(function (m) { renderMsg(m.role, m.content); });
    renderQuick();
  }

  function openPanel() {
    panel.classList.add("f19c-open");
    bubble.classList.add("f19c-hidden");
    if (messages.length === 0) {
      var welcome = "👋 Hi! Welcome to F19 Tattoo Studio.\n\nTell us your tattoo idea and our artist will guide you — or pick an option below!";
      renderMsg("assistant", welcome);
      messages.push({ role: "assistant", content: welcome });
      persist();
      renderQuick();
    }
    setTimeout(function () { input.focus(); }, 80);
  }

  function closePanel() {
    panel.classList.remove("f19c-open");
    bubble.classList.remove("f19c-hidden");
  }

  function resetChat() {
    messages = [];
    sessionId = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    persist();
    body.innerHTML = "";
    openPanel();
  }

  function sendText(text) {
    if (sending || !text) return;
    renderMsg("user", text);
    messages.push({ role: "user", content: text });
    persist();
    renderQuick();
    sending = true;
    sendBtn.disabled = true;
    showTyping(true);

    fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: "Bearer " + ANON_KEY,
      },
      body: JSON.stringify({ messages: messages, sessionId: sessionId }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        showTyping(false);
        var reply = res.ok ? res.d.reply || "..." : res.d.error || "Something went wrong. Please try again.";
        renderMsg("assistant", reply);
        messages.push({ role: "assistant", content: reply });
        persist();
      })
      .catch(function () {
        showTyping(false);
        renderMsg("assistant", "Network error. Please check your connection and try again.");
      })
      .finally(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  bubble.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  resetBtn.addEventListener("click", resetChat);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendText(text);
  });

  // Restore on load if there's history
  if (messages.length > 0) restore();
})();
