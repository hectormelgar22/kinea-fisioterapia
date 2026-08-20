/* Kinea · Widget de chat con IA — vanilla IIFE, sin frameworks.
   El endpoint se configura en lib/manifest.js (integrations.chatEndpoint).
   Llama SIEMPRE a tu backend (Worker o PHP), nunca al modelo directamente:
   así la API key nunca llega al navegador. */
(function () {
  "use strict";

  var brand = window.__BRAND__ || {};
  var CHAT_BACKEND = (brand.integrations && brand.integrations.chatEndpoint) || "";
  var NAME = brand.name || "el centro";

  // Sin endpoint configurado, el widget no se monta.
  if (!CHAT_BACKEND) return;

  var MAX_INPUT = 1000;
  var history = [];
  var busy = false;
  var built = false;
  var els = null;

  function iconSvg(size, sparkle) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      '<path d="M9 11.5h.01M15 11.5h.01" stroke-width="2.6" stroke-linecap="round"/>' +
      (sparkle ? '<path d="M19 2.5v3M20.5 4h-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' : "") +
      "</svg>";
  }

  /* El panel se construye la primera vez que se abre (ahorra DOM en la carga). */
  function buildPanel(root) {
    var panel = document.createElement("section");
    panel.className = "chat-panel";
    panel.setAttribute("aria-label", "Asistente con IA de " + NAME);
    panel.hidden = true;
    panel.innerHTML =
      '<header class="chat-header">' +
      '<span class="chat-header-avatar" aria-hidden="true">' + iconSvg(16, false) + "</span>" +
      "<div><strong>Asistente IA de " + NAME + "</strong>" +
      "<small>Respuestas informativas · en segundos</small></div>" +
      '<button type="button" class="chat-close" aria-label="Cerrar asistente">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      "</button>" +
      "</header>" +
      '<div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<form class="chat-form">' +
      '<label class="sr-only" for="chat-input">Escribe tu mensaje</label>' +
      '<textarea id="chat-input" class="chat-input" rows="1" maxlength="' + MAX_INPUT +
      '" placeholder="Escribe tu duda…" autocomplete="off"></textarea>' +
      '<button type="submit" class="chat-send" aria-label="Enviar mensaje">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
      "</button>" +
      "</form>" +
      '<p class="chat-disclaimer">Asistente informativo con IA — no sustituye atención profesional. ' +
      'En caso de urgencia llama al <a href="tel:112">112</a>.</p>';
    root.appendChild(panel);
    return panel;
  }

  function addMessage(container, role, text) {
    var msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-" + role;
    // Solo texto plano — nunca innerHTML con contenido del modelo o del usuario.
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
    el.setAttribute("aria-label", "Escribiendo…");
    el.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function send() {
    var text = els.input.value.trim();
    if (!text || busy) return;
    busy = true;
    els.sendBtn.disabled = true;
    els.input.value = "";
    els.input.style.height = "";

    addMessage(els.messages, "user", text);
    history.push({ role: "user", text: text });
    var typing = addTyping(els.messages);

    // Corta la espera si el backend no responde en 25 s.
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    fetch(CHAT_BACKEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(0, -1).slice(-8) }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        typing.remove();
        var reply = (r.data && (r.data.reply || r.data.error)) ||
          "No he podido conectar. Inténtalo de nuevo o escríbenos por el formulario de contacto.";
        addMessage(els.messages, "assistant", reply);
        if (r.ok && r.data && r.data.reply) {
          history.push({ role: "assistant", text: r.data.reply });
        }
      })
      .catch(function () {
        typing.remove();
        addMessage(els.messages, "assistant",
          "Ahora mismo no puedo conectar con el asistente. Puedes escribirnos por el formulario de contacto y te respondemos en menos de 24 h laborables.");
      })
      .then(function () {
        clearTimeout(timer);
        busy = false;
        els.sendBtn.disabled = false;
        els.input.focus();
      });
  }

  function init() {
    var root = document.createElement("div");
    root.className = "chat-root";
    root.innerHTML =
      '<button type="button" class="chat-fab" aria-label="Abrir asistente con IA de ' + NAME + '" aria-expanded="false">' +
      '<span class="chat-fab-tooltip">Asistente IA</span>' +
      '<span class="chat-fab-badge" aria-hidden="true">IA</span>' +
      '<span class="chat-fab-icon" aria-hidden="true">' + iconSvg(26, true) + "</span>" +
      '<span class="chat-fab-close" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      "</span></button>";
    document.body.appendChild(root);

    var fab = root.querySelector(".chat-fab");
    var panel = null;
    var greeted = false;

    function setOpen(open) {
      if (open && !built) {
        panel = buildPanel(root);
        built = true;
        els = {
          messages: panel.querySelector(".chat-messages"),
          input: panel.querySelector(".chat-input"),
          sendBtn: panel.querySelector(".chat-send")
        };
        panel.querySelector(".chat-form").addEventListener("submit", function (e) {
          e.preventDefault();
          send();
        });
        panel.querySelector(".chat-close").addEventListener("click", function () { setOpen(false); });
        els.input.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
        });
        els.input.addEventListener("input", function () {
          els.input.style.height = "";
          els.input.style.height = Math.min(els.input.scrollHeight, 110) + "px";
        });
      }
      if (panel) panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      root.classList.toggle("is-open", open);
      if (open) {
        if (!greeted) {
          greeted = true;
          addMessage(els.messages, "assistant",
            "Hola 👋 Soy el asistente de " + NAME + ". Puedo resolver dudas sobre los tratamientos, " +
            "cómo trabajamos o por dónde empezar. ¿En qué te puedo ayudar?");
        }
        els.input.focus();
      } else {
        fab.focus();
      }
    }

    fab.addEventListener("click", function () {
      setOpen(!root.classList.contains("is-open"));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("is-open")) setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
