'use strict';

/* =====================================================================
 * Generador de Secretos
 * - Aleatoriedad criptográfica (crypto.getRandomValues, sin sesgo de módulo)
 * - Contraseña, frase, token, UUID y PIN
 * - Fortaleza calculada por entropía real
 * - Bóveda en localStorage (texto plano, solo en este navegador)
 * ===================================================================== */

/* ---------- Aleatoriedad segura ---------- */

/** Entero uniforme en [0, max) mediante muestreo con rechazo (sin sesgo). */
function randInt(max) {
    if (!Number.isInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError('max inválido');
    const limite = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limite);
    return buf[0] % max;
}

function elegir(cadena) { return cadena[randInt(cadena.length)]; }

/** Fisher-Yates con aleatoriedad segura. */
function barajar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* ---------- Conjuntos de caracteres ---------- */

const CHARS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{}.,?'
};
const AMBIGUOS = /[Il1O0o|]/g;

const ALFABETOS = {
    hex: '0123456789abcdef',
    base62: CHARS.digits + CHARS.upper + CHARS.lower,
    base64url: CHARS.upper + CHARS.lower + CHARS.digits + '-_'
};

/* Lista de palabras (sin tildes ni ñ para facilitar la escritura). */
const PALABRAS = Array.from(new Set((
    'abeja abismo aceite aguila alba alcance almendra altura amanecer ancla angel animal arbol arena arroyo ' +
    'astro aurora avena azafran azul balcon ballena bambu barco barro bastion bosque brisa bruma bufanda ' +
    'caballo cabana cactus cafe calle camino campana canal canto capitan cascada castillo cedro cerezo ' +
    'cielo cima cobre cometa conejo coral corona cosecha cristal cuervo delta desierto diamante dragon ' +
    'duna eclipse eje elefante encina escala escudo esfera espiga estrella estuario faro felino fenix ' +
    'fuente fuego galaxia gato glaciar globo granito gruta guitarra halcon hamaca helecho herrero hielo ' +
    'horizonte huella huerto humo icono isla jabali jade jardin jazmin jirafa joya junco laberinto lago ' +
    'lampara lanza laurel lava lechuza leon libreta lince lirio llama lluvia lobo luna lupa madera magnolia ' +
    'mapa marea mariposa marmol meseta meteoro miel mirador molino montana mosaico musgo nacar nebulosa ' +
    'nido nieve niebla noche nube nutria oasis oceano olivo onda opalo orquidea oruga oso otono paloma ' +
    'pantera pastel pavo pedernal pelicano perla pino pirata planeta plata pluma polen puente puerto ' +
    'puma quetzal quimera radar raiz rama rayo reloj remo rio roble roca rocio rosal rubi sabana safari ' +
    'salmon selva sendero sierra silencio sol tambor tapiz tejado tigre tinta topacio tormenta tortuga ' +
    'trebol trigo trueno tulipan tundra turquesa umbral valle vela velero verano viento violeta volcan ' +
    'yunque zafiro zorro zenit'
).split(/\s+/)));

/* ---------- Generadores ---------- */

function generarPassword({ length, upper, lower, digits, symbols, ambiguous }) {
    const quitar = (s) => (ambiguous ? s.replace(AMBIGUOS, '') : s);
    const conjuntos = [];
    if (upper) conjuntos.push(quitar(CHARS.upper));
    if (lower) conjuntos.push(quitar(CHARS.lower));
    if (digits) conjuntos.push(quitar(CHARS.digits));
    if (symbols) conjuntos.push(quitar(CHARS.symbols));
    if (!conjuntos.length) throw new Error('Selecciona al menos un tipo de carácter');

    const alfabeto = conjuntos.join('');
    // Garantiza al menos un carácter de cada conjunto activo y rellena el resto.
    const chars = conjuntos.map(elegir);
    while (chars.length < length) chars.push(elegir(alfabeto));
    barajar(chars);
    const valor = chars.slice(0, length).join('');
    return { valor, bits: length * Math.log2(alfabeto.length) };
}

function generarFrase({ words, sep, cap, num }) {
    const partes = [];
    for (let i = 0; i < words; i++) {
        const p = PALABRAS[randInt(PALABRAS.length)];
        partes.push(cap ? p[0].toUpperCase() + p.slice(1) : p);
    }
    let valor = partes.join(sep);
    let bits = words * Math.log2(PALABRAS.length);
    if (num) { valor += (sep || '') + randInt(1000); bits += Math.log2(1000); }
    return { valor, bits };
}

function generarToken({ fmt, length, prefix }) {
    const alfabeto = ALFABETOS[fmt] || ALFABETOS.hex;
    let cuerpo = '';
    for (let i = 0; i < length; i++) cuerpo += alfabeto[randInt(alfabeto.length)];
    return { valor: (prefix || '') + cuerpo, bits: length * Math.log2(alfabeto.length) };
}

function generarUUID() {
    let valor;
    if (typeof crypto.randomUUID === 'function') {
        valor = crypto.randomUUID();
    } else {
        const b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
        valor = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
    return { valor, bits: 122 };
}

function generarPin({ length }) {
    let valor = '';
    for (let i = 0; i < length; i++) valor += randInt(10);
    return { valor, bits: length * Math.log2(10) };
}

/* ---------- Fortaleza ---------- */

const GUESSES_POR_SEGUNDO = 1e10; // atacante offline con hardware dedicado

function nivelFortaleza(bits) {
    if (bits < 28) return { n: 1, texto: 'Muy débil' };
    if (bits < 50) return { n: 2, texto: 'Débil' };
    if (bits < 75) return { n: 3, texto: 'Buena' };
    return { n: 4, texto: 'Excelente' };
}

function tiempoDeCrackeo(bits) {
    const seg = Math.pow(2, bits - 1) / GUESSES_POR_SEGUNDO; // en promedio, la mitad del espacio
    if (seg < 1) return 'al instante';
    const u = [[60, 'segundos'], [60, 'minutos'], [24, 'horas'], [365, 'días'], [1000, 'años'], [1000, 'miles de años'], [1000, 'millones de años']];
    let v = seg;
    for (let i = 0; i < u.length; i++) {
        if (v < u[i][0]) return `~${Math.round(v)} ${u[i][1]}`;
        v /= u[i][0];
    }
    return 'más que la edad del universo';
}

/* ---------- Almacenamiento (localStorage con tolerancia a fallos) ---------- */

const CLAVE_BOVEDA = 'secretgen.boveda.v1';
const CLAVE_AJUSTES = 'secretgen.ajustes.v1';

function leerJSON(clave, defecto) {
    try {
        const raw = localStorage.getItem(clave);
        return raw ? JSON.parse(raw) : defecto;
    } catch { return defecto; }
}
function escribirJSON(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; }
}

const AJUSTES_DEFECTO = {
    tipo: 'password',
    password: { length: 20, upper: true, lower: true, digits: true, symbols: true, ambiguous: false },
    phrase: { words: 5, sep: '-', cap: true, num: false },
    token: { fmt: 'hex', length: 32, prefix: '' },
    pin: { length: 6 }
};

function cargarAjustes() {
    const g = leerJSON(CLAVE_AJUSTES, {});
    const a = JSON.parse(JSON.stringify(AJUSTES_DEFECTO));
    if (g && typeof g === 'object') {
        if (['password', 'phrase', 'token', 'uuid', 'pin'].includes(g.tipo)) a.tipo = g.tipo;
        for (const k of ['password', 'phrase', 'token', 'pin']) {
            if (g[k] && typeof g[k] === 'object') {
                for (const campo of Object.keys(a[k])) {
                    if (typeof g[k][campo] === typeof a[k][campo]) a[k][campo] = g[k][campo];
                }
            }
        }
    }
    return a;
}

let ajustes = cargarAjustes();
let boveda = [];
let actual = { valor: '', bits: 0, tipo: 'password' };

function cargarBoveda() {
    const datos = leerJSON(CLAVE_BOVEDA, []);
    boveda = Array.isArray(datos) ? datos.filter(itemValido).map(normalizarItem) : [];
}
function itemValido(i) { return i && typeof i === 'object' && typeof i.valor === 'string' && i.valor.length > 0; }
function normalizarItem(i) {
    return {
        id: typeof i.id === 'string' && i.id ? i.id : nuevoId(),
        nombre: String(i.nombre || 'Sin nombre').slice(0, 60),
        valor: i.valor,
        tipo: ['password', 'phrase', 'token', 'uuid', 'pin'].includes(i.tipo) ? i.tipo : 'password',
        creado: Number.isFinite(i.creado) ? i.creado : Date.now()
    };
}
function nuevoId() {
    return Date.now().toString(36) + '-' + [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function guardarBoveda() {
    if (!escribirJSON(CLAVE_BOVEDA, boveda)) toast('No se pudo guardar: almacenamiento no disponible');
}

/* ---------- Utilidades de UI ---------- */

const $ = (id) => document.getElementById(id);
const NOMBRES_TIPO = { password: 'Contraseña', phrase: 'Frase', token: 'Token', uuid: 'UUID', pin: 'PIN' };

let timerToast;
function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => t.classList.remove('visible'), 2200);
}

async function copiar(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch {
        // Respaldo para contextos sin Clipboard API
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
        return ok;
    }
}

function icono(nombre) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ico');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + nombre);
    svg.appendChild(use);
    return svg;
}

function parpadeoOk(btn, nombreIcono) {
    const original = [...btn.childNodes];
    btn.classList.add('ok');
    const nodos = [icono('check')];
    if (original.some((n) => n.nodeName === 'SPAN')) {
        const s = document.createElement('span'); s.textContent = '¡Copiado!'; nodos.push(s);
    }
    btn.replaceChildren(...nodos);
    setTimeout(() => { btn.classList.remove('ok'); btn.replaceChildren(...original); }, 1200);
}

/* ---------- Generador: render ---------- */

function pintarSalida(valor) {
    const salida = $('salida');
    salida.replaceChildren();
    salida.classList.remove('nuevo'); void salida.offsetWidth; salida.classList.add('nuevo');
    for (const ch of valor) {
        if (/[0-9]/.test(ch)) {
            const s = document.createElement('span'); s.className = 'd'; s.textContent = ch; salida.appendChild(s);
        } else if (/[^A-Za-z0-9]/.test(ch)) {
            const s = document.createElement('span'); s.className = 's'; s.textContent = ch; salida.appendChild(s);
        } else {
            salida.appendChild(document.createTextNode(ch));
        }
    }
}

function generar() {
    const tipo = ajustes.tipo;
    let r;
    try {
        if (tipo === 'password') r = generarPassword(ajustes.password);
        else if (tipo === 'phrase') r = generarFrase(ajustes.phrase);
        else if (tipo === 'token') r = generarToken(ajustes.token);
        else if (tipo === 'uuid') r = generarUUID();
        else r = generarPin(ajustes.pin);
    } catch (e) {
        toast(e.message);
        return;
    }
    actual = { ...r, tipo };
    pintarSalida(r.valor);

    const nivel = tipo === 'pin' ? { n: Math.min(2, nivelFortaleza(r.bits).n), texto: 'PIN' } : nivelFortaleza(r.bits);
    $('barras').dataset.nivel = nivel.n;
    $('fortaleza-texto').textContent = nivel.texto;
    $('fortaleza-detalle').textContent = `${Math.round(r.bits)} bits · crackeo: ${tiempoDeCrackeo(r.bits)}`;
}

function aplicarAjustesAUI() {
    const p = ajustes.password, f = ajustes.phrase, t = ajustes.token, n = ajustes.pin;
    $('pw-longitud').value = p.length; $('pw-longitud-val').textContent = p.length;
    for (const k of ['upper', 'lower', 'digits', 'symbols', 'ambiguous']) $('pw-' + k).checked = p[k];
    $('ph-palabras').value = f.words; $('ph-palabras-val').textContent = f.words;
    $('ph-sep').value = f.sep; $('ph-cap').checked = f.cap; $('ph-num').checked = f.num;
    $('tk-longitud').value = t.length; $('tk-longitud-val').textContent = t.length;
    $('tk-formato').value = t.fmt; $('tk-prefijo').value = t.prefix;
    $('pin-longitud').value = n.length; $('pin-longitud-val').textContent = n.length;
    mostrarTipo();
    rellenarRangos();
}

function mostrarTipo() {
    document.querySelectorAll('#tipos button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === ajustes.tipo)));
    document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.dataset.panel !== ajustes.tipo; });
}

function rellenarRangos() {
    document.querySelectorAll('input[type=range]').forEach((r) => {
        const pct = ((r.value - r.min) / (r.max - r.min)) * 100;
        r.style.setProperty('--pct', pct + '%');
    });
}

function cambio() {
    rellenarRangos();
    escribirJSON(CLAVE_AJUSTES, ajustes);
    generar();
}

function enlazarControles() {
    $('tipos').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-tipo]');
        if (!b) return;
        ajustes.tipo = b.dataset.tipo;
        mostrarTipo();
        cambio();
    });

    const rango = (id, grupo, campo) => $(id).addEventListener('input', (e) => {
        const v = Number(e.target.value);
        ajustes[grupo][campo] = v;
        $(id + '-val').textContent = v;
        cambio();
    });
    rango('pw-longitud', 'password', 'length');
    rango('ph-palabras', 'phrase', 'words');
    rango('tk-longitud', 'token', 'length');
    rango('pin-longitud', 'pin', 'length');

    for (const k of ['upper', 'lower', 'digits', 'symbols', 'ambiguous']) {
        $('pw-' + k).addEventListener('change', (e) => {
            ajustes.password[k] = e.target.checked;
            const p = ajustes.password;
            if (!p.upper && !p.lower && !p.digits && !p.symbols) {
                // Evita un estado inválido: mantiene al menos un tipo activo
                p[k] = true; e.target.checked = true;
                toast('Debe quedar al menos un tipo de carácter');
            }
            cambio();
        });
    }
    $('ph-sep').addEventListener('change', (e) => { ajustes.phrase.sep = e.target.value; cambio(); });
    $('ph-cap').addEventListener('change', (e) => { ajustes.phrase.cap = e.target.checked; cambio(); });
    $('ph-num').addEventListener('change', (e) => { ajustes.phrase.num = e.target.checked; cambio(); });
    $('tk-formato').addEventListener('change', (e) => { ajustes.token.fmt = e.target.value; cambio(); });
    $('tk-prefijo').addEventListener('input', (e) => { ajustes.token.prefix = e.target.value; cambio(); });

    $('btn-generar').addEventListener('click', generar);
    $('btn-regenerar').addEventListener('click', generar);

    $('btn-copiar').addEventListener('click', async (e) => {
        if (!actual.valor) return;
        const btn = e.currentTarget;
        const ok = await copiar(actual.valor);
        if (ok) { parpadeoOk(btn, 'copy'); toast('Copiado al portapapeles'); }
        else toast('No se pudo copiar');
    });

    $('btn-guardar').addEventListener('click', () => {
        if (!actual.valor) return;
        $('guardar-nombre').value = '';
        $('dlg-guardar').showModal();
        $('guardar-nombre').focus();
    });
    $('guardar-cancelar').addEventListener('click', () => $('dlg-guardar').close());
    $('form-guardar').addEventListener('submit', () => {
        const nombre = $('guardar-nombre').value.trim() || NOMBRES_TIPO[actual.tipo];
        boveda.unshift({ id: nuevoId(), nombre, valor: actual.valor, tipo: actual.tipo, creado: Date.now() });
        guardarBoveda();
        pintarBoveda();
        toast('Guardado en la bóveda');
    });
}

/* ---------- Bóveda ---------- */

const visibles = new Set();

function pintarBoveda() {
    const filtro = $('buscar').value.trim().toLowerCase();
    const lista = $('lista');
    lista.replaceChildren();
    $('contador-boveda').textContent = boveda.length;

    const items = boveda.filter((i) => !filtro || i.nombre.toLowerCase().includes(filtro));
    $('vacio').hidden = items.length > 0;
    $('vacio').textContent = boveda.length ? 'Sin resultados.' : 'Aún no hay secretos guardados. Genera uno y pulsa Guardar.';

    for (const item of items) {
        const li = document.createElement('li');
        li.className = 'item';

        const cab = document.createElement('div'); cab.className = 'item-cab';
        const nombre = document.createElement('span'); nombre.className = 'item-nombre'; nombre.textContent = item.nombre;
        const tipo = document.createElement('span'); tipo.className = 'item-tipo'; tipo.textContent = NOMBRES_TIPO[item.tipo];
        const fecha = document.createElement('span'); fecha.className = 'item-fecha';
        fecha.textContent = new Date(item.creado).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
        cab.append(nombre, tipo, fecha);

        const mostrar = visibles.has(item.id);
        const valor = document.createElement('div'); valor.className = 'item-valor';
        valor.textContent = mostrar ? item.valor : '•'.repeat(Math.min(item.valor.length, 24));

        const acc = document.createElement('div'); acc.className = 'item-acciones';
        const bVer = botonIcono(mostrar ? 'eyeoff' : 'eye', mostrar ? 'Ocultar' : 'Mostrar', () => {
            if (visibles.has(item.id)) visibles.delete(item.id); else visibles.add(item.id);
            pintarBoveda();
        });
        const bCopiar = botonIcono('copy', 'Copiar', async (e) => {
            const btn = e.currentTarget;
            if (await copiar(item.valor)) { parpadeoOk(btn, 'copy'); toast('Copiado al portapapeles'); } else toast('No se pudo copiar');
        });
        const bBorrar = botonIcono('trash', 'Eliminar', () => {
            if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
            boveda = boveda.filter((x) => x.id !== item.id);
            visibles.delete(item.id);
            guardarBoveda(); pintarBoveda(); toast('Eliminado');
        });
        bBorrar.classList.add('borrar');
        acc.append(bVer, bCopiar, bBorrar);

        li.append(cab, valor, acc);
        lista.appendChild(li);
    }
}

function botonIcono(nombreIcono, etiqueta, fn) {
    const b = document.createElement('button');
    b.className = 'icono-btn';
    b.title = etiqueta;
    b.setAttribute('aria-label', etiqueta);
    b.appendChild(icono(nombreIcono));
    b.addEventListener('click', fn);
    return b;
}

function exportar() {
    if (!boveda.length) { toast('La bóveda está vacía'); return; }
    const blob = new Blob([JSON.stringify({ version: 1, exportado: new Date().toISOString(), items: boveda }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `boveda-secretos-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Exportado (el archivo está en texto plano)');
}

function importar(archivo) {
    const lector = new FileReader();
    lector.onload = () => {
        try {
            const datos = JSON.parse(String(lector.result));
            const lista = Array.isArray(datos) ? datos : datos.items;
            if (!Array.isArray(lista)) throw new Error();
            const existentes = new Set(boveda.map((i) => i.id));
            let n = 0;
            for (const i of lista) {
                if (!itemValido(i)) continue;
                const it = normalizarItem(i);
                if (existentes.has(it.id)) continue;
                boveda.push(it); existentes.add(it.id); n++;
            }
            boveda.sort((a, b) => b.creado - a.creado);
            guardarBoveda(); pintarBoveda();
            toast(n === 1 ? "Importado 1 secreto" : `Importados ${n} secretos`);
        } catch { toast('Archivo no válido'); }
    };
    lector.readAsText(archivo);
}

function enlazarBoveda() {
    $('buscar').addEventListener('input', pintarBoveda);
    $('btn-exportar').addEventListener('click', exportar);
    $('btn-importar').addEventListener('click', () => $('archivo-importar').click());
    $('archivo-importar').addEventListener('change', (e) => {
        if (e.target.files[0]) importar(e.target.files[0]);
        e.target.value = '';
    });
    $('btn-borrar-todo').addEventListener('click', () => {
        if (!boveda.length) return;
        if (!confirm('¿Borrar TODOS los secretos guardados? Esta acción no se puede deshacer.')) return;
        boveda = []; visibles.clear();
        guardarBoveda(); pintarBoveda(); toast('Bóveda vaciada');
    });
}

/* ---------- Pestañas ---------- */

function enlazarPestanas() {
    document.querySelectorAll('.pestanas button').forEach((b) => b.addEventListener('click', () => {
        const vista = b.dataset.vista;
        document.querySelectorAll('.pestanas button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
        $('vista-gen').hidden = vista !== 'gen';
        $('vista-boveda').hidden = vista !== 'boveda';
        if (vista === 'boveda') pintarBoveda();
    }));
}

/* ---------- Inicio ---------- */

document.addEventListener('DOMContentLoaded', () => {
    cargarBoveda();
    aplicarAjustesAUI();
    enlazarControles();
    enlazarBoveda();
    enlazarPestanas();
    pintarBoveda();
    generar();
});
