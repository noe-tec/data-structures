/* ============================================================
   SHSTYLE — componentes interactivos para los decks
   Requiere Reveal.js 5.x ya cargado. Incluir después de reveal.js
   y llamar SHStyle.init(glosario) tras Reveal.initialize().
   ============================================================ */

const SHStyle = (() => {

  /* ----------------------------------------------------------
     0. ECUACIONES (KaTeX)
     Escribe \( ... \) en línea y \[ ... \] en bloque dentro de
     cualquier slide. KaTeX se descarga del CDN solo si el deck
     contiene ecuaciones, así que los decks sin matemáticas no
     pagan la carga. Los bloques <pre>/<code> quedan intactos.
     ---------------------------------------------------------- */
  const KATEX_V = '0.16.11';
  const KATEX_CDN = `https://cdn.jsdelivr.net/npm/katex@${KATEX_V}/dist`;

  const MATH_OPTS = {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    throwOnError: false
  };

  function loadCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(src));
      document.head.appendChild(s);
    });
  }

  // Renderiza las ecuaciones de un contenedor. Sin KaTeX cargado no hace nada.
  function renderMath(el) {
    if (el && window.renderMathInElement) renderMathInElement(el, MATH_OPTS);
  }

  function initMath() {
    const root = document.querySelector('.reveal .slides');
    if (!root || !/\\\(|\\\[/.test(root.textContent)) return;

    loadCss(`${KATEX_CDN}/katex.min.css`);
    loadScript(`${KATEX_CDN}/katex.min.js`)
      .then(() => loadScript(`${KATEX_CDN}/contrib/auto-render.min.js`))
      .then(() => {
        renderMath(root);
        if (window.Reveal) Reveal.layout();
      })
      .catch(() => console.warn('KaTeX could not be loaded: equations are left as plain text.'));
  }

  /* ----------------------------------------------------------
     1. GLOSARIO — términos clicables
     Uso en HTML:  <span class="term" data-term="tda">TDA</span>
     El glosario se pasa a init():
       { tda: { titulo: "...", def: "Texto. Admite <code>html</code>." } }
     ---------------------------------------------------------- */
  let GLOSARIO = {};

  function openTerm(key) {
    const entry = GLOSARIO[key];
    if (!entry) return;

    // Pausar el teclado de Reveal mientras el modal está abierto
    // (evita que Esc/flechas naveguen el deck por debajo del modal)
    if (window.Reveal) Reveal.configure({ keyboard: false });

    const overlay = document.createElement('div');
    overlay.className = 'glossary-overlay';
    overlay.innerHTML = `
      <div class="glossary-card" role="dialog" aria-modal="true">
        <h4>${entry.titulo}</h4>
        <div>${entry.def}</div>
        <button class="glossary-close">Close</button>
      </div>`;
    document.body.appendChild(overlay);
    renderMath(overlay);   // las definiciones también admiten \( … \)

    const close = () => {
      overlay.remove();
      if (window.Reveal) Reveal.configure({ keyboard: true });
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.glossary-close').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        document.removeEventListener('keydown', esc, true);
      }
    }, true);
  }

  function initGlossary() {
    document.querySelectorAll('.term[data-term]').forEach(el => {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', e => { e.stopPropagation(); openTerm(el.dataset.term); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTerm(el.dataset.term); }
      });
    });
  }

  /* ----------------------------------------------------------
     2. QUIZ — pregunta con 3 opciones y explicación
     Uso en HTML:
       <div class="quiz" data-correct="b">
         <p class="quiz-question">¿...?</p>
         <button class="quiz-option" data-opt="a">Opción A</button>
         <button class="quiz-option" data-opt="b">Opción B</button>
         <button class="quiz-option" data-opt="c">Opción C</button>
         <div class="quiz-explain">Por qué B es correcta…</div>
       </div>
     ---------------------------------------------------------- */
  const RESPUESTAS = [];   // registro de quizzes con data-tema (diagnóstico)

  function initQuizzes() {
    document.querySelectorAll('.quiz').forEach(quiz => {
      const correct = quiz.dataset.correct;
      const options = quiz.querySelectorAll('.quiz-option');

      if (quiz.dataset.tema) RESPUESTAS.push({ quiz, acertado: null });

      // Prefijo de letra en cada opción
      options.forEach(btn => {
        if (!btn.querySelector('.opt-letter')) {
          const tag = document.createElement('span');
          tag.className = 'opt-letter';
          tag.textContent = btn.dataset.opt.toUpperCase();
          btn.prepend(tag);
        }
        btn.addEventListener('click', () => {
          if (quiz.classList.contains('answered')) return;
          quiz.classList.add('answered');
          options.forEach(o => {
            o.disabled = true;
            if (o.dataset.opt === correct) o.classList.add('is-correct');
          });
          if (btn.dataset.opt !== correct) btn.classList.add('is-wrong');

          const reg = RESPUESTAS.find(r => r.quiz === quiz);
          if (reg) {
            reg.acertado = (btn.dataset.opt === correct);
            // Repintar de inmediato: en la vista de scroll de móvil el evento
            // slidechanged no se dispara y el panel se quedaría desactualizado.
            if (PANEL) pintarPanel(PANEL);
          }
        });
      });
    });
  }

  /* ----------------------------------------------------------
     2b. SOLUCIÓN OCULTA — para ejercicios de auto-estudio
     Uso en HTML:
       <div class="solucion" data-label="Ver mi predicción">
         …código, explicación, lo que sea…
       </div>
     El contenido queda oculto tras un botón. Sin data-label
     el botón dice "Ver solución".
     ---------------------------------------------------------- */
  function initSoluciones() {
    document.querySelectorAll('.solucion').forEach(box => {
      if (box.querySelector(':scope > .solucion-toggle')) return;

      const body = document.createElement('div');
      body.className = 'solucion-body';
      while (box.firstChild) body.appendChild(box.firstChild);

      const btn = document.createElement('button');
      btn.className = 'solucion-toggle';
      btn.type = 'button';
      const label = box.dataset.label || 'Show solution';
      btn.textContent = label;
      btn.setAttribute('aria-expanded', 'false');

      box.appendChild(btn);
      box.appendChild(body);

      // Marca "▾ sigue" mientras quede contenido por debajo del área visible
      const marcarSobrante = () => {
        const sobra = body.scrollHeight - body.clientHeight - body.scrollTop > 4;
        box.classList.toggle('hay-mas', sobra);
      };
      body.addEventListener('scroll', marcarSobrante);

      btn.addEventListener('click', () => {
        const abierto = box.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(abierto));
        btn.textContent = abierto ? 'Hide' : label;
        if (abierto) {
          ajustarAlturaSolucion(box, body);
          body.scrollTop = 0;
          marcarSobrante();
        } else {
          box.classList.remove('hay-mas');
        }
        if (window.Reveal) Reveal.layout();
      });
    });
  }

  /* Calcula cuánto espacio le queda a la solución dentro del lienzo de 720px.
     Se mide con la caja todavía cerrada: lo que sobra es lo que puede crecer.
     Si algo sale fuera de rango se deja el valor por omisión del CSS. */
  const LIENZO = 720;

  function ajustarAlturaSolucion(box, body) {
    const slide = box.closest('section');
    if (!slide) return;
    box.style.removeProperty('--solucion-max');

    const previo = box.classList.contains('open');
    box.classList.remove('open');
    const usado = slide.scrollHeight;          // altura del slide sin la solución
    if (previo) box.classList.add('open');

    const disponible = LIENZO - usado - 28;    // 28px de respiro inferior
    if (disponible > 140 && disponible < 620) {
      box.style.setProperty('--solucion-max', Math.floor(disponible) + 'px');
    }
  }

  /* ----------------------------------------------------------
     2c. CHECKLIST DE SALIDA — autoevaluación por deck
     Uso en HTML:
       <ul class="checklist" data-deck="v00">
         <li>Compilar tres archivos desde la terminal <span class="cl-ref">slide 6</span></li>
       </ul>
     El avance se guarda en el navegador del estudiante. Si el
     almacenamiento no está disponible, sigue funcionando en memoria.
     ---------------------------------------------------------- */
  function storage() {
    try {
      const k = '__probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return localStorage;
    } catch (e) { return null; }
  }

  function initChecklists() {
    const store = storage();

    document.querySelectorAll('.checklist').forEach(lista => {
      const clave = 'repaso:' + (lista.dataset.deck || 'sin-nombre');
      let hechos = [];
      try { hechos = JSON.parse((store && store.getItem(clave)) || '[]'); } catch (e) { hechos = []; }

      const items = [...lista.querySelectorAll(':scope > li')];
      items.forEach((li, i) => {
        li.setAttribute('role', 'checkbox');
        li.setAttribute('tabindex', '0');
        if (hechos.includes(i)) li.classList.add('done');
        li.setAttribute('aria-checked', String(li.classList.contains('done')));

        const toggle = () => {
          li.classList.toggle('done');
          li.setAttribute('aria-checked', String(li.classList.contains('done')));
          const marcados = items.map((el, j) => el.classList.contains('done') ? j : -1).filter(j => j >= 0);
          if (store) { try { store.setItem(clave, JSON.stringify(marcados)); } catch (e) {} }
        };

        li.addEventListener('click', toggle);
        li.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      });
    });
  }

  /* ----------------------------------------------------------
     2d. PANEL DE RESULTADO — solo para el deck de diagnóstico
     Cada quiz que deba contar lleva data-tema y data-sesion:
       <div class="quiz" data-correct="b" data-tema="Punteros" data-sesion="v08">
     y el slide final incluye:
       <div class="score-panel" data-base="repaso-"></div>
     El panel se recalcula cada vez que se entra a ese slide.
     ---------------------------------------------------------- */
  function pintarPanel(panel) {
    const total = RESPUESTAS.length;
    const aciertos = RESPUESTAS.filter(r => r.acertado === true).length;
    const pendientes = RESPUESTAS.filter(r => r.acertado === null).length;
    const fallados = RESPUESTAS.filter(r => r.acertado === false);
    const base = panel.dataset.base || '../repaso-';

    let msg;
    if (pendientes === total) msg = 'You have not answered any question yet. Go back to the previous slides.';
    else if (aciertos >= 13) msg = 'You can go straight to the sessions on the topics you missed and start the course.';
    else if (aciertos >= 9) msg = 'Read the sessions on the topics you missed; skim the rest as a quick review.';
    else msg = 'Read the full series, in order. Plan for 6 to 8 hours spread over two weeks.';

    const enlaces = fallados.map(r => {
      const v = r.quiz.dataset.sesion;
      const tema = r.quiz.dataset.tema;
      // El atributo guarda la carpeta (v13); la etiqueta visible de la serie es R13.
      const etiqueta = v ? 'R' + String(Number(v.slice(1))) : '';
      return v
        ? `<li><a href="${base}${v}/">${etiqueta} · ${tema}</a></li>`
        : `<li>${tema}</li>`;
    }).join('');

    panel.innerHTML = `
      <div class="score-num">${aciertos} / ${total}</div>
      <p class="score-msg">${msg}</p>
      ${fallados.length ? `<p><strong>Read these sessions:</strong></p><ul>${enlaces}</ul>` : ''}
      ${pendientes ? `<p class="score-pend">${pendientes} question(s) not answered yet.</p>` : ''}
    `;
  }

  let PANEL = null;

  function initScorePanel() {
    const panel = document.querySelector('.score-panel');
    if (!panel) return;
    PANEL = panel;
    if (window.Reveal) {
      const slide = panel.closest('section');
      Reveal.on('slidechanged', e => { if (e.currentSlide === slide) pintarPanel(panel); });
    }
    pintarPanel(panel);
  }

  /* ----------------------------------------------------------
     3. ANIMACIONES POR PASOS EN SVG
     En un slide, los elementos SVG con class="anim-step" y
     data-step="N" se encienden cuando el fragment N está visible
     (los pasos se sincronizan con los fragments del slide).
     Un mismo data-step en varios elementos los enciende juntos.
     data-step-off="M" opcional: se apaga al llegar al paso M.
     ---------------------------------------------------------- */
  function syncSvgSteps() {
    const slide = Reveal.getCurrentSlide();
    if (!slide) return;
    const shown = slide.querySelectorAll('.fragment.visible').length;
    slide.querySelectorAll('.anim-step').forEach(el => {
      const on = Number(el.dataset.step) <= shown;
      const off = el.dataset.stepOff !== undefined && Number(el.dataset.stepOff) <= shown;
      el.classList.toggle('on', on && !off);
    });
  }

  function initSvgAnim() {
    ['fragmentshown', 'fragmenthidden', 'slidechanged', 'ready']
      .forEach(ev => Reveal.on(ev, () => setTimeout(syncSvgSteps, 0)));
    syncSvgSteps();
  }

  /* ----------------------------------------------------------
     4. SIMULADOR DE PARTICIÓN — Lomuto y Hoare

     <div class="sim-particion" data-alg="hoare" data-array="7,8,5,2,1,6"></div>

     Los pasos no se escriben a mano: se obtienen ejecutando el
     algoritmo e instrumentando cada operación elemental (un
     ++i, un --j, una comparación, un intercambio). Cambiar
     data-array cambia el trazado completo, código incluido.

     Un paso = un fragment del slide, así que la barra
     espaciadora avanza la simulación igual que cualquier otro
     slide. Los botones llaman a Reveal para no desincronizarse.
     ---------------------------------------------------------- */

  const SIM_CODIGO = {
    lomuto: [
      'int p = a[hi];',
      'int i = lo;',
      'for (int j = lo; j < hi; ++j)',
      '    if (a[j] < p) {',
      '        std::swap(a[i], a[j]);  ++i;',
      '    }',
      'std::swap(a[i], a[hi]);',
      'return i;'
    ],
    hoare: [
      'int p = a[lo + (hi - lo) / 2];',
      'int i = lo - 1, j = hi + 1;',
      'while (true) {',
      '    do { ++i; } while (a[i] < p);',
      '    do { --j; } while (a[j] > p);',
      '    if (i >= j) return j;',
      '    std::swap(a[i], a[j]);',
      '}'
    ]
  };

  function pasosHoare(orig) {
    const a = orig.slice(), lo = 0, hi = a.length - 1, F = [];
    const mid = lo + ((hi - lo) >> 1);
    const p = a[mid];
    let i = lo - 1, j = hi + 1;
    const add = o => F.push(Object.assign(
      { arr: a.slice(), i, j, p, mark: [], cls: '', code: 0, test: '', say: '', zonas: null }, o));

    add({ i: null, j: null, code: 0, mark: [[mid, 'p']],
      test: `p = a[${mid}] = ${p}`,
      say: `The pivot is the middle element. <b>p stores the value ${p}</b>; if that cell gets swapped later, p still holds ${p}.` });

    add({ code: 1,
      test: `i = ${i} · j = ${j}`,
      say: `Both indices start <b>outside the array</b>, in the dashed cells. The first <code>++i</code> and the first <code>--j</code> bring them inside, so neither one skips the element at the end.` });

    for (;;) {
      for (;;) {                                   // do { ++i; } while (a[i] < p);
        i++;
        const sigue = a[i] < p;
        add({ code: 3, mark: [[i, 'i']],
          test: `++i → i = ${i} · a[${i}] = ${a[i]} · ${a[i]} < ${p}?  ${sigue ? 'yes' : 'no'}`,
          say: sigue
            ? `${a[i]} is already less than the pivot, so it is on the correct side. <b>i moves one more cell</b> without touching anything.`
            : `${a[i]} is in the left half and is not less than the pivot. <b>i stops here</b> and waits for j to find something to swap it with.` });
        if (!sigue) break;
      }
      for (;;) {                                   // do { --j; } while (a[j] > p);
        j--;
        const sigue = a[j] > p;
        add({ code: 4, mark: [[j, 'j']],
          test: `--j → j = ${j} · a[${j}] = ${a[j]} · ${a[j]} > ${p}?  ${sigue ? 'yes' : 'no'}`,
          say: sigue
            ? `${a[j]} is greater than the pivot and already in the right half. <b>j moves down one more cell</b> without touching anything: this is the move that gets lost when steps are merged.`
            : `${a[j]} is in the right half and is not greater than the pivot. <b>j stops</b>: now there are two misplaced elements, one at i and one at j.` });
        if (!sigue) break;
      }

      const cruzados = i >= j;
      add({ code: 5, mark: [[i, 'i'], [j, 'j']],
        test: `if (i >= j) · ${i} >= ${j}?  ${cruzados ? 'yes' : 'no'}`,
        say: cruzados
          ? `The indices have met, so <b>no unchecked part of the array is left</b> between them and the partition ends.`
          : `There is still array left between the two indices, so the pair they found is misplaced and must be swapped.` });

      if (cruzados) {
        add({ code: 5, mark: [], zonas: { corte: j, izq: `≤ ${p}`, der: `≥ ${p}` },
          test: `return j = ${j}`,
          say: `Hoare returns the boundary <b>j = ${j}</b>. The ${p} ended up inside the left zone without reaching its final position, which is why the recursion runs on <code>(lo, j)</code> and <code>(j+1, hi)</code>, with j included in the first half.` });
        break;
      }

      const vi = a[i], vj = a[j];
      [a[i], a[j]] = [a[j], a[i]];
      add({ code: 6, mark: [[i, 'sw'], [j, 'sw']],
        test: `std::swap(a[${i}], a[${j}])`,
        say: `${vi} goes to the right and ${vj} to the left: <b>one swap fixes both</b>. The loop starts again from where the indices stopped, without rechecking what they already passed.` });
    }
    return { frames: F, alg: 'hoare', n: a.length };
  }

  function pasosLomuto(orig) {
    const a = orig.slice(), lo = 0, hi = a.length - 1, F = [];
    const p = a[hi];
    let i = lo, j = null;
    const add = o => F.push(Object.assign(
      { arr: a.slice(), i, j, p, mark: [], cls: '', code: 0, test: '', say: '', zonas: null }, o));

    add({ i: null, j: null, code: 0, mark: [[hi, 'p']],
      test: `p = a[hi] = ${p}`,
      say: `The pivot is the last element and <b>stays put until the end</b>. The others are arranged around it while j scans the array.` });

    add({ j: null, code: 1, mark: [[i, 'i']],
      test: `i = ${i}`,
      say: `<b>i marks where the zone of smaller elements ends</b>, which is empty for now. Every time an element smaller than the pivot shows up, i will move one cell.` });

    for (j = lo; j < hi; j++) {
      const menor = a[j] < p;
      add({ code: 3, mark: [[j, 'j']],
        test: `j = ${j} · a[${j}] = ${a[j]} · ${a[j]} < ${p}?  ${menor ? 'yes' : 'no'}`,
        say: menor
          ? `${a[j]} is less than the pivot, so <b>it must join the zone of smaller elements</b>, which currently ends at i = ${i}.`
          : `${a[j]} stays where it is. <b>j advances and i does not move</b>; the growing gap between them holds the elements already known to be greater than or equal to the pivot.` });
      if (menor) {
        const vi = a[i], vj = a[j], antes = i;
        [a[i], a[j]] = [a[j], a[i]];
        i++;
        add({ code: 4, mark: [[antes, 'sw'], [j, 'sw']],
          test: `std::swap(a[${antes}], a[${j}]) · ++i → i = ${i}`,
          say: antes === j
            ? `i and j point to the same cell, so the swap moves nothing. What changes is <b>i, which advances to ${i}</b>: the zone of smaller elements grew by one cell.`
            : `${vj} enters the zone of smaller elements and ${vi}, which did not belong there, leaves in exchange. <b>i advances to ${i}</b>.` });
      }
    }

    j = hi;
    add({ code: 2, mark: [],
      test: `j = ${hi} = hi · the loop ends`,
      say: `j reached the pivot, so <b>the whole array has been checked</b>. The zone of smaller elements spans cells ${lo} to ${i - 1}, and the pivot is still at the end, not yet placed.` });

    [a[i], a[hi]] = [a[hi], a[i]];
    add({ code: 6, mark: [[i, 'sw'], [hi, 'sw']],
      test: `std::swap(a[${i}], a[${hi}])`,
      say: `The pivot is swapped with the first element of the zone of larger elements and <b>lands exactly on the boundary</b>, which is its position in the sorted array.` });

    add({ code: 7, mark: [], zonas: { corte: i - 1, pivote: i, izq: `< ${p}`, der: `≥ ${p}` },
      test: `return i = ${i}`,
      say: `Lomuto returns <b>i = ${i}</b>, the final position of the pivot. The ${p} never moves again, so the recursion excludes it: <code>(lo, ${i - 1})</code> and <code>(${i + 1}, hi)</code>.` });

    return { frames: F, alg: 'lomuto', n: a.length };
  }

  /* ----------------------------------------------------------
     Quickselect. La granularidad es distinta a propósito: aquí
     un paso es una RONDA completa, no una operación elemental.
     Los movimientos de i y j ya se vieron en los dos slides de
     partición; lo que esta animación tiene que hacer visible es
     qué mitad se descarta y cuánto arreglo queda vivo.

     El panel de abajo lleva la cuenta del trabajo por ronda, que
     es el argumento numérico de por qué el total es Θ(n).
     ---------------------------------------------------------- */
  function pasosQuickselect(orig, k) {
    const a = orig.slice(), n = a.length, F = [], filas = [];
    let lo = 0, hi = n - 1, total = 0;

    const add = o => F.push(Object.assign(
      { arr: a.slice(), kIdx: k, p: null, activo: [lo, hi], mark: [],
        code: -1, verHasta: null, test: '', say: '', zonas: null, chips: [] }, o));

    const rango = (l, h) => `a[${l}..${h}]`;

    add({ activo: [0, n - 1],
      chips: [['k = ' + k, 'ci'], ['range ' + rango(0, n - 1), '']],
      test: `looking for the ${k + 1}${['th','st','nd','rd'][((k + 1) % 100 - 20) % 10] || ['th','st','nd','rd'][(k + 1) % 100] || 'th'} smallest`,
      say: `We want the value that would occupy cell <b>${k}</b> if the array were sorted. The cell exists already; what we do not know yet is which value belongs there.` });

    let ronda = 0;
    for (;;) {
      const tam = hi - lo + 1;
      total += tam;
      filas.push(`round ${ronda + 1}   ${(rango(lo, hi) + '        ').slice(0, 10)}  ${String(tam).padStart(2)} ${tam === 1 ? 'element' : 'elements'}`);
      const fila = ronda;

      if (lo === hi) {
        add({ p: lo, activo: [lo, hi], mark: [[lo, 'f']], code: fila,
          chips: [['k = ' + k, 'ci'], ['range ' + rango(lo, hi), '']],
          test: `lo == hi · the range is down to one element`,
          say: `The range shrank to a single cell, and that cell is <b>${k}</b>. No more partitioning is needed: the value left there is the answer.` });
        break;
      }

      // Partición de Lomuto con el último como pivote, igual que el código.
      const pv = a[hi];
      let i = lo;
      for (let j = lo; j < hi; j++) if (a[j] < pv) { [a[i], a[j]] = [a[j], a[i]]; i++; }
      [a[i], a[hi]] = [a[hi], a[i]];
      const p = i;

      add({ p, activo: [lo, hi], mark: [[p, 'p']], code: fila,
        zonas: { corte: p - 1, pivote: p, izq: `< ${pv}`, der: `≥ ${pv}`, desde: lo, hasta: hi },
        chips: [['k = ' + k, 'ci'], ['range ' + rango(lo, hi), ''], [`p = ${p}`, 'cok']],
        test: `partition(${rango(lo, hi)}) → p = ${p}`,
        say: `One partition over ${tam} elements leaves the pivot <b>${pv}</b> in cell <b>${p}</b>, with smaller elements to its left and larger ones to its right. That cell is already its final position.` });

      if (p === k) {
        add({ p, activo: [lo, hi], mark: [[p, 'f']], code: fila,
          chips: [['k = ' + k, 'ci'], [`p = ${p}`, 'cok']],
          test: `p == k · done`,
          say: `The pivot landed exactly on the cell we were looking for. Since its position is final, <b>a[${k}] = ${a[k]}</b> is the answer.` });
        break;
      }

      const izq = k < p;
      const nlo = izq ? lo : p + 1, nhi = izq ? p - 1 : hi;
      const descartados = izq ? (hi - p + 1) : (p - lo + 1);

      add({ p, activo: [nlo, nhi], mark: [[p, 'p']], code: fila,
        chips: [['k = ' + k, 'ci'], [`p = ${p}`, 'cok'], [`next ${rango(nlo, nhi)}`, '']],
        test: `k < p? · ${k} < ${p}?  ${izq ? 'yes' : 'no'}`,
        say: izq
          ? `Cell ${k} is <b>to the left</b> of the pivot, so the value we want is there. The ${descartados} elements from the pivot onward are discarded and never touched again.`
          : `Cell ${k} is <b>to the right</b> of the pivot, so the value we want is there. The ${descartados} elements up to the pivot are discarded and never touched again.` });

      lo = nlo; hi = nhi; ronda++;
    }

    filas.push('─'.repeat(34));
    filas.push(`total     ${String(total).padStart(12)} elements`);
    filas.push(`quicksort would do ~${n} per level`);

    // El último frame enciende el renglón del total.
    const fin = F[F.length - 1];
    F.push(Object.assign({}, fin, {
      code: filas.length - 2, verHasta: filas.length - 1, mark: [[k, 'f']], zonas: null,
      chips: [['k = ' + k, 'ci'], [`answer ${a[k]}`, 'cok']],
      test: `return a[${k}] = ${a[k]}`,
      say: `Adding up the rounds, <b>${total} elements</b> were touched in total, not ${n} per level: each round discarded a part and never went back to it. That shrinking sum is why the average cost is Θ(n) and not Θ(n log n).`
    }));

    return { frames: F, alg: 'quickselect', modo: 'seleccion', n, filas };
  }

  /* ----------------------------------------------------------
     Selection sort. Un paso por comparación, a propósito: lo que
     hay que ver es que el ciclo interno recorre la zona no
     ordenada COMPLETA siempre, encuentre o no algo que corregir.
     Esa es la razón de que Θ(n²) sea cota exacta en todos los
     casos, y no se aprecia con pasos gruesos.

     El panel de abajo separa comparaciones de intercambios, que
     es la asimetría del slide siguiente.
     ---------------------------------------------------------- */
  function pasosSeleccion(orig) {
    const a = orig.slice(), n = a.length, F = [], filas = [];
    let comps = 0, swaps = 0;

    const add = o => F.push(Object.assign(
      { arr: a.slice(), i: null, j: null, m: null, ordenado: 0, mark: [],
        code: -1, verHasta: null, test: '', say: '', zonas: null, chips: [] }, o));

    const inv = i => ({ desde: 0, hasta: n - 1, corte: i - 1, crudo: true,
                        izq: 'sorted', der: 'unsorted' });

    add({ i: 0, ordenado: 0, zonas: inv(0),
      chips: [['i = 0', 'ci']],
      test: `n = ${n} · ${n - 1} passes`,
      say: `The sorted zone starts <b>empty</b>. Each pass adds one element on the left: it finds the smallest of what is left and brings it to the boundary.` });

    for (let i = 0; i < n - 1; i++) {
      let m = i;
      const compsPasada = n - 1 - i;

      for (let j = i + 1; j < n; j++) {
        comps++;
        const menor = a[j] < a[m];
        const anterior = a[m];
        if (menor) m = j;
        // El renglón de esta pasada todavía no se enseña: diría si hubo
        // intercambio antes de que el alumno pueda saberlo.
        add({ i, j, m, ordenado: i, mark: [[j, 'j'], [m, 'p']], zonas: inv(i), code: i - 1,
          chips: [[`i = ${i}`, 'ci'], [`m = ${m}`, 'cok'], [`j = ${j}`, 'cj']],
          test: `a[${j}] < a[m]? · ${a[j]} < ${anterior}?  ${menor ? 'yes' : 'no'}`,
          say: (j === i + 1
                 ? `It starts by assuming the smallest is <b>a[${i}] = ${i === m ? a[i] : anterior}</b>, the first element of the unsorted zone. `
                 : '') +
               (menor
                 ? `${a[j]} is smaller than the candidate, so <b>m moves to ${m}</b>. The scan does not stop: the rest still has to be checked.`
                 : `${a[j]} does not beat the candidate, so m stays. <b>The comparison was made anyway</b>, and that is what costs.`) });
      }

      const huboSwap = m !== i;
      const vi = a[i], vm = a[m];
      if (huboSwap) { [a[i], a[m]] = [a[m], a[i]]; swaps++; }

      filas.push(`pass ${i + 1}  a[${i}..${n - 1}]   ${compsPasada} comp   ${huboSwap ? 'swap' : '—'}`);

      add({ i, j: null, m, ordenado: i + 1, mark: huboSwap ? [[i, 'sw'], [m, 'sw']] : [[i, 'f']],
        zonas: inv(i + 1), code: i,
        chips: [[`i = ${i}`, 'ci'], [`m = ${m}`, 'cok']],
        test: huboSwap ? `m != i → swap(a[${i}], a[${m}])` : `m == i → no swap`,
        say: huboSwap
          ? `The smallest in the zone was <b>${vm}</b>. A single swap brings it to cell ${i} and sends ${vi} to where it was: the sorted zone grew to ${i + 1}.`
          : `The smallest in the zone was already in place, so <b>nothing moves</b>. The ${compsPasada} comparisons were made anyway — searching costs even when there is nothing to fix.` });
    }

    const totalComps = n * (n - 1) / 2;
    filas.push('─'.repeat(33));
    filas.push(`total            ${totalComps} comp   ${swaps} swaps`);
    filas.push(`${totalComps} = n(n-1)/2, for any input`);

    add({ i: n - 1, ordenado: n, mark: [], zonas: null,
      code: filas.length - 2, verHasta: filas.length - 1,
      chips: [['sorted', 'cok']],
      test: `${totalComps} comparisons · ${swaps} swaps`,
      say: `The <b>${totalComps} comparisons</b> did not depend on the input: the inner loop scanned the whole unsorted zone on every pass. The swaps did, and there were <b>${swaps}</b>. Searching a lot and moving little is the signature of this algorithm.` });

    return { frames: F, alg: 'seleccion', modo: 'seleccion', n, filas };
  }

  /* El panel de trabajo de quickselect: solo se resaltan los números. */
  function pintarTexto(linea) {
    return linea
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  }

  /* Coloreado mínimo del panel de código, al estilo github-dark. */
  function pintarCodigo(linea) {
    const esc = linea.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc
      .replace(/(\/\/.*)$/, '<span class="cm">$1</span>')
      .replace(/\b(int|while|do|for|if|else|return|true|new|delete|nullptr|size_t)\b/g, '<span class="kw">$1</span>')
      .replace(/\b(std::swap|Node)\b/g, '<span class="fn">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  }

  /* ----------------------------------------------------------
     5. SIMULADOR DE LISTA ENLAZADA
     <div class="sim-particion sim-lista" data-alg="lista-insert"
          data-lista="10,20,40" data-x="30" data-pos="2"></div>
     data-alg: lista-insert · lista-insert-al-reves · lista-remove

     Igual que los de ordenamiento, los pasos salen de ejecutar la
     operación sobre un modelo de nodos y punteros; un paso es una
     línea de código. Cada flecha que cambió respecto al paso
     anterior se pinta en verde: eso es la "cirugía".
     ---------------------------------------------------------- */
  const LISTA_CODIGO = {
    'lista-insert': [
      'if (pos > count) return false;',
      'if (pos == 0) head = new Node{x, head};',
      'else { Node* prev = head;',
      '  for (size_t i = 0; i < pos - 1; ++i)',
      '    prev = prev->next;',
      '  prev->next = new Node{x, prev->next}; }',
      '++count;'
    ],
    'lista-insert-al-reves': [
      'Node* node = new Node{x, nullptr};',
      'prev->next = node;',
      'node->next = prev->next;'
    ],
    'lista-remove': [
      'if (head && head->data == x) { … }',
      'for (Node* prev = head; prev; prev = prev->next)',
      '  if (prev->next && prev->next->data == x) {',
      '    Node* victim = prev->next;',
      '    prev->next = victim->next;',
      '    delete victim;  --count;',
      '    return true; }'
    ]
  };

  function modeloLista(valores) {
    const nodos = {};
    valores.forEach((v, k) => {
      nodos['n' + k] = { dato: v, c: k, r: 0,
                         next: k + 1 < valores.length ? 'n' + (k + 1) : null, est: '' };
    });
    return { nodos, head: valores.length ? 'n0' : null, count: valores.length };
  }

  function fotoLista(M, extra) {
    const nodos = {};
    for (const id in M.nodos) nodos[id] = Object.assign({}, M.nodos[id]);
    return Object.assign({ nodos, code: -1, test: '', say: '', chips: [], ptrs: [] }, extra);
  }

  // Coloca en línea, de izquierda a derecha, los nodos alcanzables desde head.
  function enLinea(M) {
    let id = M.head, c = 0;
    const vistos = new Set();
    while (id && !vistos.has(id)) {
      vistos.add(id);
      Object.assign(M.nodos[id], { c: c++, r: 0 });
      id = M.nodos[id].next;
    }
  }

  function pasosListaInsert(vals, x, pos) {
    const M = modeloLista(vals), F = [];
    const chips = () => [[`count = ${M.count}`, ''], [`pos = ${pos}`, 'ci'], [`x = ${x}`, 'cok']];
    const antes = vals[pos - 1], despues = vals[pos];
    const add = o => F.push(fotoLista(M, Object.assign({ chips: chips() }, o)));

    add({ ptrs: [['head', M.head, 'ph']],
      test: `insert(${x}, ${pos})`,
      say: `The list has ${M.count} nodes. We want <b>${x}</b> to end up at position ${pos}` +
           (despues !== undefined ? `, between ${antes} and ${despues}.` : `, at the end, after ${antes}.`) });

    add({ code: 0, ptrs: [['head', M.head, 'ph']],
      test: `pos > count? · ${pos} > ${M.count}?  no`,
      say: `The position exists: you can insert anywhere from 0 to ${M.count}, which means "after the last one".` });

    add({ code: 1, ptrs: [['head', M.head, 'ph']],
      test: `pos == 0?  no`,
      say: `It is not the head, so we have to walk. The only node whose <code>next</code> will change is the one <b>before</b> position ${pos}, and that is the one we need to reach.` });

    let prev = M.head;
    add({ code: 2, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
      test: `prev = head`,
      say: `<code>prev</code> starts at the head, ${M.nodos[prev].dato}.` });

    for (let i = 0; ; i++) {
      const sigue = i < pos - 1;
      add({ code: 3, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
        test: `i = ${i} · ${i} < ${pos - 1}?  ${sigue ? 'yes' : 'no'}`,
        say: sigue
          ? `It is not yet at the node before position ${pos}: move one forward.`
          : `<code>prev</code> stops at <b>${M.nodos[prev].dato}</b>, the node at position ${pos - 1}. From here we can reach its <code>next</code>, which is the only thing that has to change.` });
      if (!sigue) break;
      prev = M.nodos[prev].next;
      add({ code: 4, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
        test: `prev = prev->next`,
        say: `<code>prev</code> moves to ${M.nodos[prev].dato}. Walking is the only way to get there: a list has no access by index.` });
    }

    // Lado derecho primero: el nodo nuevo nace ya apuntando al sucesor.
    const nuevo = 'n' + vals.length;
    const cp = M.nodos[prev].c;
    M.nodos[nuevo] = { dato: x, c: cp + 0.5, r: 1, next: M.nodos[prev].next, est: 'nuevo' };
    add({ code: 5, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
      test: `new Node{${x}, prev->next}`,
      say: `The right-hand side is evaluated first: <code>new Node{x, prev->next}</code> creates ${x} and its <code>next</code> <b>already points to ${despues !== undefined ? despues : 'nullptr'}</b>. The list has not changed yet: nobody points to ${x}.` });

    M.nodos[prev].next = nuevo;
    add({ code: 5, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
      test: `prev->next = (the new node)`,
      say: `Now the <code>next</code> of ${M.nodos[prev].dato} switches to ${x}. Since ${x} already knew how to reach ${despues !== undefined ? despues : 'the end'}, <b>nothing was lost</b>. That is the order the code comment asks for.` });

    M.count++;
    add({ code: 6, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
      test: `++count → ${M.count}`,
      say: `The counter goes up to ${M.count}. If you forget this line, <code>size()</code> is still O(1) but returns a wrong number, and the contract's invariant breaks without anything crashing.` });

    M.nodos[nuevo].est = '';
    enLinea(M);
    add({ code: -1, ptrs: [['head', M.head, 'ph']],
      test: 'list: ' + (() => { const o = []; let id = M.head; while (id) { o.push(M.nodos[id].dato); id = M.nodos[id].next; } return o.join(' → '); })(),
      say: `Laid out in a row. <b>Two pointers</b> changed and no data moved: linking costs O(1). The expensive part was walking to <code>prev</code>, which costs O(pos).` });

    return { frames: F, n: vals.length + 1 };
  }

  function pasosListaInsertAlReves(vals, x, pos) {
    const M = modeloLista(vals), F = [];
    const prev = 'n' + (pos - 1);
    const suc = M.nodos[prev].next;
    const add = o => F.push(fotoLista(M, Object.assign({ chips: [[`x = ${x}`, 'cok'], [`pos = ${pos}`, 'ci']] }, o)));

    add({ ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp']],
      test: `prev already reached ${M.nodos[prev].dato}`,
      say: `Same starting point as before: <code>prev</code> is at ${M.nodos[prev].dato}. This time the links are set in the opposite order, which is how it comes out when written without thinking.` });

    const nuevo = 'n' + vals.length;
    M.nodos[nuevo] = { dato: x, c: M.nodos[prev].c + 0.5, r: 1, next: null, est: 'nuevo' };
    add({ code: 0, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp'], ['node', nuevo, 'pn']],
      test: `node = new Node{${x}, nullptr}`,
      say: `${x} is created with an empty <code>next</code>. No harm so far: the list is intact.` });

    M.nodos[prev].next = nuevo;
    M.nodos[suc].est = 'perdido';
    add({ code: 1, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp'], ['node', nuevo, 'pn']],
      test: `prev->next = node`,
      say: `${M.nodos[prev].dato} now points to ${x}. But the only path to <b>${M.nodos[suc].dato}</b> was <code>prev->next</code>, and it was just overwritten: nobody holds its address.` });

    M.nodos[nuevo].next = M.nodos[prev].next;   // = nuevo
    add({ code: 2, ptrs: [['head', M.head, 'ph'], ['prev', prev, 'pp'], ['node', nuevo, 'pn']],
      test: `node->next = prev->next   // = node`,
      say: `<code>prev->next</code> is already ${x}, so ${x} ends up <b>pointing to itself</b>. The line that was supposed to rescue ${M.nodos[suc].dato} came too late.` });

    add({ code: -1, ptrs: [['head', M.head, 'ph']],
      test: `traverse: ${vals.slice(0, pos).join(' → ')} → ${x} → ${x} → ${x} → …`,
      say: `Result: a <b>cycle</b> and a <b>leak</b>. Traversing the list never ends, and ${M.nodos[suc].dato} —with everything hanging from it— can no longer be freed. It compiles without a single warning.` });

    return { frames: F, n: vals.length + 1 };
  }

  function pasosListaRemove(vals, x) {
    const M = modeloLista(vals), F = [];
    const chips = () => [[`count = ${M.count}`, ''], [`x = ${x}`, 'cj']];
    const add = o => F.push(fotoLista(M, Object.assign({ chips: chips() }, o)));
    const H = () => ['head', M.head, 'ph'];

    add({ ptrs: [H()], test: `remove(${x})`,
      say: `We need to remove the first occurrence of <b>${x}</b> without losing any other node and without leaving memory unfreed.` });

    const d0 = M.nodos[M.head].dato;
    M.nodos[M.head].est = 'hl';
    add({ code: 0, ptrs: [H()],
      test: `head->data == x? · ${d0} == ${x}?  ${d0 === x ? 'yes' : 'no'}`,
      say: `The head is checked separately: if it were the one, what changes is <code>head</code>, not the <code>next</code> of any node. It is not, so the general case follows.` });
    M.nodos[M.head].est = '';

    let prev = M.head;
    add({ code: 1, ptrs: [H(), ['prev', prev, 'pp']],
      test: `prev = head`,
      say: `<code>prev</code> starts at the head. It will always look <b>one node ahead</b> of where it stands.` });

    for (;;) {
      const sig = M.nodos[prev].next;
      const es = M.nodos[sig].dato === x;
      M.nodos[sig].est = 'hl';
      add({ code: 2, ptrs: [H(), ['prev', prev, 'pp']],
        test: `prev->next->data == x? · ${M.nodos[sig].dato} == ${x}?  ${es ? 'yes' : 'no'}`,
        say: es
          ? `Found it, and <code>prev</code> is <b>right before</b> it. That is why we compare the next node and not the current one: to unlink a node you must stand on the one before it.`
          : `We compare the data of the <b>next</b> node, not that of <code>prev</code>. It is not a match, so move forward.` });
      M.nodos[sig].est = '';
      if (es) break;
      prev = sig;
      add({ code: 1, ptrs: [H(), ['prev', prev, 'pp']],
        test: `prev = prev->next`,
        say: `<code>prev</code> moves to ${M.nodos[prev].dato}.` });
    }

    const vic = M.nodos[prev].next;
    add({ code: 3, ptrs: [H(), ['prev', prev, 'pp'], ['victim', vic, 'pv']],
      test: `victim = prev->next`,
      say: `The address of ${x} is saved in <code>victim</code>. This is necessary: the next line overwrites <code>prev->next</code>, and without this copy there would be no way to free it.` });

    M.nodos[prev].next = M.nodos[vic].next;
    M.nodos[vic].r = 1;
    const sucDato = M.nodos[vic].next ? M.nodos[M.nodos[vic].next].dato : 'nullptr';
    add({ code: 4, ptrs: [H(), ['prev', prev, 'pp'], ['victim', vic, 'pv']],
      test: `prev->next = victim->next`,
      say: `${M.nodos[prev].dato} skips over ${x} and points to ${sucDato}. ${x} is now <b>out of the chain</b>, but it still exists in memory: its <code>next</code> still points to ${sucDato}.` });

    M.nodos[vic].est = 'liberado';
    M.count--;
    add({ code: 5, ptrs: [H(), ['prev', prev, 'pp'], ['victim', vic, 'pv']],
      test: `delete victim · --count → ${M.count}`,
      say: `It is freed. <code>victim</code> <b>still holds the address</b> of memory that is no longer yours: it is a dangling pointer. It does no harm here because the function returns on the next line.` });

    delete M.nodos[vic];
    enLinea(M);
    add({ code: 6, ptrs: [H()],
      test: 'list: ' + (() => { const o = []; let id = M.head; while (id) { o.push(M.nodos[id].dato); id = M.nodos[id].next; } return o.join(' → '); })(),
      say: `Relink first, free afterwards: in that order no node is lost and no memory is left unfreed. If you reverse it, <code>victim->next</code> is read from memory that was already freed.` });

    return { frames: F, n: vals.length };
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let simListaUid = 0;

  function construirLista(cont) {
    const alg = cont.dataset.alg;
    const vals = (cont.dataset.lista || '10,20,40').split(',').map(s => Number(s.trim()));
    const x = Number(cont.dataset.x || 30);
    const pos = Number(cont.dataset.pos || 2);
    const run = alg === 'lista-remove' ? pasosListaRemove(vals, x)
              : alg === 'lista-insert-al-reves' ? pasosListaInsertAlReves(vals, x, pos)
              : pasosListaInsert(vals, x, pos);
    const uid = 'sl' + (++simListaUid);

    cont.innerHTML = '';

    // Geometría: nodo de 150 × 56 (dato | next), columnas cada 215.
    const W = 150, H = 56, PASO = 215, X0 = 24, Y = [62, 158];
    let maxC = 0;
    run.frames.forEach(f => { for (const id in f.nodos) maxC = Math.max(maxC, f.nodos[id].c); });
    const ancho = X0 + maxC * PASO + W + 30;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${ancho} 232`);
    svg.setAttribute('class', 'sl-svg');
    svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
    svg.innerHTML =
      `<defs>
         <marker id="${uid}-a" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="sl-punta"/></marker>
         <marker id="${uid}-b" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="sl-punta nueva"/></marker>
         <marker id="${uid}-c" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="sl-punta muerta"/></marker>
       </defs><g class="sl-capa"></g>`;
    cont.appendChild(svg);
    const capa = svg.querySelector('.sl-capa');

    const barra = document.createElement('div');
    barra.className = 'sim-barra';
    barra.innerHTML =
      '<span class="sim-chip"></span><span class="sim-chip"></span><span class="sim-chip"></span>' +
      '<span class="sim-test"></span>' +
      '<span class="sim-ctrl">' +
        '<button type="button" data-ir="-1" aria-label="Previous step">◀</button>' +
        '<span class="sim-cont"></span>' +
        '<button type="button" data-ir="1" aria-label="Next step">▶</button>' +
      '</span>';
    cont.appendChild(barra);
    const chips = [...barra.querySelectorAll('.sim-chip')];

    const abajo = document.createElement('div');
    abajo.className = 'sim-abajo';
    const pre = document.createElement('pre');
    pre.className = 'sim-codigo sl-codigo';
    pre.innerHTML = LISTA_CODIGO[alg].map(l => `<div class="sim-linea">${pintarCodigo(l)}</div>`).join('');
    abajo.appendChild(pre);
    const dice = document.createElement('p');
    dice.className = 'sim-dice';
    abajo.appendChild(dice);
    cont.appendChild(abajo);
    const lineas = [...pre.querySelectorAll('.sim-linea')];

    const huecos = document.createElement('span');
    huecos.className = 'sim-fragments';
    for (let k = 1; k < run.frames.length; k++) {
      const f = document.createElement('span');
      f.className = 'fragment';
      f.setAttribute('aria-hidden', 'true');
      huecos.appendChild(f);
    }
    cont.appendChild(huecos);

    const el = (tag, attrs, txt) => {
      const e = document.createElementNS(SVG_NS, tag);
      for (const a in attrs) e.setAttribute(a, attrs[a]);
      if (txt !== undefined) e.textContent = txt;
      return e;
    };
    const posDe = n => ({ x: X0 + n.c * PASO, y: Y[n.r] });

    function pintar(k) {
      const f = run.frames[Math.max(0, Math.min(k, run.frames.length - 1))];
      const previo = k > 0 ? run.frames[k - 1] : null;
      capa.innerHTML = '';

      // 1. Flechas (debajo de los nodos).
      for (const id in f.nodos) {
        const n = f.nodos[id], p = posDe(n);
        const sx = p.x + 125, sy = p.y + H / 2;
        const cambio = previo && (!previo.nodos[id] || previo.nodos[id].next !== n.next) && n.next !== null;
        if (n.next === null) {
          capa.appendChild(el('line', { x1: p.x + 108, y1: p.y + H - 8, x2: p.x + W - 8, y2: p.y + 8, class: 'sl-nulo' }));
          continue;
        }
        const t = f.nodos[n.next];
        if (!t) continue;
        const q = posDe(t);
        const muerta = n.est === 'liberado';
        const cls = 'sl-flecha' + (muerta ? ' muerta' : cambio ? ' nueva' : '');
        const mk = `url(#${uid}-${muerta ? 'c' : cambio ? 'b' : 'a'})`;
        if (n.next === id) {                       // se apunta a sí mismo: sale por la derecha y entra por arriba
          const d = `M ${sx} ${sy} C ${p.x + W + 70} ${sy}, ${p.x + W + 45} ${p.y - 42}, ${p.x + W - 22} ${p.y - 3}`;
          capa.appendChild(el('path', { d, class: cls, 'marker-end': mk }));
          continue;
        }
        let tx = q.x - 2, ty = q.y + H / 2;
        if (t.r !== n.r) {                         // cambia de renglón: entra por arriba o abajo
          tx = q.x + 30;
          ty = t.r > n.r ? q.y - 2 : q.y + H + 2;
        }
        capa.appendChild(el('line', { x1: sx, y1: sy, x2: tx, y2: ty, class: cls, 'marker-end': mk }));
      }

      // 2. Nodos.
      for (const id in f.nodos) {
        const n = f.nodos[id], p = posDe(n);
        const g = el('g', { class: 'sl-nodo' + (n.est ? ' ' + n.est : '') });
        g.appendChild(el('rect', { x: p.x, y: p.y, width: W, height: H, rx: 8, class: 'caja' }));
        g.appendChild(el('line', { x1: p.x + 100, y1: p.y, x2: p.x + 100, y2: p.y + H, class: 'div' }));
        g.appendChild(el('text', { x: p.x + 50, y: p.y + H / 2 + 9, class: 'dato' }, n.dato));
        g.appendChild(el('circle', { cx: p.x + 125, cy: p.y + H / 2, r: 4.5, class: 'raiz' }));
        const etq = n.est === 'liberado' ? 'freed' : n.est === 'perdido' ? 'unreachable' : '';
        if (etq) g.appendChild(n.r === 0
          ? el('text', { x: p.x + W / 2, y: p.y - 10, class: 'sl-etq' }, etq)
          : el('text', { x: p.x + W + 14, y: p.y + H / 2 + 5, class: 'sl-etq izq' }, etq));
        capa.appendChild(g);
      }

      // 3. Punteros con nombre: encima del nodo en el renglón de arriba,
      //    a su izquierda en el de abajo.
      const porNodo = {};
      f.ptrs.forEach(([nom, id, cls]) => { if (id && f.nodos[id]) (porNodo[id] = porNodo[id] || []).push([nom, cls]); });
      for (const id in porNodo) {
        const n = f.nodos[id], p = posDe(n);
        let cursor = n.r === 0 ? p.x : p.x - 8;
        porNodo[id].forEach(([nom, cls]) => {
          const w = 16 + nom.length * 11;
          const bx = n.r === 0 ? cursor : cursor - w;
          const by = n.r === 0 ? p.y - 34 : p.y + H / 2 - 13;
          const g = el('g', { class: 'sl-ptr ' + cls });
          g.appendChild(el('rect', { x: bx, y: by, width: w, height: 26, rx: 6 }));
          g.appendChild(el('text', { x: bx + w / 2, y: by + 18 }, nom));
          capa.appendChild(g);
          cursor = n.r === 0 ? cursor + w + 6 : bx - 6;
        });
      }

      chips.forEach((c, idx) => {
        const v = f.chips[idx];
        c.hidden = !v;
        if (!v) return;
        c.textContent = v[0];
        c.className = 'sim-chip ' + (v[1] || '');
      });
      barra.querySelector('.sim-test').textContent = f.test;
      barra.querySelector('.sim-cont').textContent = `${k + 1} / ${run.frames.length}`;
      dice.innerHTML = f.say;
      lineas.forEach((l, idx) => l.classList.toggle('on', idx === f.code));
    }

    barra.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (typeof Reveal === 'undefined') return;
        if (Number(b.dataset.ir) > 0) Reveal.nextFragment(); else Reveal.prevFragment();
      });
    });

    cont._simPintar = pintar;
    cont._simTotal = run.frames.length;
    pintar(0);
  }

  /* ----------------------------------------------------------
     6. SIMULADORES DE MEMORIA
     <div class="sim-particion sim-mem" data-alg="mem-alias"></div>
     <div class="sim-particion sim-mem" data-alg="mem-mapa"></div>

     mem-alias: una fila de celdas del stack, con dirección y
       tamaño. Valor, puntero y referencia lado a lado: la copia
       tiene celda propia, el puntero tiene celda propia que guarda
       una dirección, la referencia NO agrega celda.
     mem-mapa: las cuatro regiones de un proceso (stack, heap,
       datos, código) mientras corre un programa de 11 líneas:
       frames que se apilan y desaparecen, bloques del heap que
       sobreviven a su función, una fuga y un puntero colgante.

     Las direcciones son ficticias pero verosímiles para x86-64
     Linux: el stack cerca de 0x7ffc…, el heap y las globales
     cerca de 0x5621…. Lo que importa es que se puedan comparar a
     ojo: el valor de un puntero y la dirección de su destino son
     el mismo texto.
     ---------------------------------------------------------- */

  // Cascarón común: barra de estado, panel de código, explicación y
  // un fragment por paso. Cada simulador decide dónde acomodarlos.
  function armarCascaron(cont, codigo, nPasos) {
    const barra = document.createElement('div');
    barra.className = 'sim-barra';
    barra.innerHTML =
      '<span class="sim-chip"></span><span class="sim-chip"></span><span class="sim-chip"></span>' +
      '<span class="sim-test"></span>' +
      '<span class="sim-ctrl">' +
        '<button type="button" data-ir="-1" aria-label="Previous step">◀</button>' +
        '<span class="sim-cont"></span>' +
        '<button type="button" data-ir="1" aria-label="Next step">▶</button>' +
      '</span>';
    barra.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (typeof Reveal === 'undefined') return;
        if (Number(b.dataset.ir) > 0) Reveal.nextFragment(); else Reveal.prevFragment();
      });
    });
    const pre = document.createElement('pre');
    pre.className = 'sim-codigo';
    pre.innerHTML = codigo.map(l => `<div class="sim-linea">${pintarCodigo(l)}</div>`).join('');
    const dice = document.createElement('p');
    dice.className = 'sim-dice';
    const huecos = document.createElement('span');
    huecos.className = 'sim-fragments';
    for (let k = 1; k < nPasos; k++) {
      const f = document.createElement('span');
      f.className = 'fragment';
      f.setAttribute('aria-hidden', 'true');
      huecos.appendChild(f);
    }
    const chips = [...barra.querySelectorAll('.sim-chip')];
    const lineas = [...pre.querySelectorAll('.sim-linea')];
    const pintarComun = (f, k) => {
      chips.forEach((c, idx) => {
        const v = f.chips[idx];
        c.hidden = !v;
        if (!v) return;
        c.textContent = v[0];
        c.className = 'sim-chip ' + (v[1] || '');
      });
      barra.querySelector('.sim-test').textContent = f.test;
      barra.querySelector('.sim-cont').textContent = `${k + 1} / ${nPasos}`;
      // Predecir antes de ver: la pregunta se hace un paso ANTES de la respuesta.
      dice.innerHTML = f.say + (f.predice ? `<span class="predice"><b>Before you advance:</b> ${f.predice}</span>` : '');
      lineas.forEach((l, idx) => l.classList.toggle('on', idx === f.code));
    };
    return { barra, pre, dice, huecos, pintarComun };
  }

  const svgEl = (tag, attrs, txt) => {
    const e = document.createElementNS(SVG_NS, tag);
    for (const a in attrs) e.setAttribute(a, attrs[a]);
    if (txt !== undefined) e.textContent = txt;
    return e;
  };

  /* ---------- 6a. Valor, puntero y referencia ---------- */
  const ALIAS_CODIGO = [
    'int  x = 10, y = 99;',
    'int  c = x;',
    'int* p = &x;',
    'int& r = x;',
    '*p = 20;',
    'r  = 30;',
    'p  = &y;',
    'r  = y;',
    '*p = 5;'
  ];

  function pasosAlias() {
    const DIR = { x: '0x7ffd…a0', y: '0x7ffd…a4', c: '0x7ffd…a8', p: '0x7ffd…b0' };
    const TAM = { x: 4, y: 4, c: 4, p: 8 };
    const M = { celdas: {}, alias: null, apunta: null };
    const F = [];
    const add = (o) => F.push(Object.assign({
      celdas: JSON.parse(JSON.stringify(M.celdas)), alias: M.alias, apunta: M.apunta,
      cambio: [], code: -1, test: '', say: '',
      // Se cuentan objetos, no bytes: si una referencia ocupa memoria lo decide
      // el compilador (g++ -O0 le guarda una dirección oculta; -O1 no), y el
      // programa no tiene forma de observarlo.
      chips: [[`${Object.keys(M.celdas).length} objects`, ''],
              ...(M.alias ? [['sizeof(r) = 4', 'ci'], ['&r == &x', 'cok']] : [])]
    }, o));
    const pon = (k, v) => { M.celdas[k] = { v, dir: DIR[k], tam: TAM[k] }; };

    add({ test: 'main\'s frame, empty',
      say: `Each local variable takes a <b>stack cell</b>, with its own address and size. We will create three things that look very similar in code: a copy, a pointer and a reference.` });

    pon('x', 10); pon('y', 99);
    add({ code: 0, cambio: ['x', 'y'], test: `&x = ${DIR.x} · &y = ${DIR.y}`,
      say: `Two <code>int</code>s, 4 bytes each, in <code>main</code>'s frame. In this run they ended up next to each other; the order inside the frame is up to the compiler.` });

    pon('c', 10);
    add({ code: 1, cambio: ['c'], test: `c = x → 10 is copied`,
      say: `<code>c</code> receives a <b>copy</b> of 10 in a new cell. From now on <code>c</code> and <code>x</code> are independent: changing one does not touch the other.` });

    M.celdas.p = { v: DIR.x, dir: DIR.p, tam: 8 }; M.apunta = 'x';
    add({ code: 2, cambio: ['p'], test: `p = &x → p stores ${DIR.x}`,
      say: `<code>p</code> is a variable like any other, with <b>its own cell</b> at ${DIR.p}. What it stores is a number: the address of <code>x</code>. It takes 8 bytes because on a 64-bit machine every address is 8 bytes long.`,
      predice: `the next line is <code>int&amp; r = x;</code>. Does a new object appear in the row?` });

    M.alias = 'x';
    add({ code: 3, test: `&r == &x → ${DIR.x} == ${DIR.x}`,
      say: `<code>r</code> does not appear as a new object: its name <b>sticks to <code>x</code>'s cell</b>. <code>&amp;r</code> gives the address of <code>x</code> and <code>sizeof(r)</code> is 4, the size of <code>x</code>. Under the hood the compiler may store a hidden address (unoptimized g++ does), but the program can neither see nor change it.` });

    M.celdas.x.v = 20;
    add({ code: 4, cambio: ['x'], test: `*p → follows ${DIR.x} and writes 20`,
      say: `<code>*p</code> reads the address stored in <code>p</code>, goes to that cell and writes there. <code>x</code> changed; <code>c</code> is still 10 because it was a copy.` });

    M.celdas.x.v = 30;
    add({ code: 5, cambio: ['x'], test: `r = 30 → writes into x's cell`,
      say: `Writing to <code>r</code> is writing to <code>x</code>, directly. There is no address to follow: <code>r</code> and <code>x</code> name the same cell.` });

    M.celdas.p.v = DIR.y; M.apunta = 'y';
    add({ code: 6, cambio: ['p'], test: `p = &y → p stores ${DIR.y}`,
      say: `A pointer <b>can be re-pointed</b>: the number stored in its cell is overwritten and the arrow changes target. <code>x</code> never notices.`,
      predice: `the next line is <code>r = y;</code>. Which one changes: <code>r</code>, <code>x</code> or <code>y</code>?` });

    M.celdas.x.v = 99;
    add({ code: 7, cambio: ['x'], test: `r = y → copies 99 into x`,
      say: `This line <b>looks like it re-points</b> <code>r</code> to <code>y</code>, but it does something else: it copies the value of <code>y</code> into <code>x</code>. A reference stays bound forever to the variable it was created with.` });

    M.celdas.y.v = 5;
    add({ code: 8, cambio: ['y'], test: `*p → follows ${DIR.y} and writes 5`,
      say: `<code>p</code> already points to <code>y</code>, so the 5 lands in <code>y</code>. <code>x</code> keeps the 99 copied by the previous line.` });

    add({ code: -1, test: 'copy · pointer · reference',
      say: `<b>c</b>: its own object holding a copy of the value. <b>p</b>: its own object that stores an address; it can be re-pointed and can be <code>nullptr</code>. <b>r</b>: another name for <code>x</code>, bound for life. Under the hood a reference is usually implemented as an address that is followed automatically; what the language takes away is the ability to see it, re-point it or leave it empty.` });

    return F;
  }

  function construirAlias(cont) {
    const F = pasosAlias();
    const S = armarCascaron(cont, ALIAS_CODIGO, F.length);
    cont.innerHTML = '';

    const ORDEN = ['x', 'y', 'c', 'p'];
    const X = { x: 20, y: 222, c: 392, p: 582 };   // hueco tras x: ahí cabe la etiqueta del alias
    const ANCHO = { 4: 150, 8: 310 };
    const svg = svgEl('svg', { viewBox: '0 0 900 184', class: 'mm-svg mm-fila', preserveAspectRatio: 'xMinYMid meet' });
    const uid = 'mma' + (++simListaUid);
    svg.innerHTML = `<defs><marker id="${uid}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="mm-punta"/></marker></defs><g></g>`;
    const capa = svg.querySelector('g');
    cont.appendChild(svg);
    cont.appendChild(S.barra);
    const abajo = document.createElement('div');
    abajo.className = 'sim-abajo';
    abajo.appendChild(S.pre); abajo.appendChild(S.dice);
    cont.appendChild(abajo);
    cont.appendChild(S.huecos);

    const Y = 54, H = 66;
    function pintar(k) {
      const f = F[Math.max(0, Math.min(k, F.length - 1))];
      capa.innerHTML = '';
      // Flecha del puntero: por debajo de las celdas, del centro de p al centro del destino.
      if (f.apunta && f.celdas.p) {
        const sx = X.p + ANCHO[8] / 2, tx = X[f.apunta] + ANCHO[4] / 2;
        const d = `M ${sx} ${Y + H} C ${sx} ${Y + H + 56}, ${tx} ${Y + H + 56}, ${tx} ${Y + H + 3}`;
        capa.appendChild(svgEl('path', { d, class: 'mm-flecha' + (f.cambio.includes('p') ? ' nueva' : ''), 'marker-end': `url(#${uid})` }));
      }
      ORDEN.forEach(n => {
        const c = f.celdas[n];
        const w = ANCHO[n === 'p' ? 8 : 4];
        if (!c) {                                  // celda aún no reservada
          capa.appendChild(svgEl('rect', { x: X[n], y: Y, width: w, height: H, rx: 8, class: 'mm-hueco' }));
          return;
        }
        const g = svgEl('g', { class: 'mm-celda' + (f.cambio.includes(n) ? ' cambio' : '') + (n === 'p' ? ' ptr' : '') });
        g.appendChild(svgEl('rect', { x: X[n], y: Y, width: w, height: H, rx: 8 }));
        g.appendChild(svgEl('text', { x: X[n] + w / 2, y: Y + 35, class: 'mm-valor' + (n === 'p' ? ' dir' : '') }, c.v));
        g.appendChild(svgEl('text', { x: X[n] + w / 2, y: Y + 56, class: 'mm-dir' }, c.dir));
        g.appendChild(svgEl('text', { x: X[n] + w - 8, y: Y + 17, class: 'mm-tam' }, `${c.tam} B`));
        capa.appendChild(g);
        // Etiquetas de nombre encima: el alias se pega junto al nombre original.
        const nombres = [[n, n === 'p' ? 'int*' : 'int', '']];
        if (f.alias === n) nombres.push(['r', 'int&', 'alias']);
        let cx = X[n];
        nombres.forEach(([nom, tipo, cls]) => {
          const t = `${tipo} ${nom}`;
          const tw = 20 + t.length * 11;
          const tg = svgEl('g', { class: 'mm-nombre ' + cls });
          tg.appendChild(svgEl('rect', { x: cx, y: Y - 36, width: tw, height: 28, rx: 6 }));
          tg.appendChild(svgEl('text', { x: cx + tw / 2, y: Y - 16 }, t));
          capa.appendChild(tg);
          cx += tw + 6;
        });
      });
      S.pintarComun(f, k);
    }
    cont._simPintar = pintar;
    cont._simTotal = F.length;
    pintar(0);
  }

  /* ---------- 6b. El mapa de memoria de un proceso ---------- */
  const MAPA_CODIGO = [
    'int total = 0;',
    'int* create(int v) {',
    '  int* p = new int(v * 10);',
    '  return p; }',
    'int main() {',
    '  int n = 3;',
    '  int* a = create(n);',
    '  total += *a;',
    '  create(5);   // result ignored',
    '  delete a;',
    '  a = nullptr; }'
  ];

  function pasosMapa() {
    const F = [];
    const S = {
      pila: [], heap: [], total: 0, pc: null
    };
    const clon = () => JSON.parse(JSON.stringify(S));
    const vivos = () => S.heap.filter(b => b.est === '').length;
    const fugas = () => S.heap.filter(b => b.est === 'fuga').length;
    const add = o => F.push(Object.assign(clon(), {
      code: -1, test: '', say: '',
      chips: [[(n => `stack: ${n} ${n === 1 ? 'frame' : 'frames'}`)(S.pila.filter(fr => fr.est !== 'saliendo').length), 'ci'],
              [`heap: ${vivos()} live`, 'cok'],
              [`leaks: ${fugas()}`, fugas() ? 'cj' : '']]
    }, o));
    const frame = fn => S.pila.find(fr => fr.fn === fn && fr.est !== 'saliendo');
    const varDe = (fn, n) => frame(fn).vars.find(v => v.n === n);

    add({ test: 'before main',
      say: `Before <code>main</code> starts, the system has already loaded two regions: the <b>code</b> of the functions and the global <code>total</code>, which exists for the whole program. The stack and the heap are empty.` });

    S.pc = 'main';
    S.pila.push({ fn: 'main', est: '', vars: [
      { n: 'n', t: 'int',  v: '?', dir: '0x7ffc…5c' },
      { n: 'a', t: 'int*', v: '?', dir: '0x7ffc…50' }] });
    add({ code: 4, test: 'enter main: its frame is pushed',
      say: `On entering <code>main</code> its frame is pushed with room for <code>n</code> and <code>a</code>. They have no value yet: whatever is in those cells is leftover <b>garbage</b>.` });

    varDe('main', 'n').v = '3';
    add({ code: 5, test: 'n = 3',
      say: `<code>n</code> is 3. It is a local: it lives in <code>main</code>'s frame and disappears with it.` });

    S.pc = 'create';
    S.pila.push({ fn: 'create', est: '', vars: [
      { n: 'v', t: 'int',  v: '3', dir: '0x7ffc…2c' },
      { n: 'p', t: 'int*', v: '?', dir: '0x7ffc…20' }] });
    add({ code: 1, test: 'create(n) → v = 3, a copy',
      say: `The call pushes a new frame <b>below</b> <code>main</code>'s: the stack grows toward lower addresses (…2c is lower than …5c). <code>v</code> receives a copy of <code>n</code>.` });

    S.heap.push({ id: 'b1', v: '30', dir: '0x5621…eb0', est: '' });
    varDe('create', 'p').v = '0x5621…eb0'; varDe('create', 'p').apunta = 'b1';
    add({ code: 2, test: 'new int(30) → 0x5621…eb0',
      say: `<code>new</code> allocates an <code>int</code> on the heap and returns its address, which is stored in <code>p</code>. The 30 lives on the <b>heap</b>; <code>p</code>, which only knows where it is, lives on the <b>stack</b>.`,
      predice: `when <code>create</code> returns, what happens to <code>p</code>? And to the 30?` });

    S.pila[1].est = 'saliendo';
    varDe('main', 'a').v = '0x5621…eb0'; varDe('main', 'a').apunta = 'b1';
    S.pc = 'main';
    add({ code: 3, test: 'return p → a = 0x5621…eb0',
      say: `On return, <code>create</code>'s frame is destroyed entirely, <code>p</code> included. The heap block <b>survives</b> because its lifetime does not depend on any frame, and <code>a</code> received a copy of its address.` });
    S.pila.pop();

    S.total = 30;
    add({ code: 7, test: 'total += *a → total = 30',
      say: `<code>*a</code> follows the address to the heap and reads the 30, which is added to <code>total</code> in the data region: one line, <b>three regions</b>.`,
      predice: `the next line calls <code>create(5)</code> and does not store the result. What is left on the heap?` });

    S.pc = 'create';
    S.pila.push({ fn: 'create', est: '', vars: [
      { n: 'v', t: 'int',  v: '5',          dir: '0x7ffc…2c' },
      { n: 'p', t: 'int*', v: '0x5621…ed0', dir: '0x7ffc…20', apunta: 'b2' }] });
    S.heap.push({ id: 'b2', v: '50', dir: '0x5621…ed0', est: '' });
    add({ code: 2, test: 'create(5) → new int(50) → 0x5621…ed0',
      say: `Second call: <code>create</code>'s frame reappears at the <b>same addresses</b> as before, and the heap hands out another block. Only <code>p</code> knows where the 50 is.` });

    S.pila[1].est = 'saliendo';
    S.heap[1].est = 'fuga';
    S.pc = 'main';
    add({ code: 8, test: 'the return value is not stored',
      say: `Nobody stores what <code>create(5)</code> returns, and <code>p</code>, the only copy of the address, left with its frame: the block is <b>left with nothing pointing to it</b>. That is a leak.`,
      predice: `next comes <code>delete a;</code>. Does what <code>a</code> stores change?` });
    S.pila.pop();

    S.heap[0].est = 'liberado';
    add({ code: 9, test: 'delete a → the block goes back to the heap',
      say: `<code>delete</code> returns the block. <code>a</code> <b>does not change</b>: it still stores 0x5621…eb0, an address that is no longer yours. Reading <code>*a</code> here is <i>use-after-free</i>.` });

    varDe('main', 'a').v = 'nullptr'; delete varDe('main', 'a').apunta;
    add({ code: 10, test: 'a = nullptr',
      say: `Setting <code>a</code> to <code>nullptr</code> frees nothing. It leaves <code>a</code> in a state you can test with <code>if (a)</code>, and a second <code>delete a</code> does no harm: deleting <code>nullptr</code> does nothing.` });

    S.pila = []; S.pc = null;
    add({ code: -1, test: 'main returns: the stack is empty',
      say: `<code>main</code> is popped. <code>total</code> and the leaked block stay there until the process ends; then the operating system reclaims all its memory. That is why a leak is barely noticeable in a task that runs for a second, but very noticeable in a server that runs for weeks.` });

    return F;
  }

  function construirMapa(cont) {
    const F = pasosMapa();
    const S = armarCascaron(cont, MAPA_CODIGO, F.length);
    cont.innerHTML = '';
    cont.classList.add('mm-mapa');

    const svg = svgEl('svg', { viewBox: '0 0 560 474', class: 'mm-svg', preserveAspectRatio: 'xMinYMin meet' });
    const uid = 'mmm' + (++simListaUid);
    svg.innerHTML =
      `<defs>
         <marker id="${uid}-a" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="mm-punta"/></marker>
         <marker id="${uid}-c" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="mm-punta colgante"/></marker>
       </defs><g></g>`;
    const capa = svg.querySelector('g');

    const izq = document.createElement('div');
    izq.className = 'mm-izq';
    izq.appendChild(svg);
    const der = document.createElement('div');
    der.className = 'mm-der';
    der.appendChild(S.pre);
    der.appendChild(S.dice);
    const cuerpo = document.createElement('div');
    cuerpo.className = 'mm-cuerpo';
    cuerpo.appendChild(izq); cuerpo.appendChild(der);
    cont.appendChild(cuerpo);
    cont.appendChild(S.barra);
    cont.appendChild(S.huecos);

    // Regiones, de direcciones altas (arriba) a bajas (abajo).
    const BX = 34, BW = 470;                    // caja de región; a la derecha queda el carril de flechas
    const REG = {
      stack: { y: 0,   h: 214, titulo: 'Stack', nota: 'grows downward ↓' },
      heap:  { y: 250, h: 104, titulo: 'Heap',  nota: 'grows upward ↑' },
      datos: { y: 362, h: 46,  titulo: 'Data', nota: 'globals and static (.data, .bss)' },
      cod:   { y: 416, h: 56,  titulo: 'Code', nota: '.text, read-only' }
    };
    const FILA = 28, CAB = 22;

    function pintar(k) {
      const f = F[Math.max(0, Math.min(k, F.length - 1))];
      capa.innerHTML = '';

      // Eje de direcciones.
      capa.appendChild(svgEl('line', { x1: 12, y1: 8, x2: 12, y2: 466, class: 'mm-eje' }));
      capa.appendChild(svgEl('text', { x: 18, y: 10, class: 'mm-eje-txt', transform: 'rotate(90 18 10)' }, 'high → low addresses'));

      for (const r in REG) {
        const R = REG[r];
        capa.appendChild(svgEl('rect', { x: BX, y: R.y, width: BW, height: R.h, rx: 8, class: 'mm-region ' + r }));
        capa.appendChild(svgEl('text', { x: BX + 10, y: R.y + 17, class: 'mm-reg-titulo' }, R.titulo));
        capa.appendChild(svgEl('text', { x: BX + BW - 10, y: R.y + 17, class: 'mm-reg-nota' }, R.nota));
      }
      capa.appendChild(svgEl('text', { x: BX + 120, y: 234, class: 'mm-libre' }, '· · · free space · · ·'));

      const posVar = {};                          // "fn.n" → coordenadas de su celda de valor
      // Frames del stack, apilados hacia abajo.
      let fy = REG.stack.y + 26;
      f.pila.forEach(fr => {
        const alto = CAB + fr.vars.length * FILA + 4;
        const g = svgEl('g', { class: 'mm-frame' + (fr.est ? ' ' + fr.est : '') });
        g.appendChild(svgEl('rect', { x: BX + 10, y: fy, width: BW - 20, height: alto, rx: 6 }));
        g.appendChild(svgEl('text', { x: BX + 20, y: fy + 16, class: 'mm-fn' }, `${fr.fn}()` + (fr.est === 'saliendo' ? '  — destroyed on return' : '')));
        fr.vars.forEach((v, i) => {
          const y = fy + CAB + i * FILA;
          g.appendChild(svgEl('text', { x: BX + 22, y: y + 19, class: 'mm-var' }, `${v.t} ${v.n}`));
          const basura = v.v === '?';
          g.appendChild(svgEl('text', { x: BX + 140, y: y + 19, class: 'mm-dir-txt izq' }, v.dir));
          g.appendChild(svgEl('rect', { x: BX + 270, y: y + 2, width: 170, height: FILA - 4, rx: 4, class: 'mm-val' + (basura ? ' basura' : '') }));
          g.appendChild(svgEl('text', { x: BX + 355, y: y + 19, class: 'mm-val-txt' + (basura ? ' basura' : '') }, basura ? 'garbage' : v.v));
          posVar[`${fr.fn}.${v.n}.${fr.est}`] = { x: BX + 440, y: y + FILA / 2, v, est: fr.est };
        });
        capa.appendChild(g);
        fy += alto + 6;
      });

      // Bloques del heap, de izquierda a derecha.
      const posBloque = {};
      f.heap.forEach((b, i) => {
        const x = BX + 20 + i * 170, y = REG.heap.y + 30;
        const g = svgEl('g', { class: 'mm-bloque' + (b.est ? ' ' + b.est : '') });
        g.appendChild(svgEl('rect', { x, y, width: 150, height: 60, rx: 6 }));
        g.appendChild(svgEl('text', { x: x + 75, y: y + 28, class: 'mm-b-val' }, b.v));
        g.appendChild(svgEl('text', { x: x + 75, y: y + 50, class: 'mm-b-dir' }, b.dir));
        if (b.est) g.appendChild(svgEl('text', { x: x + 112, y: y - 6, class: 'mm-b-etq' }, b.est === 'fuga' ? 'leak' : 'freed'));
        capa.appendChild(g);
        posBloque[b.id] = { x: x + 36, y, est: b.est };   // la flecha entra por la izquierda; la etiqueta va a la derecha
      });

      // Punteros stack → heap por el carril derecho, cada uno en su propio carril.
      let carril = 0;
      Object.values(posVar).forEach(pv => {
        if (!pv.v.apunta || !posBloque[pv.v.apunta]) return;
        const B = posBloque[pv.v.apunta];
        const colg = B.est === 'liberado';
        const lx = BX + BW + 14 + carril * 14;
        const hy = REG.heap.y - 6 - carril * 8;       // dentro del espacio libre
        const d = `M ${pv.x} ${pv.y} H ${lx} V ${hy} H ${B.x} V ${B.y - 2}`;
        capa.appendChild(svgEl('path', { d, class: 'mm-flecha' + (colg ? ' colgante' : '') + (pv.est === 'saliendo' ? ' saliendo' : ''),
          'marker-end': `url(#${uid}-${colg ? 'c' : 'a'})` }));
        carril++;
      });

      // Región de datos: la global.
      const dy = REG.datos.y + 22;
      capa.appendChild(svgEl('text', { x: BX + 22, y: dy + 16, class: 'mm-var' }, 'int total'));
      capa.appendChild(svgEl('text', { x: BX + 140, y: dy + 16, class: 'mm-dir-txt izq' }, '0x5621…010'));
      capa.appendChild(svgEl('rect', { x: BX + 270, y: dy, width: 170, height: 22, rx: 4, class: 'mm-val' + (k > 0 && F[k - 1].total !== f.total ? ' cambio' : '') }));
      capa.appendChild(svgEl('text', { x: BX + 355, y: dy + 16, class: 'mm-val-txt' }, String(f.total)));

      // Región de código: las dos funciones y cuál se está ejecutando.
      [['main()', '0x5621…1a9'], ['create()', '0x5621…189']].forEach(([fn, dir], i) => {
        const x = BX + 20 + i * 220, y = REG.cod.y + 24;
        const activo = f.pc && fn.startsWith(f.pc);
        const g = svgEl('g', { class: 'mm-fcod' + (activo ? ' activo' : '') });
        g.appendChild(svgEl('rect', { x, y, width: 200, height: 26, rx: 5 }));
        g.appendChild(svgEl('text', { x: x + 12, y: y + 18, class: 'mm-fcod-n' }, (activo ? '▶ ' : '') + fn));
        g.appendChild(svgEl('text', { x: x + 190, y: y + 18, class: 'mm-dir-txt' }, dir));
        capa.appendChild(g);
      });

      S.pintarComun(f, k);
    }
    cont._simPintar = pintar;
    cont._simTotal = F.length;
    pintar(0);
  }

  /* ---------- 6c. pushFront: puntero por valor contra Nodo*& ----------
     Corre las dos versiones sobre la MISMA memoria, una tras otra: la
     del checkpoint (por valor) deja una fuga y no cambia la lista; la
     corregida (por referencia) escribe en la celda head de main. La
     referencia se dibuja como lo que es por dentro: la dirección de
     esa celda. Así se ve por qué Node*& y Node** son la misma idea. */
  const PUSH_CODIGO = [
    'void pushFront(Node*  head, int v) {',
    '    head = new Node{v, head}; }',
    'void pushFront(Node*& head, int v) {',
    '    head = new Node{v, head}; }',
    'Node* head = new Node{20, nullptr};',
    'pushFront(head, 10);'
  ];

  function pasosPush() {
    const F = [];
    const S = { main: null, fr: null, nodos: {} };   // fr: frame de pushFront
    const lista = () => { const o = []; let id = S.main, g = 0; while (id && g++ < 9) { o.push(S.nodos[id].dato); id = S.nodos[id].next; } return o.join(' → ') || 'empty'; };
    const add = (version, o) => F.push(Object.assign({
      main: S.main, fr: S.fr ? JSON.parse(JSON.stringify(S.fr)) : null,
      nodos: JSON.parse(JSON.stringify(S.nodos)),
      code: -1, test: '', say: '', cambio: [],
      chips: [version ? [version === 'A' ? 'A · by value' : 'B · by reference', version === 'A' ? 'cj' : 'cok'] : null,
              ['main sees: ' + lista(), 'ci']].filter(Boolean)
    }, o));

    S.nodos.n20 = { dato: 20, next: null, col: 2, fila: 0, est: '' };
    S.main = 'n20';
    add(null, { code: 4, cambio: ['main'], test: 'one-node list',
      say: `<code>main</code> has a one-node list: its variable <code>head</code>, on the stack, stores the address of the 20, on the heap. We want to insert 10 at the front.` });

    // ---- Versión A: por valor ----
    S.fr = { modo: 'valor', head: 'n20', v: 10 };
    add('A', { code: 0, cambio: ['fr'], test: 'pushFront(head, 10) → head is copied',
      say: `The parameter <code>Node* head</code> receives a <b>copy</b> of the value: the same address, in a different cell. Now there are two pointers to the 20, <code>main</code>'s and the function's.` });

    S.nodos.n10a = { dato: 10, next: 'n20', col: 1, fila: 1, est: 'nuevo' };
    add('A', { code: 1, cambio: ['n10a'], test: 'new Node{10, head} → its next points to 20',
      say: `10 is created on the heap with its <code>next</code> pointing to 20. So far so good.` });

    S.fr.head = 'n10a';
    add('A', { code: 1, cambio: ['fr'], test: 'head = (the new node) → changes the COPY',
      say: `The assignment writes to the parameter's cell, which is the copy. <code>main</code>'s <code>head</code> <b>still points to 20</b>.`,
      predice: `the function ends. What happens to the 10?` });

    S.fr = null; S.nodos.n10a.est = 'fuga';
    add('A', { code: -1, test: 'returns: the frame disappears',
      say: `On return the copy is destroyed, and with it the only address of the 10: it is <b>leaked</b>. From <code>main</code> the list is still just the 20. That is why the correct answer is <b>C</b>.` });

    // ---- Versión B: por referencia ----
    S.fr = { modo: 'ref', v: 10 };
    add('B', { code: 2, cambio: ['fr'], test: 'pushFront(head, 10) → head is main\'s cell',
      say: `With <code>Node*&amp;</code> the parameter gives access to <b><code>main</code>'s <code>head</code> cell</b>. Under the hood, the address of that cell travels (0x7ffc…58): the same idea as <code>Node**</code> in C, without writing asterisks.` });

    S.nodos.n10b = { dato: 10, next: 'n20', col: 1, fila: 0, est: 'nuevo' };
    add('B', { code: 3, cambio: ['n10b'], test: 'new Node{10, head} → reads main\'s head',
      say: `Reading <code>head</code> inside the function reads <code>main</code>'s cell, so the new 10 is born pointing to the 20.` });

    S.main = 'n10b';
    add('B', { code: 3, cambio: ['main'], test: 'head = (the new node) → changes MAIN\'s head',
      say: `Now the assignment writes <b>directly into <code>main</code>'s cell</b>. There is no copy to lose.` });

    S.fr = null; S.nodos.n10b.est = '';
    add('B', { code: -1, test: 'returns: the change survives',
      say: `The frame disappears and the change stays: <code>main</code> sees <b>10 → 20</b>. The red 10 is the leak left by version A: an earlier call that did nothing useful and also lost memory.` });

    return F;
  }

  function construirPush(cont) {
    const F = pasosPush();
    const S = armarCascaron(cont, PUSH_CODIGO, F.length);
    cont.innerHTML = '';

    const svg = svgEl('svg', { viewBox: '0 0 1100 226', class: 'mm-svg mm-push', preserveAspectRatio: 'xMinYMid meet' });
    const uid = 'mmp' + (++simListaUid);
    svg.innerHTML =
      `<defs>
         <marker id="${uid}-a" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="mm-punta"/></marker>
         <marker id="${uid}-n" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="mm-punta nueva"/></marker>
         <marker id="${uid}-k" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto"><path d="M0,0 L13,6 L0,12 z" class="mm-punta tinta"/></marker>
       </defs><g></g>`;
    const capa = svg.querySelector('g');
    cont.appendChild(svg);
    cont.appendChild(S.barra);
    const abajo = document.createElement('div');
    abajo.className = 'sim-abajo';
    abajo.appendChild(S.pre); abajo.appendChild(S.dice);
    cont.appendChild(abajo);
    cont.appendChild(S.huecos);

    // Stack a la izquierda, heap a la derecha.
    const ST = { x: 0, w: 470 }, HP = { x: 505, w: 595 };
    const NW = 150, NH = 54;
    const nodoXY = n => ({ x: HP.x + 30 + n.col * 190, y: n.fila === 0 ? 50 : 150 });

    function pintar(k) {
      const f = F[Math.max(0, Math.min(k, F.length - 1))];
      capa.innerHTML = '';
      capa.appendChild(svgEl('rect', { x: ST.x, y: 0, width: ST.w, height: 226, rx: 8, class: 'mm-region stack' }));
      capa.appendChild(svgEl('text', { x: ST.x + 12, y: 20, class: 'mm-reg-titulo' }, 'Stack'));
      capa.appendChild(svgEl('rect', { x: HP.x, y: 0, width: HP.w, height: 226, rx: 8, class: 'mm-region heap' }));
      capa.appendChild(svgEl('text', { x: HP.x + 12, y: 20, class: 'mm-reg-titulo' }, 'Heap'));

      const flechas = [];
      // Frame de main.
      const fila = (g, y, tipo, nombre, dir, valor, cambio) => {
        g.appendChild(svgEl('text', { x: 26, y: y + 19, class: 'mm-var' }, `${tipo} ${nombre}`));
        g.appendChild(svgEl('text', { x: 186, y: y + 19, class: 'mm-dir-txt izq' }, dir));
        g.appendChild(svgEl('rect', { x: 286, y: y + 2, width: 166, height: 24, rx: 4, class: 'mm-val' + (cambio ? ' cambio' : '') }));
        g.appendChild(svgEl('text', { x: 369, y: y + 19, class: 'mm-val-txt' }, valor));
      };
      const dirDe = id => ({ n20: '0x5621…eb0', n10a: '0x5621…ed0', n10b: '0x5621…ef0' })[id];
      let g = svgEl('g', { class: 'mm-frame' });
      g.appendChild(svgEl('rect', { x: 12, y: 32, width: 446, height: 56, rx: 6 }));
      g.appendChild(svgEl('text', { x: 22, y: 48, class: 'mm-fn' }, 'main()'));
      fila(g, 54, 'Node*', 'head', '0x7ffc…58', dirDe(f.main), f.cambio.includes('main'));
      capa.appendChild(g);
      const celdaMain = { x: 286, y: 68, w: 166 };
      flechas.push({ desde: [452, 68], a: f.main, cls: f.cambio.includes('main') ? 'nueva' : '' });

      if (f.fr) {
        const ref = f.fr.modo === 'ref';
        g = svgEl('g', { class: 'mm-frame' + (f.cambio.includes('fr') ? ' entra' : '') });
        g.appendChild(svgEl('rect', { x: 12, y: 104, width: 446, height: 86, rx: 6 }));
        g.appendChild(svgEl('text', { x: 22, y: 120, class: 'mm-fn' }, 'pushFront()'));
        if (ref) {
          // &head dentro de la función ES la dirección de la celda de main (g++ lo confirma).
          fila(g, 126, 'Node*&', 'head', '0x7ffc…58', '→ main\'s head', false);
        } else {
          fila(g, 126, 'Node*', 'head', '0x7ffc…18', dirDe(f.fr.head), f.cambio.includes('fr'));
          flechas.push({ desde: [452, 140], a: f.fr.head, cls: 'copia' });
        }
        fila(g, 156, 'int', 'v', '0x7ffc…14', String(f.fr.v), false);
        capa.appendChild(g);
        if (ref) {
          // La referencia: una flecha a la CELDA de main, no al heap.
          capa.appendChild(svgEl('path', {
            d: `M 286 140 C 240 140, 240 ${celdaMain.y + 4}, ${celdaMain.x - 2} ${celdaMain.y + 4}`,
            class: 'mm-flecha ref', 'marker-end': `url(#${uid}-a)` }));
        }
      }

      // Nodos del heap.
      for (const id in f.nodos) {
        const n = f.nodos[id], p = nodoXY(n);
        const gn = svgEl('g', { class: 'sl-nodo' + (n.est ? ' ' + n.est : '') });
        gn.appendChild(svgEl('rect', { x: p.x, y: p.y, width: NW, height: NH, rx: 8, class: 'caja' }));
        gn.appendChild(svgEl('line', { x1: p.x + 100, y1: p.y, x2: p.x + 100, y2: p.y + NH, class: 'div' }));
        gn.appendChild(svgEl('text', { x: p.x + 50, y: p.y + NH / 2 + 9, class: 'dato' }, n.dato));
        gn.appendChild(svgEl('circle', { cx: p.x + 125, cy: p.y + NH / 2, r: 4.5, class: 'raiz' }));
        gn.appendChild(svgEl('text', { x: p.x + NW / 2, y: p.y + NH + 17, class: 'mm-b-dir' }, dirDe(id)));
        if (n.est === 'fuga') gn.appendChild(svgEl('text', { x: p.x + NW + 10, y: p.y + NH / 2 + 5, class: 'sl-etq izq' }, 'leak'));
        capa.appendChild(gn);
        if (n.next === null) {
          capa.appendChild(svgEl('line', { x1: p.x + 108, y1: p.y + NH - 8, x2: p.x + NW - 8, y2: p.y + 8, class: 'sl-nulo' }));
        } else {
          const t = nodoXY(f.nodos[n.next]);
          const tx = t.x - 2, ty = t.y + NH / 2 + (n.fila === f.nodos[n.next].fila ? 0 : (n.fila > f.nodos[n.next].fila ? 12 : -12));
          capa.appendChild(svgEl('line', { x1: p.x + 125, y1: p.y + NH / 2, x2: tx, y2: ty,
            class: 'sl-flecha' + (f.cambio.includes(id) ? ' nueva' : ''), 'marker-end': `url(#${uid}-${f.cambio.includes(id) ? 'n' : 'k'})` }));
        }
      }

      // Punteros del stack al heap.
      flechas.forEach(fl => {
        if (!fl.a || !f.nodos[fl.a]) return;
        const t = nodoXY(f.nodos[fl.a]);
        const [sx, sy] = fl.desde;
        const tx = t.x - 2, ty = t.y + NH / 2 - (fl.cls === 'copia' ? -8 : 8);
        // Hacia el nodo del fondo, la flecha de main pasa por arriba para no cruzar al nodo del frente.
        const arriba = fl.cls !== 'copia' && f.nodos[fl.a].col === 2;
        const d = arriba
          ? `M ${sx} ${sy} C ${sx + 140} 6, ${tx - 140} 6, ${tx} ${ty}`
          : `M ${sx} ${sy} C ${sx + 60} ${sy}, ${tx - 60} ${ty}, ${tx} ${ty}`;
        capa.appendChild(svgEl('path', { d, class: 'mm-flecha ' + fl.cls, 'marker-end': `url(#${uid}-${fl.cls === 'nueva' ? 'n' : 'a'})` }));
      });

      S.pintarComun(f, k);
    }
    cont._simPintar = pintar;
    cont._simTotal = F.length;
    pintar(0);
  }

  function construirSim(cont) {
    if (cont.dataset.alg === 'mem-push') return construirPush(cont);
    if (cont.dataset.alg === 'mem-alias') return construirAlias(cont);
    if (cont.dataset.alg === 'mem-mapa') return construirMapa(cont);
    if ((cont.dataset.alg || '').startsWith('lista-')) return construirLista(cont);
    const alg = ['lomuto', 'hoare', 'quickselect', 'seleccion'].includes(cont.dataset.alg)
      ? cont.dataset.alg : 'hoare';
    const arreglo = (cont.dataset.array || '7,8,5,2,1,6')
      .split(',').map(s => Number(s.trim())).filter(v => Number.isFinite(v));
    const run = alg === 'lomuto' ? pasosLomuto(arreglo)
              : alg === 'quickselect' ? pasosQuickselect(arreglo, Number(cont.dataset.k || 0))
              : alg === 'seleccion' ? pasosSeleccion(arreglo)
              : pasosHoare(arreglo);
    const n = run.n;
    // En quickselect los índices no salen del arreglo, así que no hacen falta
    // las casillas fantasma de los extremos.
    const seleccion = run.modo === 'seleccion';
    const cols = seleccion ? n : n + 2;

    cont.innerHTML = '';
    cont.style.setProperty('--sim-cols', cols);

    const cinta = document.createElement('div');
    cinta.className = 'sim-cinta';
    const celdas = [], columnas = [];
    for (let c = 0; c < cols; c++) {
      const idx = seleccion ? c : c - 1;       // −1 … n, o 0 … n−1
      const fantasma = idx < 0 || idx >= n;
      const col = document.createElement('div');
      col.className = 'sim-col' + (fantasma ? ' ghost' : '');
      const punteros =
        alg === 'quickselect' ? '<span class="pk">k</span><span class="pp">p</span>'
      : alg === 'seleccion'   ? '<span class="pi">i</span><span class="pp">m</span><span class="pj">j</span>'
      :                         '<span class="pi">i</span><span class="pj">j</span>';
      col.innerHTML =
        `<div class="sim-ptr">${punteros}</div>` +
        '<div class="sim-celda"></div>' +
        `<div class="sim-idx">${idx < 0 ? '−1' : idx}</div>`;
      cinta.appendChild(col);
      columnas[idx] = col;
      celdas[idx] = col.querySelector('.sim-celda');
    }
    cont.appendChild(cinta);

    const zonas = document.createElement('div');
    zonas.className = 'sim-zonas';
    cont.appendChild(zonas);

    const barra = document.createElement('div');
    barra.className = 'sim-barra';
    barra.innerHTML =
      '<span class="sim-chip cp"></span><span class="sim-chip ci"></span><span class="sim-chip cj"></span>' +
      '<span class="sim-test"></span>' +
      '<span class="sim-ctrl">' +
        '<button type="button" data-ir="-1" aria-label="Previous step">◀</button>' +
        '<span class="sim-cont"></span>' +
        '<button type="button" data-ir="1" aria-label="Next step">▶</button>' +
      '</span>';
    cont.appendChild(barra);

    // Parte baja: el código a la izquierda, la explicación del paso a la
    // derecha. Van juntos porque se leen juntos — la línea que corre y lo
    // que esa línea acaba de hacer.
    const abajo = document.createElement('div');
    abajo.className = 'sim-abajo';

    // En los dos simuladores de partición el panel es el código, con la línea
    // que corre resaltada. En quickselect es la cuenta del trabajo por ronda:
    // el código completo ya vive en el slide siguiente, y lo que aquí hace
    // falta ver es cuánto arreglo se descarta.
    const lineasPanel = seleccion ? run.filas : SIM_CODIGO[alg];
    const pre = document.createElement('pre');
    pre.className = 'sim-codigo' + (seleccion ? ' sim-trabajo' : '');
    pre.innerHTML = lineasPanel
      .map(l => `<div class="sim-linea">${seleccion ? pintarTexto(l) : pintarCodigo(l)}</div>`)
      .join('');
    abajo.appendChild(pre);

    const dice = document.createElement('p');
    dice.className = 'sim-dice';
    abajo.appendChild(dice);

    cont.appendChild(abajo);
    const lineas = [...pre.querySelectorAll('.sim-linea')];

    // Un fragment vacío por paso, después del primero: el paso 0
    // es el estado inicial y ya se ve al entrar al slide.
    const huecos = document.createElement('span');
    huecos.className = 'sim-fragments';
    for (let k = 1; k < run.frames.length; k++) {
      const f = document.createElement('span');
      f.className = 'fragment';
      f.setAttribute('aria-hidden', 'true');
      huecos.appendChild(f);
    }
    cont.appendChild(huecos);

    const $ = sel => barra.querySelector(sel);
    // Se capturan una sola vez: cada paso les reescribe la clase, así que
    // buscarlas por clase en cada repintado dejaría de encontrarlas.
    const chips = [...barra.querySelectorAll('.sim-chip')];

    function pintar(k) {
      const f = run.frames[Math.max(0, Math.min(k, run.frames.length - 1))];

      for (let idx = -1; idx <= n; idx++) {
        const col = columnas[idx];
        if (!col) continue;
        col.className = 'sim-col' + (idx < 0 || idx >= n ? ' ghost' : '');
        if (idx >= 0 && idx < n) celdas[idx].textContent = f.arr[idx];
        // Fuera del rango vivo: descartado, ya no se vuelve a tocar.
        if (f.activo && idx >= 0 && idx < n && (idx < f.activo[0] || idx > f.activo[1])) {
          col.classList.add('mk-desc');
        }
        // Prefijo ya ordenado y definitivo (selection sort).
        if (f.ordenado && idx >= 0 && idx < f.ordenado) col.classList.add('mk-ord');
      }
      f.mark.forEach(([idx, tipo]) => {
        const col = columnas[idx];
        if (!col) return;
        col.classList.add({ i: 'mk-i', j: 'mk-j', sw: 'mk-sw', p: 'mk-p' }[tipo] || 'mk-f');
      });
      if (f.i != null && columnas[f.i]) columnas[f.i].classList.add('has-i');
      if (f.j != null && columnas[f.j]) columnas[f.j].classList.add('has-j');
      if (f.kIdx != null && columnas[f.kIdx]) columnas[f.kIdx].classList.add('has-k');
      if (f.p != null && columnas[f.p]) columnas[f.p].classList.add('has-p');
      if (f.m != null && columnas[f.m]) columnas[f.m].classList.add('has-p');

      zonas.innerHTML = '';
      if (f.zonas) {
        const z = f.zonas;
        const off = seleccion ? 1 : 2;        // +2 cuando hay casilla fantasma
        const tramo = (desde, hasta, texto, clase) => {
          if (hasta < desde) return;
          const d = document.createElement('div');
          d.className = 'sim-zona on' + (clase ? ' ' + clase : '');
          d.style.gridColumn = `${desde + off} / ${hasta + off + 1}`;
          d.textContent = texto;
          zonas.appendChild(d);
        };
        const desde = z.desde === undefined ? 0 : z.desde;
        const hasta = z.hasta === undefined ? n - 1 : z.hasta;
        if (z.crudo) {
          tramo(desde, z.corte, z.izq, 'ord');
          tramo(z.corte + 1, hasta, z.der, 'pend');
        } else if (z.pivote === undefined) {
          tramo(desde, z.corte, `a[lo..j] ${z.izq}`);
          tramo(z.corte + 1, hasta, `a[j+1..hi] ${z.der}`);
        } else {
          tramo(desde, z.corte, z.izq);
          tramo(z.pivote, z.pivote, 'p', 'piv');
          tramo(z.pivote + 1, hasta, z.der);
        }
      }

      if (f.chips && f.chips.length) {
        // Modo selección: el contenido y el color de cada chip los decide el paso.
        chips.forEach((el, idx) => {
          const c = f.chips[idx];
          el.hidden = !c;
          if (!c) return;
          el.textContent = c[0];
          el.className = 'sim-chip ' + (c[1] || '');
        });
      } else {
        const fijas = [['cp', `p = ${f.p}`],
                       ['ci', f.i == null ? 'i = —' : `i = ${f.i}`],
                       ['cj', f.j == null ? 'j = —' : `j = ${f.j}`]];
        chips.forEach((el, idx) => {
          el.hidden = false;
          el.className = 'sim-chip ' + fijas[idx][0];
          el.textContent = fijas[idx][1];
        });
      }
      $('.sim-test').textContent = f.test;
      $('.sim-cont').textContent = `${k + 1} / ${run.frames.length}`;
      dice.innerHTML = f.say;
      lineas.forEach((l, idx) => {
        l.classList.toggle('on', idx === f.code);
        // El panel de trabajo se va llenando ronda por ronda.
        if (!seleccion) return;
        const tope = f.verHasta != null ? f.verHasta : f.code;
        l.classList.toggle('oculta', tope < 0 || idx > tope);
      });
    }

    barra.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        const d = Number(b.dataset.ir);
        if (typeof Reveal === 'undefined') return;
        if (d > 0) Reveal.nextFragment(); else Reveal.prevFragment();
      });
    });

    cont._simPintar = pintar;
    cont._simTotal = run.frames.length;
    pintar(0);
  }

  /* Sincroniza cada simulador visible con los fragments mostrados. */
  function syncSims() {
    const slide = Reveal.getCurrentSlide();
    if (!slide) return;
    slide.querySelectorAll('.sim-particion').forEach(cont => {
      if (!cont._simPintar) return;
      const vistos = cont.querySelectorAll('.sim-fragments .fragment.visible').length;
      cont._simPintar(vistos);
      const btns = cont.querySelectorAll('.sim-ctrl button');
      if (btns[0]) btns[0].disabled = vistos === 0;
      if (btns[1]) btns[1].disabled = vistos >= cont._simTotal - 1;
    });
  }

  function initParticion() {
    const sims = document.querySelectorAll('.sim-particion');
    if (!sims.length) return;
    sims.forEach(construirSim);
    if (typeof Reveal !== 'undefined' && Reveal.sync) Reveal.sync();
    ['fragmentshown', 'fragmenthidden', 'slidechanged', 'ready']
      .forEach(ev => Reveal.on(ev, () => setTimeout(syncSims, 0)));
    syncSims();
  }

  /* ----------------------------------------------------------
     7. MODO OSCURO
     data-theme="dark" en <html>. Arranca en claro; la elección
     (botón abajo a la izquierda o tecla D) se guarda en
     localStorage y vale para todos los decks del sitio.
     Cada deck trae en <head> un script de una línea que aplica
     el tema antes de pintar; esto es el respaldo si falta.
     La impresión / PDF (?print-pdf) siempre sale en claro.
     ---------------------------------------------------------- */
  const THEME_KEY = 'shstyle-theme';
  const esImpresion = () => /print-pdf/i.test(window.location.search);

  function leerTema() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }

  function aplicarTema(tema) {
    const root = document.documentElement;
    if (tema === 'dark' && !esImpresion()) root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
      const oscuro = root.dataset.theme === 'dark';
      btn.setAttribute('aria-pressed', String(oscuro));
      btn.title = oscuro ? 'Light mode (D)' : 'Dark mode (D)';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  function alternarTema() {
    const nuevo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, nuevo); } catch (e) { /* sin almacenamiento: solo esta página */ }
    aplicarTema(nuevo);
  }

  function initTema() {
    if (esImpresion()) { aplicarTema('light'); return; }
    if (!document.querySelector('.theme-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-toggle';
      btn.innerHTML =
        '<svg class="ic-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>' +
        '<svg class="ic-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/>' +
        '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
      btn.addEventListener('click', e => { e.stopPropagation(); alternarTema(); btn.blur(); });
      document.body.appendChild(btn);
    }
    if (typeof Reveal !== 'undefined' && Reveal.addKeyBinding) {
      Reveal.addKeyBinding({ keyCode: 68, key: 'D', description: 'Dark / light mode' }, alternarTema);
    }
    aplicarTema(leerTema());
  }

  aplicarTema(leerTema());   // al cargar el script, antes de init()

  /* ---------------------------------------------------------- */
  function init(glosario = {}) {
    GLOSARIO = glosario;
    initTema();
    initMath();
    initGlossary();
    initQuizzes();
    initSoluciones();
    initChecklists();
    initScorePanel();
    initSvgAnim();
    initParticion();
  }

  return { init };
})();
