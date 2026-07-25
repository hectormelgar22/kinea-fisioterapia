# Kinea · Plantilla web para clínicas de fisioterapia

Web premium de una sola página, con páginas de detalle y área legal.
**HTML, CSS y JavaScript puros**: sin frameworks, sin `npm`, sin compilación.
Se sube por FTP a cualquier hosting y funciona.

---

## 🚀 Puesta en marcha en 5 minutos

Todo lo personalizable vive en **un solo archivo**: `lib/manifest.js`.

1. Abre `lib/manifest.js` y rellena tus datos: nombre, teléfono, email,
   dirección, horario, redes y dominio.
2. Busca y sustituye `https://www.ejemplo.com` por tu dominio real en:
   `index.html` (canonical y Open Graph), `robots.txt` y `sitemap.xml`.
3. Rellena los `[DATOS ENTRE CORCHETES]` de `aviso-legal.html`,
   `privacidad.html` y `cookies.html` (NIF, dirección, nº de colegiado…).
4. Sube todo el contenido de la carpeta a tu hosting.

> ⚖️ Los textos legales son **plantillas orientativas**. Revísalos con un
> asesor antes de publicar, sobre todo al tratar datos de salud.

---

## 📁 Qué hay en cada archivo

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página principal completa |
| `tratamiento.html` | Ficha de detalle de cada tratamiento (`?t=slug`) |
| `404.html` | Página de error |
| `aviso-legal.html` · `privacidad.html` · `cookies.html` | Textos legales |
| `styles.css` | Todos los estilos |
| `main.js` | Animaciones, holograma 3D y lógica de la web |
| `chat.js` | Widget del asistente con IA (opcional) |
| `lib/manifest.js` | **⭐ Configuración: edita solo esto** |
| `lib/tratamientos.js` | Textos de las fichas de tratamiento |
| `backend/worker.js.txt` | Backend del asistente (Cloudflare Worker) |
| `borradores/` | Versiones antiguas guardadas. **No subir al hosting** |

---

## ✏️ Personalización habitual

**Colores.** En `styles.css`, bloque `:root` (línea ~10). Cambiando
`--accent`, `--accent-2` y `--blue` cambia toda la web.

**Textos y precios.** Directamente en `index.html`. Las secciones están
señalizadas con comentarios grandes (`<!-- ===== TARIFAS ===== -->`).

**Fichas de tratamiento.** En `lib/tratamientos.js`: nombre, descripción,
cuándo se recomienda, escala de dolor, duración y pasos de la sesión.

**Imágenes.** Los marcadores de posición están en `.ph` y los avatares de
opiniones en `.avatar`. Sustitúyelos por `<img>` en formato **WebP** con
`loading="lazy"` y `width`/`height` definidos.

---

## 🔌 Activar el formulario de contacto

Por defecto funciona en **modo demostración** (muestra el mensaje de
confirmación sin enviar nada).

Para recibir los envíos de verdad, crea una cuenta gratuita en
[Formspree](https://formspree.io), [Basin](https://usebasin.com) o
[Web3Forms](https://web3forms.com) y pega la URL que te den en:

```js
// lib/manifest.js
integrations: {
  formEndpoint: "https://formspree.io/f/tucodigo"
}
```

El formulario ya incluye una **trampa anti-spam** invisible.

---

## 🤖 Activar el asistente con IA (opcional)

Si dejas `chatEndpoint` vacío, el widget **no aparece** y la web funciona igual.

Para activarlo necesitas un backend que guarde la clave de la API —
nunca la pongas en el navegador:

1. Crea un Worker gratuito en [Cloudflare](https://workers.cloudflare.com).
2. Pega el contenido de `backend/worker.js.txt` en el editor del Worker.
3. En ese archivo, cambia `ALLOWED_ORIGINS` por tu dominio.
   ⚠️ Solo el dominio, **sin la ruta**: `https://tudominio.com` ✅ ·
   `https://tudominio.com/web/` ❌ (nunca coincidirá y dará error 403).
4. En Cloudflare, añade el secreto `GEMINI_API_KEY` y un KV llamado `RATE_LIMIT`.
5. Copia la URL del Worker en `lib/manifest.js` → `integrations.chatEndpoint`.

El backend incluye límite de peticiones por IP, detección de mensajes de
crisis y borrado automático de datos personales.

---

## 🎨 Volver al holograma 3D anterior

La carpeta `borradores/` guarda la versión previa del modelo 3D:

```bash
cp borradores/main-3d-v1-BORRADOR.js main.js
```

---

## 🔒 Seguridad

La web incluye una **Content-Security-Policy estricta**: solo se ejecutan
scripts propios, lo que bloquea inyecciones de código y scripts de terceros.

Si añades **Google Analytics, un mapa incrustado o cualquier script externo**,
tendrás que incluir su dominio en dos sitios o el navegador lo bloqueará:

- La etiqueta `<meta http-equiv="Content-Security-Policy">` de cada `.html`
- El archivo `.htaccess` (si tu hosting es Apache)

Otras medidas incluidas: cabeceras `X-Frame-Options`, `HSTS`,
`Permissions-Policy`, formulario con trampa anti-spam y enlaces externos
con `rel="noopener noreferrer"`.

---

## ⚡ Rendimiento

- Sin librerías externas: **0 KB** de dependencias JavaScript.
- El holograma 3D se **pausa** cuando sale de pantalla o cambias de pestaña,
  y **baja de calidad automáticamente** en equipos poco potentes.
- Las secciones fuera de pantalla no se pintan (`content-visibility`).
- Los archivos llevan `?v=` en la URL: al actualizar, sube el número para
  que los navegadores descarguen la versión nueva.

---

## ♿ Accesibilidad

Navegación completa por teclado, foco visible, textos alternativos,
contraste AA, `prefers-reduced-motion` respetado, carrusel de opiniones
con botón de pausa y el modelo 3D controlable con las flechas del teclado
(`←` `→` girar, `+` `−` zoom, `0` reiniciar).

---

## 🌐 Publicar

**Hosting tradicional (Hostinger, IONOS…).** Sube todo por FTP a `public_html`,
excepto `borradores/` y `backend/`. El `.htaccess` ya trae compresión, caché,
HTTPS forzado y cabeceras de seguridad.

**GitHub Pages.** Sube el repositorio y actívalo en *Settings → Pages*.
Ojo: ahí el `.htaccess` se ignora, pero las etiquetas `<meta>` de seguridad
siguen funcionando.
