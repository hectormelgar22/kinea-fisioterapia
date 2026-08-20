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
            if (child.tagName === "BR") { target.appendChild(child.cloneNode(false)); return; }
            // Los elementos (p.ej. <span class="tx-accent"> con degradado de
            // texto vía background-clip) se animan como bloque, no palabra a
            // palabra: trocear su texto los deja sin hijo de texto directo y
            // el degradado, al no tener nada que recortar, se vuelve invisible.
            const outer = document.createElement("span");
            outer.className = "w";
            const inner = document.createElement("span");
            inner.className = "w-i";
            inner.appendChild(child.cloneNode(true));
            outer.appendChild(inner);
            target.appendChild(outer);
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
     Escena 3D · Figura anatómica cel-shaded (WebGL)
     El modelo vive en lib/figura3d.js: se genera con primitivas
     en el navegador, así que no hay ninguna malla que descargar.
     Aquí solo se monta y se degrada con elegancia si algo falla.
     ============================================================ */
  function initHero3D() {
    const host = $("#hero3d");
    if (!host) return;
    const canvas = $("#robotCanvas", host);
    if (!canvas) return;
    if (!window.Kinea3D) { host.classList.add("no3d"); return; }

    /* Construir la malla cuesta unos cientos de milisegundos. Se hace en
       diferido —cuando el panel se acerca y el hilo está libre— para no
       retrasar la primera pintura ni la interactividad de la portada. */
    let montado = false, pedido = false;
    const arranca = () => {
      if (montado) return;
      montado = true;
      try {
        if (!window.Kinea3D.mount(host, canvas)) host.classList.add("no3d");
      } catch (err) {
        host.classList.add("no3d");
        if (window.console) console.warn("figura 3D no disponible:", err);
      }
    };
    const montar = () => {
      if (pedido) return;
      pedido = true;
      /* Se piden las dos vías y gana la primera: requestIdleCallback no se
         ejecuta en pestañas ocultas (una web abierta en segundo plano se
         quedaría sin muñeco), y setTimeout sí. */
      if (window.requestIdleCallback) requestIdleCallback(arranca, { timeout: 600 });
      setTimeout(arranca, 700);
    };

    if (!("IntersectionObserver" in window)) { montar(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        montar();
      });
    }, { rootMargin: "250px" });
    io.observe(host);
  }

  /* ---- Botón flotante de WhatsApp ---- */
  function initWhatsApp() {
    const waUrl = (brand.social && brand.social.whatsapp && brand.social.whatsapp !== "#")
      ? brand.social.whatsapp
      : "https://wa.me/34600000000?text=Hola%2C%20quisiera%20pedir%20informaci%C3%B3n";

    const a = document.createElement("a");
    a.className = "whatsapp-fab";
    a.href = waUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", "Contactar por WhatsApp");
    a.innerHTML =
      '<span class="whatsapp-fab-tooltip">¿Hablamos por WhatsApp?</span>' +
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
      '</svg>';
    document.body.appendChild(a);
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
    safe(initWhatsApp, "initWhatsApp");
    safe(initCookies, "initCookies");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
