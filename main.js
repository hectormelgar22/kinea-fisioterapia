/* ============================================================
   KINEA — interacciones (vanilla JS, IIFE, sin dependencias)
   ============================================================ */
(function () {
  "use strict";

  const brand   = window.__BRAND__ || {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine    = matchMedia("(pointer: fine)").matches;

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const safe = (fn, name) => { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } };

  /* ---- Datos de marca en el DOM ---- */
  function initBrand() {
    $$("[data-brand]").forEach((el) => {
      const key = el.getAttribute("data-brand");
      const val = brand[key];
      if (!val) return;
      el.textContent = val;
      if (el.tagName === "A") {
        if (key === "phone") el.href = "tel:" + val.replace(/\s+/g, "");
        if (key === "email") el.href = "mailto:" + val;
      }
    });
    $$("[data-brand-social]").forEach((el) => {
      const k = el.getAttribute("data-brand-social");
      if (brand.social && brand.social[k]) el.href = brand.social[k];
    });
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---- Nav: blur al scroll + barra de progreso ---- */
  function initNav() {
    const nav = $("#nav");
    if (!nav) return; // subpáginas usan .subnav
    const prog = $("#navProgress");
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 40);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Mobile menu
    const toggle = $("#navToggle");
    const menu = $("#mobileMenu");
    if (toggle && menu) {
      const setOpen = (open) => {
        menu.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-hidden", String(!open));
        document.body.style.overflow = open ? "hidden" : "";
      };
      toggle.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
      $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    }
  }

  /* ---- Reveal on scroll ---- */
  function initReveal() {
    const items = $$("[data-reveal], .hero-title .line");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    // Stagger dentro de contenedores con varios [data-reveal]
    items.forEach((el, i) => {
      const delay = (i % 6) * 70;
      el.style.transitionDelay = delay + "ms";
      io.observe(el);
    });
  }

  /* ---- Contadores animados ---- */
  function initCounters() {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const run = (el) => {
      const target = parseFloat(el.getAttribute("data-count")) || 0;
      const suffix = el.getAttribute("data-suffix") || "";
      const dur = 1600;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = Math.floor(eased * target);
        el.textContent = v.toLocaleString("es-ES") + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString("es-ES") + suffix;
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  }

  /* ---- Tilt 3D en tarjetas ---- */
  function initTilt() {
    if (!fine || reduced) return;
    $$("[data-tilt]").forEach((el) => {
      const MAX = 8;
      let raf = null;
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform =
            "perspective(900px) rotateY(" + (px * MAX) + "deg) rotateX(" + (-py * MAX) + "deg) translateY(-4px)";
        });
      };
      const reset = () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "";
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", reset);
    });
  }

  /* ---- Botones magnéticos ---- */
  function initMagnetic() {
    if (!fine || reduced) return;
    $$("[data-magnetic]").forEach((el) => {
      const S = 0.28;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + x * S + "px," + y * S + "px)";
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---- Parallax suave del mesh del hero ---- */
  function initHeroParallax() {
    if (reduced) return;
    const meshes = $$(".mesh");
    if (!meshes.length) return;
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          meshes.forEach((m, i) => {
            const speed = (i + 1) * 0.04;
            m.style.marginTop = (y * speed) + "px";
          });
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- Smooth scroll anclas (robusto en Windows) ---- */
  function initAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const tgt = document.querySelector(id);
        if (!tgt) return;
        e.preventDefault();
        const top = tgt.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      });
    });
  }

  /* ---- Formulario (demo, sin backend) ---- */
  function initForm() {
    const form = $("#contactForm");
    const note = $("#formNote");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.className = "form-note";
      if (!form.checkValidity()) {
        note.textContent = "Revisa los campos obligatorios, por favor.";
        note.classList.add("err");
        form.reportValidity();
        return;
      }
      const name = ($("#nombre", form).value || "").split(" ")[0];
      note.textContent = "¡Gracias" + (name ? ", " + name : "") + "! Te contactaremos en menos de 24 h. (Formulario de demostración — conecta aquí tu email o CRM.)";
      note.classList.add("ok");
      form.reset();
    });
  }

  /* ============================================================
     Escena 3D · Holograma anatómico con musculatura volumétrica
     Cuerpo continuo estilo rayos X + músculos como volúmenes 3D
     reales (nada de líneas) + gafas de sol holográficas.
     · Cámara: primer plano de la cara → cuerpo completo.
     · La cabeza sigue al cursor; el cuerpo gira solo al arrastrar.
     · Zoom hacia el cursor (rueda / pellizco), doble clic = reset.
     ============================================================ */
  function initHero3D() {
    const host = $("#hero3d");
    if (!host) return;
    const canvas = $("#robotCanvas", host);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const coarse = matchMedia("(pointer: coarse)").matches;
    const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

    /* ---------- Geometría ----------
       Cada pieza = lista de nodos [x, y, z, rx, rz] (sección elíptica).
       Se proyecta el contorno y se rellena → silueta sólida 3D. */
    const parts = [];
    const addPart = (nodes, o) => parts.push(Object.assign({ nodes: nodes }, o || {}));

    // Músculo = elipsoide volumétrico. face: 1 delante, -1 detrás, 0 neutro.
    const addMuscle = (cx, cy, cz, rx, ry, rz, face, breath) => {
      const n = [];
      for (let i = 0; i <= 4; i++) {
        const t = (i / 4) * 2 - 1;
        const q = Math.sqrt(Math.max(0.08, 1 - t * t));
        n.push([cx, cy + ry * t, cz, rx * q, rz * q]);
      }
      addPart(n, { muscle: 1, face: face || 0, breath: breath || 0 });
    };

    // Cabeza (gira con la mirada)
    (function () {
      const n = [];
      for (let i = 0; i <= 8; i++) {
        const yy = -168 + (i / 8) * 36;
        const q = Math.max(0.06, 1 - Math.pow((yy + 150) / 19, 2));
        const w = Math.sqrt(q);
        n.push([0, yy, 0, 15.5 * w, 16.5 * w]);
      }
      addPart(n, { head: 1 });
    })();

    // Cuello
    addPart([[0, -134, 0, 7.5, 7], [0, -125, 0, 8.2, 7.5], [0, -116, 0, 12, 10]]);

    // Torso en V masculino
    addPart([
      [0, -117, 0, 27, 15.7], [0, -107, 0, 31.5, 18.3], [0, -97, 0, 33.5, 19.4],
      [0, -87, 0, 31.5, 18.3], [0, -74, 0, 28, 16.2], [0, -61, 0, 25, 14.5],
      [0, -48, 0, 24, 13.9], [0, -34, 0, 24.8, 14.4], [0, -20, 0, 26.5, 15.4], [0, -7, 0, 23.5, 13.6]
    ], { breath: 1 });

    // Extremidades — pose anatómica natural (brazos algo separados, codo suave)
    [-1, 1].forEach(function (s) {
      addPart([ // brazo: hombro → codo
        [29 * s, -106, 0, 12.5, 11.5], [31.5 * s, -97, -1, 12, 11], [34 * s, -88, -2, 12.5, 11],
        [36 * s, -80, -3, 10.5, 9.5], [38 * s, -72, -4, 9, 8.5]
      ]);
      addPart([ // antebrazo: codo → muñeca
        [38 * s, -72, -4, 9, 8.5], [39.5 * s, -62, -5, 9.5, 8.5],
        [41 * s, -50, -6, 7.5, 7], [42 * s, -38, -6, 5.8, 5.2]
      ]);
      addPart([ // mano
        [42 * s, -38, -6, 5.5, 5], [43.5 * s, -29, -6, 5.8, 4.5], [44.5 * s, -22, -6, 3.4, 3]
      ]);
      addPart([ // muslo
        [11 * s, -14, 0, 13, 12], [12 * s, 4, 0, 14.5, 13], [13 * s, 22, 0, 13.5, 12],
        [13.5 * s, 38, 0, 11.2, 10], [14 * s, 54, 0, 9.2, 8.6]
      ]);
      addPart([ // pierna
        [14 * s, 54, 0, 9.2, 8.6], [14.5 * s, 66, 0.5, 10, 9], [15 * s, 80, 0.5, 8.6, 7.6],
        [15.3 * s, 100, 0, 6.6, 6], [15.5 * s, 118, 0, 5.6, 5]
      ]);
      addPart([ // pie
        [15.5 * s, 120, -2, 5.4, 5], [15.5 * s, 126, -8, 4.8, 7], [15.5 * s, 130, -13, 3.6, 5]
      ]);

      /* --- Musculatura volumétrica (delante z-, detrás z+) --- */
      addMuscle(11 * s, -94, -12, 11, 8, 5, 1, 1);        // pectoral
      addMuscle(5 * s, -77, -12.5, 4.8, 5, 3, 1, 0);      // abdominales (6)
      addMuscle(5 * s, -66, -13, 4.8, 5, 3, 1, 0);
      addMuscle(5 * s, -55, -13, 4.8, 5, 3, 1, 0);
      addMuscle(13.5 * s, -55, -8, 4, 11, 3.5, 1, 0);     // oblicuo
      addMuscle(29 * s, -104, 0, 9.5, 10, 9.5, 0, 0);     // deltoides
      addMuscle(33.5 * s, -89, -8, 6, 11, 4.5, 1, 0);     // bíceps
      addMuscle(33.5 * s, -89, 7, 5.2, 10, 4, -1, 0);     // tríceps
      addMuscle(40 * s, -54, -8, 4.6, 10, 4, 1, 0);       // flexores antebrazo
      addMuscle(12 * s, 10, -8.5, 7, 20, 5, 1, 0);        // cuádriceps (recto)
      addMuscle(8 * s, 30, -9, 4.5, 11, 4, 1, 0);         // vasto interno
      addMuscle(16 * s, 14, -6, 4.5, 14, 4, 1, 0);        // vasto externo
      addMuscle(15 * s, 86, -6, 3.5, 15, 3, 1, 0);        // tibial
      addMuscle(10 * s, -112, 8, 9, 6, 5, -1, 0);         // trapecio
      addMuscle(15 * s, -82, 9, 7, 15, 4.5, -1, 0);       // dorsal
      addMuscle(10 * s, -8, 10, 8.5, 9, 5.5, -1, 0);      // glúteo
      addMuscle(13 * s, 22, 9, 6, 17, 4.5, -1, 0);        // isquiotibial
      addMuscle(14.5 * s, 72, 7, 5.5, 13, 4.5, -1, 0);    // gemelo
    });

    // Articulaciones con glow
    const JOINTS = [
      [0, -116, 0],
      [-29, -107, 0], [29, -107, 0], [-38, -72, -4], [38, -72, -4], [-44, -24, -6], [44, -24, -6],
      [-12, -14, 0], [12, -14, 0], [-14, 54, 0], [14, 54, 0], [-15.5, 118, 0], [15.5, 118, 0]
    ];

    // Sprite de glow
    const glow = document.createElement("canvas");
    glow.width = glow.height = 32;
    (function () {
      const g = glow.getContext("2d");
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, "rgba(235,255,250,.95)");
      grd.addColorStop(0.4, "rgba(110,235,205,.5)");
      grd.addColorStop(1, "rgba(110,235,205,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    })();

    // Sprite de glow rojo (zonas de dolor)
    const redGlow = document.createElement("canvas");
    redGlow.width = redGlow.height = 32;
    (function () {
      const g = redGlow.getContext("2d");
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, "rgba(255,238,232,.98)");
      grd.addColorStop(0.35, "rgba(255,78,68,.78)");
      grd.addColorStop(1, "rgba(255,60,55,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    })();

    // Zonas de dolor comunes → marcador rojo + etiqueta
    const PAINS = [
      [0, -122, -2, "Cervicales"],
      [30, -104, -1, "Hombro"],
      [0, -32, 13, "Lumbares"],
      [17, -14, 3, "Cadera"],
      [-14, 56, -5, "Rodilla"],
      [15.5, 116, -3, "Tobillo"]
    ];

    /* ---------- Canvas ---------- */
    let W = 0, H = 0, hostRect = host.getBoundingClientRect();
    function resize() {
      const r = host.getBoundingClientRect();
      if (!r.width) return;
      hostRect = r;
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
    else window.addEventListener("resize", resize);
    const cacheRect = () => { const r = host.getBoundingClientRect(); if (r.width) hostRect = r; };
    window.addEventListener("scroll", cacheRect, { passive: true });

    // Pausa el render cuando la portada no está a la vista
    let inView = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.01 }).observe(host);
    }

    /* ---------- Interacción ---------- */
    const clampZ = (z) => Math.max(0.55, Math.min(2.6, z));
    let spin = 0, spinVel = 0, dragging = false, lastX = 0, lastY = 0;
    let tiltV = 0;
    let userZoom = 1, targetUZ = 1, userZoomPrev = 1;
    let panX = 0, panY = 0, anchorX = 0, anchorY = 0;
    let resetSpin = false, resetView = false;
    let hy = 0, hp = 0, lookYaw = 0, lookPitch = 0;
    const pointers = new Map();
    let pinchD = 0;

    host.addEventListener("pointerdown", (e) => {
      try { host.setPointerCapture(e.pointerId); } catch (err) {}
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragging = true; resetSpin = false; spinVel = 0;
        lastX = e.clientX; lastY = e.clientY;
        host.classList.add("dragging");
      } else if (pointers.size === 2) {
        dragging = false;
        const a = Array.from(pointers.values());
        pinchD = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      }
    });

    host.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const a = Array.from(pointers.values());
        const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        anchorX = (a[0].x + a[1].x) / 2 - hostRect.left;
        anchorY = (a[0].y + a[1].y) / 2 - hostRect.top;
        resetView = false;
        if (pinchD > 0) targetUZ = clampZ(targetUZ * (d / pinchD));
        pinchD = d;
      } else if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        spin += dx * 0.009;
        spinVel = dx * 0.009;
        tiltV = Math.max(-0.35, Math.min(0.35, tiltV + dy * 0.004));
      }
    });

    const endPointer = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchD = 0;
      if (pointers.size === 0) { dragging = false; host.classList.remove("dragging"); }
    };
    host.addEventListener("pointerup", endPointer);
    host.addEventListener("pointercancel", endPointer);

    // Rueda / pinch de trackpad = zoom hacia el cursor, SOLO dentro de la tarjeta 3D
    host.addEventListener("wheel", (e) => {
      e.preventDefault();
      anchorX = e.clientX - hostRect.left;
      anchorY = e.clientY - hostRect.top;
      resetView = false;
      const d = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 120 : 1);
      targetUZ = clampZ(targetUZ * Math.exp(-d * 0.0014));
    }, { passive: false });

    // Doble clic / doble tap = volver al encuadre inicial
    host.addEventListener("dblclick", (e) => {
      e.preventDefault();
      targetUZ = 1; tiltV = 0; resetSpin = true; resetView = true;
    });

    // La cabeza sigue al cursor en toda la ventana
    window.addEventListener("pointermove", (e) => {
      const r = hostRect;
      if (!r.width) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height * 0.32)) / r.height;
      lookYaw = Math.max(-0.6, Math.min(0.6, -dx * 1.2));
      lookPitch = Math.max(-0.3, Math.min(0.38, dy * 0.75));
    }, { passive: true });

    // Pista de uso según dispositivo
    const cap = $(".hero-3d-caption", host);
    if (cap) cap.innerHTML = '<span class="dot-live"></span> ' +
      (coarse ? "Arrastra para girar · Pellizca para acercar" : "Arrastra para girar · Rueda para acercar");

    /* ---------- Cámara y bucle ---------- */
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;
    const F = 460, D = 320, TAU = Math.PI * 2;
    const HOLD = 600, DUR = 3000;
    let t0 = performance.now(), started = false;

    const moveSmooth = (a) => {
      ctx.moveTo(a[0], a[1]);
      for (let i = 2; i < a.length - 2; i += 2) {
        ctx.quadraticCurveTo(a[i], a[i + 1], (a[i] + a[i + 2]) / 2, (a[i + 1] + a[i + 3]) / 2);
      }
      ctx.lineTo(a[a.length - 2], a[a.length - 1]);
    };
    const lineSmoothRev = (a) => {
      ctx.lineTo(a[a.length - 2], a[a.length - 1]);
      for (let i = a.length - 4; i >= 2; i -= 2) {
        ctx.quadraticCurveTo(a[i], a[i + 1], (a[i] + a[i - 2]) / 2, (a[i + 1] + a[i - 1]) / 2);
      }
      ctx.lineTo(a[0], a[1]);
    };

    (function frame(now) {
      requestAnimationFrame(frame);
      if (!W) return;
      if (!started) { if (!inView) return; started = true; t0 = now; }
      if (!inView) return;

      let p, idle;
      if (reduced) { p = 1; idle = 0; }
      else {
        const e = now - t0;
        p = e < HOLD ? 0 : easeIO(Math.min((e - HOLD) / DUR, 1));
        idle = Math.max(0, Math.min((e - HOLD - DUR) / 900, 1));
      }

      // Giro: solo arrastre + inercia
      if (!dragging) {
        spin += spinVel; spinVel *= 0.94;
        tiltV *= 0.93;
      }
      if (resetSpin) {
        const m = spin % TAU;
        const target = spin - (m > Math.PI ? m - TAU : m < -Math.PI ? m + TAU : m);
        spin += (target - spin) * 0.12;
        if (Math.abs(target - spin) < 0.002) { spin = target; resetSpin = false; }
      }
      userZoom += (targetUZ - userZoom) * 0.12;

      // Vida: respiración, balanceo, bob
      const br = reduced ? 0 : Math.sin(now / 1400) * 0.022 * (0.4 + 0.6 * idle);
      const sway = reduced ? 0 : Math.sin(now / 2400) * 0.032 * idle;
      const bob = reduced ? 0 : Math.sin(now / 1800) * 1.6 * idle;

      const camY = lerp(-150, -19, p) - bob;
      const K = (F + D) / F;
      const zoom = lerp(
        Math.min(H * 0.5 / 40, W * 0.5 / 36) * K,      // encuadre cara
        Math.min(H * 0.86 / 310, W * 0.86 / 104) * K,  // encuadre cuerpo completo
        p
      ) * userZoom;

      const fade = Math.min((now - t0) / 500, 1);
      const rot = spin + sway + (1 - p) * -0.22;
      const tilt = tiltV;

      // Cabeza mira al cursor
      let sm = spin % TAU;
      if (sm > Math.PI) sm -= TAU; else if (sm < -Math.PI) sm += TAU;
      const facing = Math.abs(sm) < 1.6;
      hy += ((facing ? Math.max(-0.7, Math.min(0.7, lookYaw - sm)) : 0) - hy) * 0.1;
      hp += ((facing ? lookPitch : 0) - hp) * 0.1;

      const cosA = Math.cos(rot), sinA = Math.sin(rot);
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const cosH = Math.cos(hy), sinH = Math.sin(hy);
      const cosP = Math.cos(hp), sinP = Math.sin(hp);
      const cx = W / 2, cy = H / 2;

      // Zoom hacia el cursor
      if (resetView) {
        panX += -panX * 0.15; panY += -panY * 0.15;
        if (Math.abs(panX) < 0.4 && Math.abs(panY) < 0.4 && Math.abs(userZoom - targetUZ) < 0.01) {
          panX = 0; panY = 0; resetView = false;
        }
      } else {
        const f = userZoomPrev > 0 ? userZoom / userZoomPrev : 1;
        panX = (anchorX - cx) * (1 - f) + panX * f;
        panY = (anchorY - cy) * (1 - f) + panY * f;
        const mpx = W * 0.55, mpy = H * 0.55;
        panX = panX > mpx ? mpx : panX < -mpx ? -mpx : panX;
        panY = panY > mpy ? mpy : panY < -mpy ? -mpy : panY;
      }
      userZoomPrev = userZoom;
      const ox = cx + panX, oy = cy + panY;

      const TP = (x, y, z, isHead) => {
        if (isHead) {
          const dx = x, dy = y + 140, dz = z;
          const tx = dx * cosH + dz * sinH;
          let tz = dz * cosH - dx * sinH;
          const ty2 = dy * cosP - tz * sinP;
          tz = dy * sinP + tz * cosP;
          x = tx; y = ty2 - 140; z = tz;
        }
        const xr = x * cosA + z * sinA;
        const zr = z * cosA - x * sinA;
        const yc = y - camY;
        const y2 = yc * cosT - zr * sinT;
        const z2 = yc * sinT + zr * cosT;
        const s = F / (F + z2 + D);
        return [ox + xr * s * zoom, oy + y2 * s * zoom, z2, s];
      };

      // Orientación del cuerpo: 1 = frente a cámara, -1 = de espaldas
      let rotN = rot % TAU;
      if (rotN > Math.PI) rotN -= TAU; else if (rotN < -Math.PI) rotN += TAU;
      const faceBody = Math.cos(rotN);
      const vFace = Math.max(0, Math.cos(rotN + hy)) * fade;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";

      /* --- 1. Siluetas: cuerpo + músculos volumétricos --- */
      const rendered = [];
      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi];
        const L = [], R = [], C = [];
        let zSum = 0, wSum = 0, count = 0;
        for (let ni = 0; ni < part.nodes.length; ni++) {
          const nd = part.nodes[ni];
          let x = nd[0], y = nd[1], z = nd[2], rx = nd[3], rz = nd[4];
          if (part.breath && y < -40) { rx *= (1 + br); rz *= (1 + br); }
          let hx = x, hyy = y, hz = z;
          if (part.head) {
            const dx = x, dy = y + 140, dz = z;
            const tx = dx * cosH + dz * sinH;
            let tz = dz * cosH - dx * sinH;
            const ty2 = dy * cosP - tz * sinP;
            tz = dy * sinP + tz * cosP;
            hx = tx; hyy = ty2 - 140; hz = tz;
          }
          const xr = hx * cosA + hz * sinA;
          const zr = hz * cosA - hx * sinA;
          const yc = hyy - camY;
          const y2 = yc * cosT - zr * sinT;
          const z2 = yc * sinT + zr * cosT;
          const s = F / (F + z2 + D);
          if (s <= 0) continue;
          const sx = ox + xr * s * zoom, sy = oy + y2 * s * zoom;
          const w = Math.sqrt(rx * cosA * rx * cosA + rz * sinA * rz * sinA) * s * zoom;
          L.push(sx - w, sy); R.push(sx + w, sy); C.push(sx, sy);
          zSum += z2; wSum += w; count++;
        }
        if (count < 3) continue;
        rendered.push({ L: L, R: R, C: C, z: zSum / count, w: wSum / count, muscle: part.muscle || 0, face: part.face || 0 });
      }
      rendered.sort((a, b) => b.z - a.z);

      for (let ri = 0; ri < rendered.length; ri++) {
        const rp = rendered[ri];
        const af = Math.max(0.45, Math.min(1, 1 - rp.z * 0.0035)) * fade;

        ctx.beginPath();
        moveSmooth(rp.L);
        lineSmoothRev(rp.R);
        ctx.closePath();

        if (rp.muscle) {
          // Músculo volumétrico: más visible en su cara del cuerpo
          const dirV = rp.face === 0 ? 1 : 0.3 + 0.7 * Math.max(0, rp.face * faceBody);
          const a2 = af * dirV;
          if (a2 <= 0.04) continue;
          ctx.fillStyle = "rgba(90,200,225," + (0.22 * a2).toFixed(3) + ")";
          ctx.fill();
          ctx.strokeStyle = "rgba(160,245,225," + (0.5 * a2).toFixed(3) + ")";
          ctx.lineWidth = 1.1;
          ctx.stroke();
          // núcleo brillante → sensación de bulto 3D
          ctx.strokeStyle = "rgba(150,235,230," + (0.14 * a2).toFixed(3) + ")";
          ctx.lineWidth = Math.max(2, rp.w * 0.65);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(rp.C[0], rp.C[1]);
          for (let i = 2; i < rp.C.length; i += 2) ctx.lineTo(rp.C[i], rp.C[i + 1]);
          ctx.stroke();
        } else {
          // Cuerpo base translúcido con borde luminoso
          ctx.fillStyle = "rgba(62,150,205," + (0.12 * af).toFixed(3) + ")";
          ctx.fill();
          if (!lowPower) {
            ctx.strokeStyle = "rgba(80,205,235," + (0.16 * af).toFixed(3) + ")";
            ctx.lineWidth = 5;
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(140,240,215," + (0.85 * af).toFixed(3) + ")";
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.strokeStyle = "rgba(90,205,235," + (0.09 * af).toFixed(3) + ")";
          ctx.lineWidth = Math.max(2, rp.w * 0.9);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(rp.C[0], rp.C[1]);
          for (let i = 2; i < rp.C.length; i += 2) ctx.lineTo(rp.C[i], rp.C[i + 1]);
          ctx.stroke();
        }
      }

      /* --- 2. Gafas de sol holográficas (giran con la cabeza) --- */
      if (vFace > 0.03) {
        const lensAlpha = (0.42 + (reduced ? 0 : 0.14 * Math.sin(now / 600))) * vFace;
        for (let sgn = -1; sgn <= 1; sgn += 2) {
          ctx.beginPath();
          for (let i = 0; i <= 14; i++) {
            const a = (i / 14) * TAU;
            const P = TP(sgn * 6.4 + Math.cos(a) * 5.2, -152.5 + Math.sin(a) * 4, -13.5, true);
            if (i === 0) ctx.moveTo(P[0], P[1]); else ctx.lineTo(P[0], P[1]);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(120,235,215," + lensAlpha.toFixed(3) + ")";
          ctx.fill();
          ctx.strokeStyle = "rgba(190,250,235," + (0.85 * vFace).toFixed(3) + ")";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        // puente y patillas
        ctx.strokeStyle = "rgba(190,250,235," + (0.7 * vFace).toFixed(3) + ")";
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        let P1 = TP(-1.3, -153.2, -14.2, true), P2 = TP(1.3, -153.2, -14.2, true);
        ctx.moveTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]);
        P1 = TP(-11.6, -152.5, -12, true); P2 = TP(-15, -150.5, -3, true);
        ctx.moveTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]);
        P1 = TP(11.6, -152.5, -12, true); P2 = TP(15, -150.5, -3, true);
        ctx.moveTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]);
        ctx.stroke();
      }

      /* --- 3. Articulaciones con glow --- */
      for (let ji = 0; ji < JOINTS.length; ji++) {
        const J = JOINTS[ji];
        const P = TP(J[0], J[1], J[2], false);
        if (P[3] <= 0) continue;
        const size = Math.min(18, 8 * P[3] * zoom);
        ctx.globalAlpha = 0.4 * fade;
        ctx.drawImage(glow, P[0] - size / 2, P[1] - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      /* --- 3b. Zonas de dolor comunes (marcadores rojos + etiquetas) --- */
      const showLabels = p > 0.9 && userZoom < 1.4;
      const labelsToDraw = [];
      for (let qi = 0; qi < PAINS.length; qi++) {
        const Z = PAINS[qi];
        const zr = Z[2] * cosA - Z[0] * sinA;
        const vis = (zr < 4 ? 1 : Math.max(0.12, 1 - (zr - 4) / 20)) * fade;
        if (vis <= 0.05) continue;
        const P = TP(Z[0], Z[1], Z[2], false);
        if (P[3] <= 0) continue;
        const pr = reduced ? 0.9 : 0.55 + 0.45 * Math.sin(now / 480 + qi * 1.3);
        const size = Math.min(22, 10 * P[3] * zoom);
        ctx.globalAlpha = vis * pr;
        ctx.drawImage(redGlow, P[0] - size / 2, P[1] - size / 2, size, size);
        ctx.globalAlpha = vis;
        ctx.fillStyle = "rgba(255,120,110,0.95)";
        ctx.beginPath(); ctx.arc(P[0], P[1], Math.max(1.5, size * 0.12), 0, TAU); ctx.fill();
        if (showLabels && vis > 0.5) labelsToDraw.push([P[0], P[1], Z[3], vis]);
      }
      ctx.globalAlpha = 1;
      if (labelsToDraw.length) {
        ctx.globalCompositeOperation = "source-over";
        ctx.font = "600 11px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        for (let li = 0; li < labelsToDraw.length; li++) {
          const Lb = labelsToDraw[li];
          const left = Lb[0] < cx;
          const lx = left ? 12 : W - 12;
          ctx.strokeStyle = "rgba(255,110,100," + (0.45 * Lb[3]).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Lb[0], Lb[1]);
          ctx.lineTo(left ? lx + 40 : lx - 40, Lb[1]);
          ctx.stroke();
          ctx.fillStyle = "rgba(255,150,140," + Lb[3].toFixed(3) + ")";
          ctx.textAlign = left ? "left" : "right";
          ctx.fillText(Lb[2], lx, Lb[1]);
        }
        ctx.textAlign = "left";
        ctx.globalCompositeOperation = "lighter";
      }

      /* --- 4. Base holográfica bajo los pies --- */
      if (p > 0.55) {
        const ba = ((p - 0.55) / 0.45) * 0.5;
        const yc = 132 - camY;
        const y2 = yc * cosT, z2 = yc * sinT;
        const s = F / (F + z2 + D);
        const gy = oy + y2 * s * zoom;
        ctx.strokeStyle = "rgba(82,240,190,.8)";
        for (let k = 0; k < 3; k++) {
          const rr = (38 + k * 17) * s * zoom;
          ctx.globalAlpha = ba * (1 - k * 0.3);
          ctx.lineWidth = k === 0 ? 1.5 : 1;
          ctx.beginPath();
          ctx.ellipse(ox, gy, rr, rr * 0.24, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = ba * 0.9;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(96,190,235,.9)";
        ctx.beginPath();
        ctx.ellipse(ox, gy, 64 * s * zoom, 64 * s * zoom * 0.24, 0, spin * 1.5, spin * 1.5 + 1.1);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    })(performance.now());
  }

  /* ---- FAQ (acordeón accesible, una abierta a la vez) ---- */
  function initFaq() {
    const items = $$(".faq-item");
    if (!items.length) return;
    items.forEach((it) => {
      const btn = $(".faq-q", it);
      if (!btn) return;
      btn.addEventListener("click", () => {
        const isOpen = it.classList.contains("open");
        items.forEach((o) => {
          o.classList.remove("open");
          const b = $(".faq-q", o);
          if (b) b.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) { it.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
      });
    });
  }

  /* ---- Boot ---- */
  function boot() {
    safe(initBrand, "initBrand");
    safe(initNav, "initNav");
    safe(initReveal, "initReveal");
    safe(initCounters, "initCounters");
    safe(initTilt, "initTilt");
    safe(initMagnetic, "initMagnetic");
    safe(initHeroParallax, "initHeroParallax");
    safe(initHero3D, "initHero3D");
    safe(initFaq, "initFaq");
    safe(initAnchors, "initAnchors");
    safe(initForm, "initForm");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
