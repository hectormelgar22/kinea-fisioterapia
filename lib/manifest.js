/* ============================================================
   KINEA · CONFIGURACIÓN CENTRAL
   ------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar para personalizar
   la web: marca, contacto, precios, integraciones y ajustes.
   No hace falta tocar el HTML, el CSS ni el JS.
   ============================================================ */
window.__BRAND__ = {

  /* ---------- 1. IDENTIDAD ---------- */
  name: "Kinea",
  tagline: "Fisioterapia & Rendimiento",
  legalName: "Kinea Fisioterapia S.L.",   // para el aviso legal y los datos estructurados
  city: "Madrid",

  /* ---------- 2. CONTACTO ---------- */
  phone: "+34 600 000 000",
  email: "hola@ejemplo.com",
  address: "Calle Ejemplo 24, Bajo",
  postalCode: "28001",
  hours: "Lun–Vie · 08:00–20:00",

  /* Coordenadas para el mapa y el SEO local (opcional, "" para omitir) */
  geo: { lat: "", lng: "" },

  /* ---------- 3. REDES ---------- */
  social: {
    instagram: "#",
    linkedin: "#",
    whatsapp: "https://wa.me/34600000000?text=Hola%2C%20quisiera%20pedir%20informaci%C3%B3n"
  },

  /* ---------- 4. SEO ---------- */
  /* Dominio final, SIN barra al final. Se usa para canonical y Open Graph. */
  siteUrl: "https://www.ejemplo.com",

  /* ---------- 5. INTEGRACIONES ---------- */
  integrations: {
    /* Endpoint del asistente con IA.
       Déjalo en "" para ocultar por completo el widget de chat.
       ⚠️ AL VENDER LA PLANTILLA: vacía este campo, es una URL propia.
       Ejemplos:
         Cloudflare Worker → "https://tu-worker.workers.dev/"
         Hostinger / PHP   → "https://tudominio.com/api/chat.php"          */
    chatEndpoint: "https://fisio-chat.hector22melgar.workers.dev/",

    /* Destino del formulario de contacto.
       Déjalo en "" y el formulario funcionará en modo demostración.
       Servicios sin backend: Formspree, Basin, Web3Forms, Netlify Forms.
       Ejemplo: "https://formspree.io/f/tucodigo"                          */
    formEndpoint: ""
  },

  /* ---------- 6. AJUSTES ---------- */
  settings: {
    /* Muestra el aviso de cookies. Ponlo en false si no usas analítica
       ni cookies de terceros y tu asesor legal lo considera innecesario. */
    cookieBanner: true
  }
};
