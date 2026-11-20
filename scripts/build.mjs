#!/usr/bin/env node
/**
 * Generador del sitio estático.
 *   node scripts/build.mjs
 *
 * Lee content/ (home.html, faq.json, articles.json, articles/*.html) y escribe:
 *   index.html, blog/index.html, blog/<slug>/index.html, sitemap.xml, robots.txt
 *
 * La URL pública se configura con la variable SITE_URL (sin barra final):
 *   SITE_URL=https://midominio.com node scripts/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = (process.env.SITE_URL || 'https://ingenieroedward.github.io/Password-Generator').replace(/\/$/, '');
const SITE_NAME = 'Secretos';
const leer = (...r) => readFileSync(join(RAIZ, ...r), 'utf8');
const escribir = (ruta, txt) => { mkdirSync(dirname(join(RAIZ, ruta)), { recursive: true }); writeFileSync(join(RAIZ, ruta), txt); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const fecha = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const articulos = JSON.parse(leer('content', 'articles.json')).sort((a, b) => b.date.localeCompare(a.date));
const faq = JSON.parse(leer('content', 'faq.json'));

/* ---------- Piezas comunes ---------- */

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="i-refresh" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></symbol>
<symbol id="i-save" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-eyeoff" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></symbol>
<symbol id="i-upload" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></symbol>
</defs></svg>`;

function cabecera(root, activo) {
    const a = (id) => (id === activo ? ' aria-current="page"' : '');
    return `<header class="sitio">
    <div class="wrap sitio-in">
        <a class="marca" href="${root}"><svg class="ico"><use href="#i-lock"/></svg><span>${SITE_NAME}</span></a>
        <nav aria-label="Principal">
            <a href="${root}#generador"${a('gen')}>Generador</a>
            <a href="${root}#boveda">Bóveda</a>
            <a href="${root}blog/"${a('blog')}>Blog</a>
            <a href="${root}#preguntas">Preguntas</a>
        </nav>
    </div>
</header>`;
}

function pie(root) {
    const guias = articulos.slice(0, 4).map((x) => `<li><a href="${root}blog/${x.slug}/">${esc(x.title)}</a></li>`).join('');
    return `<footer class="pie">
    <div class="wrap pie-in">
        <div>
            <strong>${SITE_NAME}</strong>
            <p>Generador de contraseñas y secretos que funciona en tu navegador. Sin cuentas, sin rastreo.</p>
        </div>
        <div>
            <strong>Guías</strong>
            <ul>${guias}</ul>
        </div>
        <div>
            <strong>Sitio</strong>
            <ul>
                <li><a href="${root}#generador">Generador</a></li>
                <li><a href="${root}blog/">Blog de seguridad</a></li>
                <li><a href="${root}#preguntas">Preguntas frecuentes</a></li>
            </ul>
        </div>
    </div>
    <div class="wrap pie-copia">© ${new Date().getFullYear()} ${SITE_NAME}. Contenido educativo; no constituye asesoramiento profesional.</div>
</footer>`;
}

function pagina({ titulo, descripcion, ruta, root, body, jsonld = [], herramienta = false, tipoOg = 'website', activo = '' }) {
    const url = `${SITE_URL}/${ruta}`;
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(titulo)}</title>
    <meta name="description" content="${esc(descripcion)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="#f6f3ec" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#141613" media="(prefers-color-scheme: dark)">
    <link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
    <meta property="og:type" content="${tipoOg}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:locale" content="es_ES">
    <meta property="og:title" content="${esc(titulo)}">
    <meta property="og:description" content="${esc(descripcion)}">
    <meta property="og:url" content="${url}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${esc(titulo)}">
    <meta name="twitter:description" content="${esc(descripcion)}">
    <link rel="stylesheet" href="${root}style.css">
${herramienta ? `    <script defer src="${root}script.js"></script>\n` : ''}${jsonld.map((j) => `    <script type="application/ld+json">${json(j)}</script>`).join('\n')}
</head>
<body>
${SPRITE}
<a class="saltar" href="#contenido">Saltar al contenido</a>
${cabecera(root, activo)}
<main id="contenido">
${body}
</main>
${pie(root)}
${herramienta ? `<dialog id="dlg-guardar">
    <form method="dialog" id="form-guardar">
        <h2>Guardar en la bóveda</h2>
        <label for="guardar-nombre">Nombre</label>
        <input type="text" id="guardar-nombre" maxlength="60" required autocomplete="off" placeholder="Ej. Correo personal">
        <div class="dlg-acciones">
            <button type="button" class="btn" id="guardar-cancelar">Cancelar</button>
            <button type="submit" class="btn btn-principal">Guardar</button>
        </div>
    </form>
</dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
` : ''}</body>
</html>
`;
}

const tarjeta = (a, root) => `<article class="tarjeta-blog">
    <span class="etiqueta">${esc(a.tag)}</span>
    <h3><a href="${root}blog/${a.slug}/">${esc(a.title)}</a></h3>
    <p>${esc(a.description)}</p>
    <span class="meta">${a.minutes} min de lectura</span>
</article>`;

/* ---------- Inicio ---------- */
{
    const root = './';
    const latest = articulos.slice(0, 3).map((a) => tarjeta(a, root)).join('\n');
    const faqHtml = faq.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');
    const body = leer('content', 'home.html').replaceAll('{{root}}', root).replace('{{latest}}', latest).replace('{{faq}}', faqHtml);
    const titulo = 'Generador de contraseñas seguras online y gratis | Secretos';
    const descripcion = 'Genera contraseñas seguras, frases, tokens y PIN aleatorios en tu navegador. Gratis, sin registro y sin enviar datos. Incluye guías de seguridad.';
    escribir('index.html', pagina({
        titulo, descripcion, ruta: '', root, body, herramienta: true, activo: 'gen',
        jsonld: [
            {
                '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Generador de contraseñas seguras', url: `${SITE_URL}/`,
                description: descripcion, applicationCategory: 'SecurityApplication', operatingSystem: 'Any', inLanguage: 'es',
                browserRequirements: 'Requiere JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
            },
            {
                '@context': 'https://schema.org', '@type': 'FAQPage',
                mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
            }
        ]
    }));
}

/* ---------- Índice del blog ---------- */
{
    const root = '../';
    const body = `<section class="hero"><div class="wrap">
    <nav class="migas" aria-label="Migas de pan"><a href="${root}">Inicio</a> <span>/</span> <span>Blog</span></nav>
    <h1>Blog de seguridad y contraseñas</h1>
    <p class="lead">Guías claras y prácticas para proteger tus cuentas: contraseñas, verificación en dos pasos, phishing y qué hacer cuando algo sale mal.</p>
</div></section>
<section class="wrap seccion"><div class="tarjetas-blog tarjetas-lista">
${articulos.map((a) => tarjeta(a, root)).join('\n')}
</div></section>`;
    const titulo = 'Blog de seguridad: contraseñas, 2FA y phishing | Secretos';
    const descripcion = 'Guías prácticas sobre contraseñas seguras, verificación en dos pasos, phishing y cómo actuar ante una filtración de datos.';
    escribir('blog/index.html', pagina({
        titulo, descripcion, ruta: 'blog/', root, body, activo: 'blog',
        jsonld: [
            { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Blog de seguridad', url: `${SITE_URL}/blog/`, description: descripcion, inLanguage: 'es' },
            {
                '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
                    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` }
                ]
            }
        ]
    }));
}

/* ---------- Artículos ---------- */
for (const a of articulos) {
    const root = '../../';
    const cuerpo = leer('content', 'articles', `${a.slug}.html`).replaceAll('{{root}}', root);
    const otros = articulos.filter((x) => x.slug !== a.slug).slice(0, 3);
    const body = `<article class="wrap articulo">
    <nav class="migas" aria-label="Migas de pan"><a href="${root}">Inicio</a> <span>/</span> <a href="${root}blog/">Blog</a> <span>/</span> <span>${esc(a.tag)}</span></nav>
    <header>
        <h1>${esc(a.title)}</h1>
        <p class="meta"><time datetime="${a.date}">${fecha(a.date)}</time> · ${a.minutes} min de lectura</p>
    </header>
    <div class="texto">
${cuerpo}
    </div>
    <aside class="cta">
        <h2>¿Necesitas una contraseña segura ahora?</h2>
        <p>Genera una en un clic. Se crea en tu navegador y no se envía a ningún sitio.</p>
        <a class="btn btn-principal" href="${root}#generador">Abrir el generador</a>
    </aside>
    <section class="relacionados" aria-labelledby="t-rel">
        <h2 id="t-rel">Sigue leyendo</h2>
        <div class="tarjetas-blog">${otros.map((x) => tarjeta(x, root)).join('\n')}</div>
    </section>
</article>`;
    escribir(`blog/${a.slug}/index.html`, pagina({
        titulo: (`${a.title} | ${SITE_NAME}`.length <= 62 ? `${a.title} | ${SITE_NAME}` : a.title), descripcion: a.description, ruta: `blog/${a.slug}/`, root, body, tipoOg: 'article', activo: 'blog',
        jsonld: [
            {
                '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.description, inLanguage: 'es',
                datePublished: a.date, dateModified: a.date, mainEntityOfPage: `${SITE_URL}/blog/${a.slug}/`,
                author: { '@type': 'Organization', name: SITE_NAME }, publisher: { '@type': 'Organization', name: SITE_NAME }
            },
            {
                '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
                    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
                    { '@type': 'ListItem', position: 3, name: a.title, item: `${SITE_URL}/blog/${a.slug}/` }
                ]
            }
        ]
    }));
}

/* ---------- sitemap.xml y robots.txt ---------- */
const hoy = new Date().toISOString().slice(0, 10);
const urls = [
    { loc: `${SITE_URL}/`, mod: hoy, prio: '1.0' },
    { loc: `${SITE_URL}/blog/`, mod: articulos[0].date, prio: '0.8' },
    ...articulos.map((a) => ({ loc: `${SITE_URL}/blog/${a.slug}/`, mod: a.date, prio: '0.7' }))
];
escribir('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod><priority>${u.prio}</priority></url>`).join('\n')}
</urlset>
`);
escribir('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Sitio generado: ${urls.length} páginas · ${SITE_URL}`);
