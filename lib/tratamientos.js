/* ============================================================
   KINEA · Contenido de las páginas de tratamiento
   ------------------------------------------------------------
   Edita aquí los textos de cada tratamiento. La página
   tratamiento.html se rellena sola según el parámetro ?t=slug.
   ============================================================ */
(function () {
  "use strict";
  var T = {
    "terapia-manual": {
      nombre: "Terapia manual",
      lema: "Movilizaciones, manipulaciones y trabajo de tejidos para liberar articulaciones y músculos con precisión.",
      que: "La terapia manual es el conjunto de técnicas que aplicamos con las manos para movilizar articulaciones, liberar tensión muscular y mejorar la elasticidad de los tejidos. Es una de las bases de la fisioterapia y casi siempre la combinamos con ejercicio terapéutico para que los resultados se mantengan en el tiempo.",
      cuando: ["Dolor y rigidez articular", "Contracturas y sobrecargas musculares", "Limitación de movimiento tras una lesión", "Dolor cervical o lumbar de origen mecánico", "Tensión asociada a la mala postura"],
      dolor: 3, dolorLabel: "Molestia leve",
      dolorNote: "Trabajamos siempre dentro de un umbral tolerable. Puede notarse una molestia puntual en zonas cargadas que desaparece enseguida.",
      duracion: "45–60 min", sesiones: "Desde la 1ª",
      proceso: [["Valoración", "Exploramos el movimiento y localizamos con precisión la zona a tratar."], ["Tratamiento manual", "Aplicamos las técnicas adecuadas: movilización, manipulación o liberación miofascial."], ["Ejercicio y pautas", "Complementamos con ejercicios y consejos para casa que consolidan la mejora."]]
    },
    "puncion-seca": {
      nombre: "Punción seca & EPTE",
      lema: "Desactivación de puntos gatillo y electrólisis percutánea ecoguiada para tendinopatías y lesiones profundas rebeldes.",
      que: "La punción seca utiliza una aguja fina para desactivar los puntos gatillo responsables del dolor muscular. La EPTE (electrólisis percutánea terapéutica) aplica una micro-corriente ecoguiada sobre el tendón dañado para estimular su regeneración. Son técnicas muy eficaces cuando el dolor no responde a otros abordajes.",
      cuando: ["Puntos gatillo y dolor miofascial", "Tendinopatías crónicas (rotuliana, aquíleo, epicondilitis)", "Contracturas profundas persistentes", "Dolor que no cede con terapia manual", "Lesiones deportivas de repetición"],
      dolor: 5, dolorLabel: "Moderada",
      dolorNote: "Puede notarse un calambre breve al desactivar el punto gatillo (el llamado REL). La molestia es corta y bien tolerada; te explicamos cada paso y ajustamos a tu tolerancia.",
      duracion: "30–45 min", sesiones: "1 / semana aprox.",
      proceso: [["Localización ecoguiada", "Identificamos con ecografía el punto o el tendón exacto a tratar."], ["Aplicación", "Insertamos la aguja para desactivar el punto gatillo o aplicar la EPTE."], ["Recuperación activa", "Pautamos ejercicio para consolidar el resultado y evitar recaídas."]]
    },
    "ejercicio-terapeutico": {
      nombre: "Ejercicio terapéutico",
      lema: "Programas de fuerza y control motor pautados y progresivos: la clave para que el dolor no vuelva.",
      que: "El ejercicio terapéutico es la herramienta con más evidencia científica en fisioterapia. Diseñamos un programa progresivo de fuerza, movilidad y control motor adaptado a tu lesión y a tus objetivos, para que tu cuerpo sea más resistente, capaz y autónomo.",
      cuando: ["Prevención de recaídas", "Fortalecimiento tras una lesión", "Dolor crónico y sensibilización", "Mejora del rendimiento físico", "Mantenimiento de la salud a largo plazo"],
      dolor: 1, dolorLabel: "Prácticamente indoloro",
      dolorNote: "No duele. Puede aparecer una agujeta normal al iniciar un programa nuevo: es una señal de adaptación, no de lesión.",
      duracion: "45–60 min", sesiones: "Programa continuado",
      proceso: [["Evaluación funcional", "Medimos fuerza, movilidad y control para partir de tu punto real."], ["Programa a medida", "Diseñamos los ejercicios y la progresión semana a semana."], ["Seguimiento", "Revisamos, ajustamos cargas y te damos autonomía para seguir por tu cuenta."]]
    },
    "readaptacion-deportiva": {
      nombre: "Readaptación deportiva",
      lema: "Del reposo al gesto deportivo sin recaídas. Analizamos tu movimiento y te devolvemos a competir con seguridad.",
      que: "La readaptación es el puente entre la lesión y la vuelta al deporte. Trabajamos el gesto específico de tu disciplina, la fuerza, la potencia y el control motor para que vuelvas al 100 % y con el menor riesgo de recaída posible.",
      cuando: ["Vuelta al deporte tras una lesión o cirugía", "Roturas musculares y esguinces", "Prevención de recaídas en deportistas", "Mejora del gesto técnico", "Puesta a punto para competición"],
      dolor: 2, dolorLabel: "Muy baja",
      dolorNote: "El trabajo es progresivo y controlado; ajustamos siempre la carga a tu tolerancia y a la fase de tu recuperación.",
      duracion: "60 min", sesiones: "Según fase",
      proceso: [["Análisis del gesto", "Estudiamos tu deporte y la fase concreta de tu recuperación."], ["Progresión de cargas", "Fuerza, potencia y control motor específicos de tu disciplina."], ["Vuelta a competir", "Test de readaptación antes de darte el alta deportiva."]]
    },
    "suelo-pelvico": {
      nombre: "Suelo pélvico",
      lema: "Valoración y tratamiento en pre y posparto, incontinencia y dolor pélvico, con total discreción.",
      que: "La fisioterapia de suelo pélvico valora y trata la musculatura que sostiene la vejiga, el útero y el intestino. Es fundamental durante el embarazo y el posparto, y también en casos de incontinencia o dolor pélvico, a cualquier edad.",
      cuando: ["Preparación al parto y recuperación posparto", "Incontinencia urinaria o de esfuerzo", "Dolor pélvico o en las relaciones", "Diástasis abdominal", "Prevención en la menopausia"],
      dolor: 2, dolorLabel: "Muy baja",
      dolorNote: "La valoración y el tratamiento son respetuosos y siempre con tu consentimiento informado. Priorizamos tu comodidad y tu intimidad.",
      duracion: "45–60 min", sesiones: "Según objetivos",
      proceso: [["Entrevista y valoración", "Historia clínica y valoración funcional en un entorno privado."], ["Tratamiento", "Técnicas manuales, ejercicio específico y educación."], ["Autonomía", "Pautas para mantener tu suelo pélvico sano a largo plazo."]]
    },
    "fisioterapia-postural": {
      nombre: "Fisioterapia postural",
      lema: "Reeducación de la postura y la ergonomía para el trabajo y el día a día. Adiós a las sobrecargas.",
      que: "Corregimos los patrones posturales que te generan dolor de espalda, cuello u hombros. Combinamos terapia manual, ejercicio y educación ergonómica para que tu cuerpo aguante mejor las horas de trabajo, estudio o pantalla.",
      cuando: ["Dolor cervical o de espalda por el trabajo", "Malas posturas frente al ordenador", "Sobrecargas por gestos repetitivos", "Prevención en teletrabajo", "Sensación de tensión y rigidez constante"],
      dolor: 1, dolorLabel: "Prácticamente indoloro",
      dolorNote: "El enfoque es educativo y de ejercicio; no implica técnicas molestas.",
      duracion: "45–60 min", sesiones: "Programa continuado",
      proceso: [["Análisis postural", "Observamos tu postura y tu puesto de trabajo."], ["Corrección y ejercicio", "Terapia manual y ejercicios de reeducación postural."], ["Ergonomía", "Ajustamos tu entorno y tus hábitos para prevenir recaídas."]]
    }
  };

  var params = new URLSearchParams(location.search);
  var slug = params.get("t");
  var d = T[slug] || T["terapia-manual"];

  var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  document.title = d.nombre + " · Kinea Fisioterapia";
  set("t-name", d.nombre);
  set("t-lema", d.lema);
  set("t-que", d.que);
  set("t-duracion", d.duracion);
  set("t-sesiones", d.sesiones);
  set("t-dolor", d.dolor + "/10");
  set("t-ps-note", d.dolorNote);

  var mk = document.getElementById("t-ps-marker");
  if (mk) { mk.style.left = (d.dolor * 10) + "%"; mk.setAttribute("data-val", d.dolor + " · " + d.dolorLabel); }

  var ul = document.getElementById("t-cuando");
  if (ul) d.cuando.forEach(function (c) { var li = document.createElement("li"); li.textContent = c; ul.appendChild(li); });

  var pr = document.getElementById("t-proceso");
  if (pr) d.proceso.forEach(function (st) {
    var wrap = document.createElement("div"); wrap.className = "tstep";
    var body = document.createElement("div");
    var h = document.createElement("h3"); h.textContent = st[0];
    var p = document.createElement("p"); p.textContent = st[1];
    body.appendChild(h); body.appendChild(p); wrap.appendChild(body); pr.appendChild(wrap);
  });
})();
