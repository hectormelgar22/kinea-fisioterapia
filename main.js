/* ============================================================
   KINEA — interacciones (vanilla JS, IIFE, sin dependencias)
   ============================================================ */
(function () {
  "use strict";

  const brand    = window.__BRAND__ || {};
  const settings = brand.settings || {};
  const integr   = brand.integrations || {};
  const reduced  = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine     = matchMedia("(pointer: fine)").matches;
  const coarse   = matchMedia("(pointer: coarse)").matches;
  const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4 ||
                   (navigator.deviceMemory || 8) <= 4;

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
      const url = brand.social && brand.social[k];
      if (url && url !== "#") { el.href = url; el.rel = "noopener noreferrer"; el.target = "_blank"; }
      else { el.hidden = true; }
    });
    $$("#year").forEach((el) => { el.textContent = new Date().getFullYear(); });

    // Datos estructurados para buscadores (SEO local)
    injectSchema();
  }

  /* ---- JSON-LD: ficha de negocio local para Google ---- */
  function injectSchema() {
    if (!brand.name) return;
    const site = (brand.siteUrl || "").replace(/\/$/, "");
    const data = {
      "@context": "https://schema.org",
      "@type": "Physiotherapy",
      name: brand.name,
      description: (document.querySelector('meta[name="description"]') || {}).content || "",
      url: site || location.origin,
      telephone: brand.phone,
      email: brand.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: brand.address,
        addressLocality: brand.city,
        postalCode: brand.postalCode,
        addressCountry: "ES"
      },
      openingHours: "Mo-Fr 08:00-20:00",
      medicalSpecialty: "Physiotherapy",
      availableService: [
        "Terapia manual", "Punción seca y EPTE", "Ejercicio terapéutico",
        "Readaptación deportiva", "Suelo pélvico", "Fisioterapia postural"
      ].map((n) => ({ "@type": "MedicalTherapy", name: n }))
    };
    if (brand.geo && brand.geo.lat && brand.geo.lng) {
      data.geo = { "@type": "GeoCoordinates", latitude: brand.geo.lat, longitude: brand.geo.lng };
    }
    // FAQ: se construye desde el propio HTML, así nunca se desincroniza
    const faqs = $$(".faq-item").map((it) => {
      const q = $(".faq-q", it), a = $(".faq-answer-inner p", it);
      if (!q || !a) return null;
      return {
        "@type": "Question",
        name: q.textContent.trim(),
        acceptedAnswer: { "@type": "Answer", text: a.textContent.trim() }
      };
    }).filter(Boolean);

    const graph = faqs.length
      ? [data, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs }]
      : [data];

    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(graph.length === 1 ? graph[0] : graph);
    document.head.appendChild(tag);
  }

  /* ---- Nav: blur al scroll, progreso y sección activa ---- */
  function initNav() {
    const nav = $("#nav");
    if (!nav) return;                    // las subpáginas usan .subnav
    const prog = $("#navProgress");
    const links = $$(".nav-links a[href^='#']");
    const sections = links
      .map((a) => ({ link: a, el: document.querySelector(a.getAttribute("href")) }))
      .filter((s) => s.el);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav.classList.toggle("scrolled", y > 40);
        const h = document.documentElement.scrollHeight - window.innerHeight;
        if (prog) prog.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";

        // Sección activa: la última cuyo inicio ya hemos pasado
        let active = null;
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].el.getBoundingClientRect().top <= 120) active = sections[i];
        }
        links.forEach((l) => l.classList.remove("is-active"));
        if (active) active.link.classList.add("is-active");
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Menú móvil, con foco contenido mientras está abierto
    const toggle = $("#navToggle");
    const menu = $("#mobileMenu");
    if (toggle && menu) {
      const setOpen = (open) => {
        menu.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
        menu.setAttribute("aria-hidden", String(!open));
        document.body.style.overflow = open ? "hidden" : "";
        if (open) { const f = $("a", menu); if (f) f.focus(); } else { toggle.focus(); }
      };
      toggle.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
      $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("open")) setOpen(false);
      });
    }

    // Desplegable de tratamientos: accesible también con teclado y en táctil
    $$(".nav-item.has-drop").forEach((item) => {
      const trigger = $(".nav-drop-toggle", item);
      if (!trigger) return;
      const close = () => { item.classList.remove("open"); trigger.setAttribute("aria-expanded", "false"); };
      const open  = () => { item.classList.add("open");    trigger.setAttribute("aria-expanded", "true"); };
      item.addEventListener("mouseenter", open);
      item.addEventListener("mouseleave", close);
      item.addEventListener("focusin", open);
      item.addEventListener("focusout", (e) => {
        if (!item.contains(e.relatedTarget)) close();
      });
      // En táctil el primer toque abre el menú en vez de navegar
      trigger.addEventListener("click", (e) => {
        if (coarse && !item.classList.contains("open")) { e.preventDefault(); open(); }
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    });
  }

  /* ---- Reveal on scroll (+ títulos palabra a palabra) ---- */
  function initReveal() {
    // Divide los títulos marcados en palabras animables
    $$("[data-split]").forEach((el) => {
      if (el.dataset.splitDone) return;
      const frag = document.createDocumentFragment();
      const walk = (node, target) => {
        node.childNodes.forEach((child) => {
          if (child.nodeType === 3) {
            const words = child.textContent.split(/(\s+)/);
            words.forEach((w) => {
              if (!w.trim()) { target.appendChild(document.createTextNode(w)); return; }
              const outer = document.createElement("span");
              outer.className = "w";
              const inner = document.createElement("span");
              inner.className = "w-i";
              inner.textContent = w;
              outer.appendChild(inner);
              target.appendChild(outer);
            });
          } else if (child.nodeType === 1) {
            const clone = child.cloneNode(false);
            walk(child, clone);
            target.appendChild(clone);
          }
        });
      };
      walk(el, frag);
      el.textContent = "";
      el.appendChild(frag);
      el.dataset.splitDone = "1";
      $$(".w-i", el).forEach((w, i) => { w.style.transitionDelay = (i * 45) + "ms"; });
    });

    const items = $$("[data-reveal], [data-split], .hero-title .line");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach((el) => {
      // Escalona los hermanos dentro de un mismo bloque
      const sibs = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      if (!el.hasAttribute("data-split")) {
        el.style.transitionDelay = Math.min(sibs, 5) * 70 + "ms";
      }
      io.observe(el);
    });

    // Red de seguridad: revela cualquier elemento que ya esté en pantalla o que
    // hayamos sobrepasado. Sin esto, al saltar con un enlace ancla el observador
    // puede no llegar a dispararse y el título se queda invisible.
    const rescue = () => {
      const vh = window.innerHeight;
      items.forEach((el) => {
        if (el.classList.contains("in")) return;
        // top < vh cubre tanto lo visible como lo que queda por encima
        if (el.getBoundingClientRect().top < vh) { el.classList.add("in"); io.unobserve(el); }
      });
    };
    window.addEventListener("load", rescue);
    window.addEventListener("scroll", rescue, { passive: true });
    setTimeout(rescue, 1200);
  }

  /* ---- Contadores animados ---- */
  function initCounters() {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const run = (el) => {
      const target = parseFloat(el.getAttribute("data-count")) || 0;
      const suffix = el.getAttribute("data-suffix") || "";
      if (reduced) { el.textContent = target.toLocaleString("es-ES") + suffix; return; }
      const dur = 1800;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.floor(eased * target).toLocaleString("es-ES") + suffix;
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

  /* ---- Tilt 3D + brillo que sigue al cursor en las tarjetas ---- */
  function initTilt() {
    if (!fine || reduced) return;
    $$("[data-tilt]").forEach((el) => {
      const MAX = 7;
      let raf = null;
      const move = (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            "perspective(900px) rotateY(" + (px * MAX) + "deg) rotateX(" + (-py * MAX) +
            "deg) translateY(-5px)";
          // Alimenta el degradado de brillo definido en CSS
          el.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
          el.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
          raf = null;
        });
      };
      const reset = () => {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
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
      const S = 0.25;
      let raf = null;
      el.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          el.style.transform = "translate(" +
            (e.clientX - r.left - r.width / 2) * S + "px," +
            (e.clientY - r.top - r.height / 2) * S + "px)";
          raf = null;
        });
      });
      el.addEventListener("pointerleave", () => {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        el.style.transform = "";
      });
    });
  }

  /* ---- Parallax suave del mesh del hero ---- */
  function initHeroParallax() {
    if (reduced || lowPower) return;
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
            m.style.transform = "translate3d(0," + (y * (i + 1) * 0.05) + "px,0)";
          });
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- Smooth scroll en anclas ---- */
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
        history.replaceState(null, "", id);
      });
    });
  }

  /* ---- FAQ (acordeón accesible) ---- */
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

  /* ---- Formulario de contacto ---- */
  function initForm() {
    const form = $("#contactForm");
    const note = $("#formNote");
    if (!form) return;
    const endpoint = integr.formEndpoint || "";
    const btn = $('button[type="submit"]', form);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.className = "form-note";

      // Trampa anti-spam: los bots rellenan el campo oculto, las personas no.
      const trap = $('input[name="empresa"]', form);
      if (trap && trap.value) return;

      if (!form.checkValidity()) {
        note.textContent = "Revisa los campos obligatorios, por favor.";
        note.classList.add("err");
        form.reportValidity();
        return;
      }

      const name = ($("#nombre", form).value || "").trim().split(" ")[0];
      const done = (msg, cls) => {
        note.textContent = msg;
        note.classList.add(cls);
        if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
      };

      if (!endpoint) {                       // modo demostración
        done("¡Gracias" + (name ? ", " + name : "") + "! Te contactaremos en menos de 24 h. " +
             "(Demo — configura integrations.formEndpoint en lib/manifest.js para recibir los envíos.)", "ok");
        form.reset();
        return;
      }

      if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }
      fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then((r) => {
          if (!r.ok) throw new Error("bad status");
          done("¡Gracias" + (name ? ", " + name : "") + "! Hemos recibido tu solicitud y te " +
               "contactaremos en menos de 24 h.", "ok");
          form.reset();
        })
        .catch(() => {
          done("No hemos podido enviar el formulario. Escríbenos por teléfono o email y lo " +
               "resolvemos enseguida.", "err");
        });
    });
  }

  /* ---- Aviso de cookies ---- */
  function initCookies() {
    if (settings.cookieBanner === false) return;
    let stored = null;
    try { stored = localStorage.getItem("kinea-cookies"); } catch (e) { return; }
    if (stored) return;

    const bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Aviso de cookies");
    bar.innerHTML =
      "<p>Usamos cookies propias necesarias para que la web funcione. Puedes leer más en la " +
      '<a href="cookies.html">política de cookies</a>.</p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-ghost cookie-no">Solo necesarias</button>' +
      '<button type="button" class="btn btn-primary cookie-ok"><span>Aceptar</span></button>' +
      "</div>";
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add("in"));

    const dismiss = (value) => {
      try { localStorage.setItem("kinea-cookies", value); } catch (e) {}
      bar.classList.remove("in");
      setTimeout(() => bar.remove(), 400);
    };
    $(".cookie-ok", bar).addEventListener("click", () => dismiss("all"));
    $(".cookie-no", bar).addEventListener("click", () => dismiss("essential"));
  }

  /* ---- Botón "volver arriba" ---- */
  function initToTop() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "Volver arriba");
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        btn.classList.toggle("show", window.scrollY > window.innerHeight);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- Carrusel de testimonios: control de pausa accesible ---- */
  function initCarousel() {
    const car = $(".testi-carousel");
    if (!car) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "testi-toggle";
    btn.setAttribute("aria-label", "Pausar el desplazamiento de opiniones");
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">' +
      '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>';
    car.parentElement.insertBefore(btn, car);
    btn.addEventListener("click", () => {
      const paused = car.classList.toggle("paused");
      btn.setAttribute("aria-label", paused
        ? "Reanudar el desplazamiento de opiniones"
        : "Pausar el desplazamiento de opiniones");
      btn.innerHTML = paused
        ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>';
    });
  }

  /* ============================================================
     Escena 3D · Holograma anatómico (v2)
     Cuerpo sólido tipo rayos X con relleno fresnel (bordes
     luminosos), musculatura volumétrica, barrido de escáner,
     marcadores de dolor y calidad adaptativa al hardware.
     · Cámara: primer plano de la cara → cuerpo completo.
     · La cabeza sigue al cursor; el cuerpo gira al arrastrar.
     · Zoom hacia el cursor (rueda / pellizco), doble clic = reset.
     ============================================================ */
  function initHero3D() {
    const host = $("#hero3d");
    if (!host) return;
    const canvas = $("#robotCanvas", host);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    /* ---------- Geometría ----------
       Cada pieza = nodos [x, y, z, rx, rz] (secciones elípticas).
       Se proyectan los contornos y se rellenan → volumen sólido. */
    const parts = [];
    const addPart = (nodes, o) => parts.push(Object.assign({ nodes: nodes }, o || {}));

    // Músculo = elipsoide. face: 1 delante, -1 detrás, 0 neutro.
    const addMuscle = (cx, cy, cz, rx, ry, rz, face, breath) => {
      const n = [];
      for (let i = 0; i <= 5; i++) {
        const t = (i / 5) * 2 - 1;
        const q = Math.sqrt(Math.max(0.06, 1 - t * t));
        n.push([cx, cy + ry * t, cz, rx * q, rz * q]);
      }
      addPart(n, { muscle: 1, face: face || 0, breath: breath || 0 });
    };

    // Cabeza (gira con la mirada)
    (function () {
      const n = [];
      for (let i = 0; i <= 9; i++) {
        const yy = -168 + (i / 9) * 36;
        const q = Math.max(0.05, 1 - Math.pow((yy + 150) / 19.5, 2));
        const w = Math.sqrt(q);
        n.push([0, yy, 0, 15.5 * w, 16.5 * w]);
      }
      addPart(n, { head: 1 });
    })();

    // Cuello
    addPart([[0, -134, 0, 7.6, 7], [0, -125, 0, 8.4, 7.6], [0, -116, 0, 12, 10]]);

    // Torso en V masculino
    addPart([
      [0, -117, 0, 27, 15.7], [0, -107, 0, 31.5, 18.3], [0, -97, 0, 33.5, 19.4],
      [0, -87, 0, 31.5, 18.3], [0, -74, 0, 28, 16.2], [0, -61, 0, 25, 14.5],
      [0, -48, 0, 24, 13.9], [0, -34, 0, 24.8, 14.4], [0, -20, 0, 26.5, 15.4], [0, -7, 0, 23.5, 13.6]
    ], { breath: 1 });

    // Extremidades — pose anatómica natural
    [-1, 1].forEach(function (s) {
      addPart([ // brazo: hombro → codo
        [29 * s, -106, 0, 12.5, 11.5], [31.5 * s, -97, -1, 12, 11], [34 * s, -88, -2, 12.5, 11],
        [36 * s, -80, -3, 10.5, 9.5], [38 * s, -72, -4, 9, 8.5]
      ]);
      addPart([ // antebrazo
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
      addMuscle(5 * s, -77, -12.5, 4.8, 5, 3, 1, 0);      // abdominales
      addMuscle(5 * s, -66, -13, 4.8, 5, 3, 1, 0);
      addMuscle(5 * s, -55, -13, 4.8, 5, 3, 1, 0);
      addMuscle(13.5 * s, -55, -8, 4, 11, 3.5, 1, 0);     // oblicuo
      addMuscle(29 * s, -104, 0, 9.5, 10, 9.5, 0, 0);     // deltoides
      addMuscle(33.5 * s, -89, -8, 6, 11, 4.5, 1, 0);     // bíceps
      addMuscle(33.5 * s, -89, 7, 5.2, 10, 4, -1, 0);     // tríceps
      addMuscle(40 * s, -54, -8, 4.6, 10, 4, 1, 0);       // flexores antebrazo
      addMuscle(12 * s, 10, -8.5, 7, 20, 5, 1, 0);        // cuádriceps
      addMuscle(8 * s, 30, -9, 4.5, 11, 4, 1, 0);         // vasto interno
      addMuscle(16 * s, 14, -6, 4.5, 14, 4, 1, 0);        // vasto externo
      addMuscle(15 * s, 86, -6, 3.5, 15, 3, 1, 0);        // tibial
      addMuscle(10 * s, -112, 8, 9, 6, 5, -1, 0);         // trapecio
      addMuscle(15 * s, -82, 9, 7, 15, 4.5, -1, 0);       // dorsal
      addMuscle(10 * s, -8, 10, 8.5, 9, 5.5, -1, 0);      // glúteo
      addMuscle(13 * s, 22, 9, 6, 17, 4.5, -1, 0);        // isquiotibial
      addMuscle(14.5 * s, 72, 7, 5.5, 13, 4.5, -1, 0);    // gemelo
    });

    const JOINTS = [
      [0, -116, 0],
      [-29, -107, 0], [29, -107, 0], [-38, -72, -4], [38, -72, -4], [-44, -24, -6], [44, -24, -6],
      [-12, -14, 0], [12, -14, 0], [-14, 54, 0], [14, 54, 0], [-15.5, 118, 0], [15.5, 118, 0]
    ];

    // Zonas de dolor comunes → marcador rojo + etiqueta
    const PAINS = [
      [0, -122, -2, "Cervicales"],
      [30, -104, -1, "Hombro"],
      [0, -32, 13, "Lumbares"],
      [17, -14, 3, "Cadera"],
      [-14, 56, -5, "Rodilla"],
      [15.5, 116, -3, "Tobillo"]
    ];

    // Sprites de brillo pre-renderizados
    const mkGlow = (stops) => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      stops.forEach((s) => grd.addColorStop(s[0], s[1]));
      g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
      return c;
    };
    const glow = mkGlow([[0, "rgba(235,255,250,.95)"], [0.4, "rgba(110,235,205,.5)"], [1, "rgba(110,235,205,0)"]]);
    const redGlow = mkGlow([[0, "rgba(255,238,232,.98)"], [0.35, "rgba(255,78,68,.78)"], [1, "rgba(255,60,55,0)"]]);

    /* ---------- Canvas y calidad adaptativa ---------- */
    let W = 0, H = 0, hostRect = host.getBoundingClientRect();
    let quality = lowPower ? 0 : 1;   // 1 = completa (fresnel + partículas), 0 = ligera
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
    window.addEventListener("scroll", () => {
      const r = host.getBoundingClientRect();
      if (r.width) hostRect = r;
    }, { passive: true });

    // Solo se dibuja si la portada está a la vista y la pestaña activa
    let inView = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.01 }).observe(host);
    }
    document.addEventListener("visibilitychange", () => { hostRect = host.getBoundingClientRect(); });

    /* ---------- Interacción ---------- */
    const clampZ = (z) => Math.max(0.55, Math.min(2.6, z));
    let spin = 0, spinVel = 0, dragging = false, lastX = 0, lastY = 0, moved = 0;
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
        dragging = true; resetSpin = false; spinVel = 0; moved = 0;
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
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
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

    // Rueda = zoom hacia el cursor, solo dentro de la tarjeta
    host.addEventListener("wheel", (e) => {
      e.preventDefault();
      anchorX = e.clientX - hostRect.left;
      anchorY = e.clientY - hostRect.top;
      resetView = false;
      const d = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 120 : 1);
      targetUZ = clampZ(targetUZ * Math.exp(-d * 0.0014));
    }, { passive: false });

    host.addEventListener("dblclick", (e) => {
      e.preventDefault();
      targetUZ = 1; tiltV = 0; resetSpin = true; resetView = true;
    });

    // La cabeza sigue al cursor por toda la ventana
    window.addEventListener("pointermove", (e) => {
      const r = hostRect;
      if (!r.width) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height * 0.32)) / r.height;
      lookYaw = Math.max(-0.6, Math.min(0.6, -dx * 1.2));
      lookPitch = Math.max(-0.3, Math.min(0.38, dy * 0.75));
    }, { passive: true });

    // Control por teclado (accesibilidad)
    host.setAttribute("tabindex", "0");
    host.setAttribute("role", "img");
    host.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowLeft")       { spin -= 0.18; e.preventDefault(); }
      else if (k === "ArrowRight") { spin += 0.18; e.preventDefault(); }
      else if (k === "+" || k === "=") { targetUZ = clampZ(targetUZ * 1.15); e.preventDefault(); }
      else if (k === "-")          { targetUZ = clampZ(targetUZ / 1.15); e.preventDefault(); }
      else if (k === "0")          { targetUZ = 1; tiltV = 0; resetSpin = true; resetView = true; e.preventDefault(); }
    });

    const cap = $(".hero-3d-caption", host);
    if (cap) cap.innerHTML = '<span class="dot-live"></span> ' +
      (coarse ? "Arrastra para girar · Pellizca para acercar" : "Arrastra para girar · Rueda para acercar");

    /* ---------- Cámara y bucle ---------- */
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;
    const F = 460, D = 320, TAU = Math.PI * 2;
    const HOLD = 600, DUR = 3000;
    let t0 = performance.now(), started = false;
    let fpsAcc = 0, fpsFrames = 0, lastT = 0;

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
      if (!W || document.hidden) return;
      if (!started) { if (!inView) return; started = true; t0 = now; lastT = now; }
      if (!inView) return;

      // Calidad adaptativa: si el equipo no da 45 fps, se baja a modo ligero
      if (quality === 1 && lastT) {
        fpsAcc += now - lastT; fpsFrames++;
        if (fpsFrames === 60) {
          if (fpsAcc / fpsFrames > 22) quality = 0;
          fpsAcc = 0; fpsFrames = 0;
        }
      }
      lastT = now;

      let p, idle;
      if (reduced) { p = 1; idle = 0; }
      else {
        const e = now - t0;
        p = e < HOLD ? 0 : easeIO(Math.min((e - HOLD) / DUR, 1));
        idle = Math.max(0, Math.min((e - HOLD - DUR) / 900, 1));
      }

      if (!dragging) { spin += spinVel; spinVel *= 0.94; tiltV *= 0.93; }
      if (resetSpin) {
        const m = spin % TAU;
        const target = spin - (m > Math.PI ? m - TAU : m < -Math.PI ? m + TAU : m);
        spin += (target - spin) * 0.12;
        if (Math.abs(target - spin) < 0.002) { spin = target; resetSpin = false; }
      }
      userZoom += (targetUZ - userZoom) * 0.12;

      const br   = reduced ? 0 : Math.sin(now / 1400) * 0.022 * (0.4 + 0.6 * idle);
      const sway = reduced ? 0 : Math.sin(now / 2400) * 0.032 * idle;
      const bob  = reduced ? 0 : Math.sin(now / 1800) * 1.6 * idle;

      const camY = lerp(-150, -19, p) - bob;
      const K = (F + D) / F;
      const zoom = lerp(
        Math.min(H * 0.5 / 40, W * 0.5 / 36) * K,
        Math.min(H * 0.86 / 310, W * 0.86 / 104) * K,
        p
      ) * userZoom;

      const fade = Math.min((now - t0) / 500, 1);
      const rot = spin + sway + (1 - p) * -0.22;
      const tilt = tiltV;

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

      let rotN = rot % TAU;
      if (rotN > Math.PI) rotN -= TAU; else if (rotN < -Math.PI) rotN += TAU;
      const faceBody = Math.cos(rotN);
      const vFace = Math.max(0, Math.cos(rotN + hy)) * fade;

      // Barrido de escáner: recorre el cuerpo de arriba abajo
      const scanY = reduced ? 1e9 : -170 + ((now / 22) % 460);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";

      /* --- 1. Siluetas: cuerpo + músculos --- */
      const rendered = [];
      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi];
        const L = [], R = [], C = [];
        let zSum = 0, wSum = 0, count = 0, minX = 1e9, maxX = -1e9, ySum = 0;
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
          if (sx - w < minX) minX = sx - w;
          if (sx + w > maxX) maxX = sx + w;
          zSum += z2; wSum += w; ySum += y; count++;
        }
        if (count < 3) continue;
        rendered.push({
          L, R, C, minX, maxX,
          z: zSum / count, w: wSum / count, y: ySum / count,
          muscle: part.muscle || 0, face: part.face || 0
        });
      }
      rendered.sort((a, b) => b.z - a.z);

      for (let ri = 0; ri < rendered.length; ri++) {
        const rp = rendered[ri];
        const af = Math.max(0.45, Math.min(1, 1 - rp.z * 0.0035)) * fade;
        // Realce al paso del escáner
        const scanBoost = reduced ? 0 : Math.max(0, 1 - Math.abs(rp.y - scanY) / 26) * 0.55;

        ctx.beginPath();
        moveSmooth(rp.L);
        lineSmoothRev(rp.R);
        ctx.closePath();

        if (rp.muscle) {
          const dirV = rp.face === 0 ? 1 : 0.3 + 0.7 * Math.max(0, rp.face * faceBody);
          const a2 = af * dirV;
          if (a2 <= 0.04) continue;
          const aa = Math.min(1, 0.22 * a2 + scanBoost * 0.5);
          if (quality && rp.maxX > rp.minX) {
            // Relleno fresnel: bordes brillantes, centro translúcido → volumen
            const g = ctx.createLinearGradient(rp.minX, 0, rp.maxX, 0);
            g.addColorStop(0,    "rgba(150,240,230," + (aa * 1.15).toFixed(3) + ")");
            g.addColorStop(0.5,  "rgba(70,185,225,"  + (aa * 0.45).toFixed(3) + ")");
            g.addColorStop(1,    "rgba(150,240,230," + (aa * 1.15).toFixed(3) + ")");
            ctx.fillStyle = g;
          } else {
            ctx.fillStyle = "rgba(90,200,225," + aa.toFixed(3) + ")";
          }
          ctx.fill();
          ctx.strokeStyle = "rgba(170,250,235," + Math.min(1, 0.5 * a2 + scanBoost).toFixed(3) + ")";
          ctx.lineWidth = 1.1;
          ctx.stroke();
        } else {
          const aa = 0.12 * af + scanBoost * 0.28;
          if (quality && rp.maxX > rp.minX) {
            const g = ctx.createLinearGradient(rp.minX, 0, rp.maxX, 0);
            g.addColorStop(0,   "rgba(110,215,235," + (aa * 1.6).toFixed(3) + ")");
            g.addColorStop(0.5, "rgba(50,130,195,"  + (aa * 0.7).toFixed(3) + ")");
            g.addColorStop(1,   "rgba(110,215,235," + (aa * 1.6).toFixed(3) + ")");
            ctx.fillStyle = g;
          } else {
            ctx.fillStyle = "rgba(62,150,205," + aa.toFixed(3) + ")";
          }
          ctx.fill();
          if (quality) {
            ctx.strokeStyle = "rgba(80,205,235," + (0.16 * af).toFixed(3) + ")";
            ctx.lineWidth = 5;
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(150,245,220," + Math.min(1, 0.85 * af + scanBoost).toFixed(3) + ")";
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

      /* --- 2. Línea del escáner --- */
      if (!reduced && p > 0.6) {
        const A = TP(-60, scanY, 0, false), B = TP(60, scanY, 0, false);
        const g = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
        g.addColorStop(0, "rgba(120,240,220,0)");
        g.addColorStop(0.5, "rgba(190,255,240,.55)");
        g.addColorStop(1, "rgba(120,240,220,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        ctx.stroke();
      }

      /* --- 3. Gafas de sol (giran con la cabeza) --- */
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

      /* --- 4. Articulaciones --- */
      for (let ji = 0; ji < JOINTS.length; ji++) {
        const J = JOINTS[ji];
        const P = TP(J[0], J[1], J[2], false);
        if (P[3] <= 0) continue;
        const size = Math.min(18, 8 * P[3] * zoom);
        ctx.globalAlpha = 0.4 * fade;
        ctx.drawImage(glow, P[0] - size / 2, P[1] - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      /* --- 5. Zonas de dolor + etiquetas --- */
      const showLabels = p > 0.9 && userZoom < 1.4;
      const labels = [];
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
        // Anillo expansivo
        if (!reduced && quality) {
          const t = ((now / 1600) + qi * 0.17) % 1;
          ctx.globalAlpha = vis * (1 - t) * 0.5;
          ctx.strokeStyle = "rgba(255,120,110,1)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(P[0], P[1], size * 0.35 + t * size * 1.1, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = vis;
        ctx.fillStyle = "rgba(255,120,110,0.95)";
        ctx.beginPath(); ctx.arc(P[0], P[1], Math.max(1.5, size * 0.12), 0, TAU); ctx.fill();
        if (showLabels && vis > 0.5) labels.push([P[0], P[1], Z[3], vis]);
      }
      ctx.globalAlpha = 1;

      if (labels.length) {
        ctx.globalCompositeOperation = "source-over";
        ctx.font = "600 11px Inter, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        for (let li = 0; li < labels.length; li++) {
          const Lb = labels[li];
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

      /* --- 6. Base holográfica --- */
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
    safe(initCarousel, "initCarousel");
    safe(initToTop, "initToTop");
    safe(initCookies, "initCookies");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
