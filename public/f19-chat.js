/* F19 Tattoo Studio – Chatbot Widget
 * Embed on any website:
 *   <script src="https://YOUR-CRM-DOMAIN/f19-chat.js" defer></script>
 * Or, if hosting via Hostinger, host this file there directly.
 */
(function () {
  if (window.__f19ChatLoaded) return;
  window.__f19ChatLoaded = true;

  var API_URL = "https://edwmlzhbrtchnjfdntrc.supabase.co/functions/v1/website-chatbot";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkd21semhicnRjaG5qZmRudHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Mjc4MDcsImV4cCI6MjA4ODAwMzgwN30.KYca-5nNojNuTz8XSBoJW6WIu0_8Fg9SrOpqT1L0xdI";

  var sessionId = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var messages = [];
  var open = false;
  var sending = false;

  var style = document.createElement("style");
  style.textContent = `
  .f19c-bubble{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#7f1d1d);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(220,38,38,.35);z-index:2147483646;border:none;transition:transform .2s ease}
  .f19c-bubble:hover{transform:scale(1.08)}
  .f19c-bubble svg{width:28px;height:28px}
  .f19c-panel{position:fixed;bottom:100px;right:24px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:2147483647;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a}
  .f19c-panel.f19c-open{display:flex;animation:f19cIn .25s ease}
  @keyframes f19cIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .f19c-header{background:linear-gradient(135deg,#dc2626,#7f1d1d);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
  .f19c-header h3{margin:0;font-size:15px;font-weight:600}
  .f19c-header p{margin:2px 0 0;font-size:11px;opacity:.85}
  .f19c-close{background:transparent;border:none;color:#fff;cursor:pointer;padding:4px;font-size:18px;line-height:1}
  .f19c-body{flex:1;overflow-y:auto;padding:14px;background:#f8f8f8;display:flex;flex-direction:column;gap:8px}
  .f19c-msg{max-width:80%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;word-wrap:break-word;white-space:pre-wrap}
  .f19c-msg.f19c-user{align-self:flex-end;background:#dc2626;color:#fff;border-bottom-right-radius:4px}
  .f19c-msg.f19c-bot{align-self:flex-start;background:#fff;color:#1a1a1a;border:1px solid #e5e5e5;border-bottom-left-radius:4px}
  .f19c-typing{align-self:flex-start;display:flex;gap:4px;padding:10px 14px;background:#fff;border:1px solid #e5e5e5;border-radius:14px}
  .f19c-typing span{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:f19cBlink 1.2s infinite}
  .f19c-typing span:nth-child(2){animation-delay:.2s}
  .f19c-typing span:nth-child(3){animation-delay:.4s}
  @keyframes f19cBlink{0%,80%,100%{opacity:.3}40%{opacity:1}}
  .f19c-input{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e5e5;background:#fff}
  .f19c-input input{flex:1;border:1px solid #e0e0e0;border-radius:20px;padding:9px 14px;font-size:13.5px;outline:none;color:#1a1a1a;background:#f7f7f7}
  .f19c-input input:focus{border-color:#dc2626;background:#fff}
  .f19c-input button{background:#dc2626;color:#fff;border:none;border-radius:50%;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .f19c-input button:disabled{opacity:.5;cursor:not-allowed}
  .f19c-input button svg{width:18px;height:18px}
  @media(max-width:480px){.f19c-panel{bottom:84px;right:8px;left:8px;width:auto;height:calc(100vh - 100px)}}
  `;
  document.head.appendChild(style);

  var bubble = document.createElement("button");
  bubble.className = "f19c-bubble";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var panel = document.createElement("div");
  panel.className = "f19c-panel";
  panel.innerHTML =
    '<div class="f19c-header"><div><h3>F19 Tattoo Assistant</h3><p>Typically replies instantly</p></div><button class="f19c-close" aria-label="Close">✕</button></div>' +
    '<div class="f19c-body" id="f19c-body"></div>' +
    '<form class="f19c-input"><input type="text" placeholder="Type a message..." autocomplete="off" /><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></form>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var body = panel.querySelector("#f19c-body");
  var form = panel.querySelector("form");
  var input = panel.querySelector("input");
  var sendBtn = panel.querySelector("button[type=submit]");

  function renderMsg(role, text) {
    var div = document.createElement("div");
    div.className = "f19c-msg f19c-" + (role === "user" ? "user" : "bot");
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping(show) {
    var t = document.getElementById("f19c-typing");
    if (show && !t) {
      t = document.createElement("div");
      t.id = "f19c-typing";
      t.className = "f19c-typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(t);
      body.scrollTop = body.scrollHeight;
    } else if (!show && t) t.remove();
  }

  function openPanel() {
    open = true;
    panel.classList.add("f19c-open");
    bubble.style.display = "none";
    if (messages.length === 0) {
      var welcome = "👋 Hi! Welcome to F19 Tattoo Studio.\n\nAsk me anything about tattoos, pricing or booking an appointment!";
      renderMsg("assistant", welcome);
      messages.push({ role: "assistant", content: welcome });
    }
    setTimeout(function () { input.focus(); }, 100);
  }
  function closePanel() {
    open = false;
    panel.classList.remove("f19c-open");
    bubble.style.display = "flex";
  }

  bubble.addEventListener("click", openPanel);
  panel.querySelector(".f19c-close").addEventListener("click", closePanel);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    renderMsg("user", text);
    messages.push({ role: "user", content: text });
    sending = true;
    sendBtn.disabled = true;
    showTyping(true);

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY },
      body: JSON.stringify({ messages: messages, sessionId: sessionId }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        showTyping(false);
        var reply = res.ok ? (res.d.reply || "...") : (res.d.error || "Something went wrong. Please try again.");
        renderMsg("assistant", reply);
        messages.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        showTyping(false);
        renderMsg("assistant", "Network error. Please check your connection and try again.");
      })
      .finally(function () { sending = false; sendBtn.disabled = false; input.focus(); });
  });
})();
