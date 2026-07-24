/* Sentia · Widget de chat con IA — vanilla IIFE, sin frameworks.
   Llama SIEMPRE a tu backend (Worker o PHP), nunca a Gemini directamente. */
(function () {
  "use strict";

  /* ===== CONFIGURACIÓN — única línea a cambiar al migrar de backend ===== */
var CHAT_BACKEND = "https://fisio-chat.hector22melgar.workers.dev/";  // Al migrar a Hostinger:  var CHAT_BACKEND = "https://tudominio.com/api/chat.php";

  var MAX_INPUT = 1000;
  var history = []; // {role: "user"|"assistant", text}
  var busy = false;

  function build() {
    var root = document.createElement("div");
    root.className = "chat-root";
    root.innerHTML =
      '<button type="button" class="chat-fab" aria-label="Abrir asistente con IA de Sentia" aria-expanded="false">' +
      '<span class="chat-fab-icon" aria-hidden="true">' +
      // Icono: bocadillo de chat + un destello — legible al instante como
      // "chat con IA", sin la ambigüedad del cerebro/nodo anterior.
      '<svg viewBox="0 0 26 26" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 7.9A3.4 3.4 0 0 1 8.4 4.5h8.7A3.4 3.4 0 0 1 20.5 7.9v5.6a3.4 3.4 0 0 1-3.4 3.4h-6l-4.3 3.4v-3.4H8.4A3.4 3.4 0 0 1 5 13.5V7.9Z"/>' +
      '<path d="M9 9.6h7.5M9 12.6h4.8" stroke-width="1.5"/>' +
      '<path d="M20.3 2.6l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="currentColor" stroke="none"/>' +
      "</svg>" +
      "</span>" +
      '<span class="chat-fab-close" aria-hidden="true">×</span>' +
      "</button>" +
      '<section class="chat-panel" hidden aria-label="Asistente con IA de Sentia">' +
      '<header class="chat-header">' +
      // Avatar con el mismo icono, pequeño, sobre gradiente de marca
      '<span class="chat-header-avatar" aria-hidden="true">' +
      '<svg viewBox="0 0 26 26" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 7.9A3.4 3.4 0 0 1 8.4 4.5h8.7A3.4 3.4 0 0 1 20.5 7.9v5.6a3.4 3.4 0 0 1-3.4 3.4h-6l-4.3 3.4v-3.4H8.4A3.4 3.4 0 0 1 5 13.5V7.9Z"/>' +
      '<path d="M9 9.6h7.5M9 12.6h4.8" stroke-width="1.5"/>' +
      "</svg>" +
      "</span>" +
      "<div><strong>Asistente IA de Sentia</strong>" +
      "<small>Respuestas informativas · en segundos</small></div>" +
      "</header>" +
      '<div class="chat-messages" role="log" aria-live="polite"></div>' +
      '<form class="chat-form">' +
      '<label class="sr-only" for="chat-input">Escribe tu mensaje</label>' +
      '<textarea id="chat-input" class="chat-input" rows="1" maxlength="' + MAX_INPUT + '" placeholder="Escribe tu duda…"></textarea>' +
      '<button type="submit" class="chat-send" aria-label="Enviar">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
      "</button>" +
      "</form>" +
      '<p class="chat-disclaimer">Asistente informativo con IA — no sustituye atención profesional. En crisis llama al <a href="tel:024">024</a>.</p>' +
      "</section>";
    document.body.appendChild(root);
    return root;
  }

  function addMessage(container, role, text) {
    var msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-" + role;
    // solo texto plano — nunca innerHTML con contenido del modelo o del usuario
    var lines = String(text).split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (i > 0) msg.appendChild(document.createElement("br"));
      msg.appendChild(document.createTextNode(lines[i]));
    }
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  function addTyping(container) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg-assistant chat-typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function send(messages, input, sendBtn) {
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "";

    addMessage(messages, "user", text);
    history.push({ role: "user", text: text });
    var typing = addTyping(messages);

    fetch(CHAT_BACKEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(0, -1).slice(-8) })
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        typing.remove();
        var reply = r.data && (r.data.reply || r.data.error) ||
          "No he podido conectar. Inténtalo de nuevo o escríbenos por el formulario de contacto.";
        addMessage(messages, "assistant", reply);
        if (r.ok && r.data && r.data.reply) {
          history.push({ role: "assistant", text: r.data.reply });
        }
      })
      .catch(function () {
        typing.remove();
        addMessage(messages, "assistant",
          "Ahora mismo no puedo conectar con el asistente. Puedes escribirnos por el formulario de contacto y te respondemos en menos de 24 h laborables.");
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  function init() {
    var root = build();
    var fab = root.querySelector(".chat-fab");
    var panel = root.querySelector(".chat-panel");
    var messages = root.querySelector(".chat-messages");
    var form = root.querySelector(".chat-form");
    var input = root.querySelector(".chat-input");
    var sendBtn = root.querySelector(".chat-send");
    var greeted = false;

    fab.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      root.classList.toggle("is-open", open);
      if (open) {
        if (!greeted) {
          greeted = true;
          addMessage(messages, "assistant",
            "Hola 👋 Soy el asistente de Sentia. Puedo resolver dudas sobre la terapia, cómo trabajamos o por dónde empezar. ¿En qué te puedo ayudar?");
        }
        input.focus();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        fab.setAttribute("aria-expanded", "false");
        root.classList.remove("is-open");
        fab.focus();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      send(messages, input, sendBtn);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(messages, input, sendBtn);
      }
    });
    input.addEventListener("input", function () {
      input.style.height = "";
      input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
