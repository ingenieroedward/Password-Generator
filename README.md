# Secretos — generador de contraseñas y blog de seguridad

Sitio estático en español: un generador de contraseñas que funciona 100 % en el navegador, más un blog de seguridad pensado para posicionar en buscadores.

## Qué incluye

- **Generador:** contraseña (4–128), frase, token (hex/base62/base64url), UUID v4 y PIN. Usa `crypto.getRandomValues` con muestreo sin sesgo. La fortaleza se calcula por entropía.
- **Bóveda local:** guarda secretos en `localStorage` (texto plano, solo en el navegador), con búsqueda y exportar/importar JSON.
- **Blog:** 6 guías (contraseñas, entropía, 2FA, phishing, filtraciones).
- **SEO:** títulos y descripciones únicos, URL canónicas, Open Graph, datos estructurados JSON-LD (`WebApplication`, `FAQPage`, `Article`, `BreadcrumbList`), `sitemap.xml`, `robots.txt`, HTML semántico y enlazado interno.

## Estructura

```
content/            Fuente editable
  home.html           Cuerpo de la página principal (herramienta + secciones)
  faq.json            Preguntas frecuentes (HTML + JSON-LD)
  articles.json       Metadatos de los artículos
  articles/*.html     Cuerpo de cada artículo
scripts/build.mjs   Genera las páginas HTML, sitemap.xml y robots.txt
style.css, script.js, favicon.svg
index.html, blog/, sitemap.xml, robots.txt   (generados)
```

## Añadir un artículo

1. Crea `content/articles/mi-slug.html` con el cuerpo (usa `{{root}}` para enlaces internos, p. ej. `{{root}}#generador`).
2. Añade su entrada en `content/articles.json` (`slug`, `title`, `description`, `date`, `minutes`, `tag`).
3. Ejecuta el generador:

```bash
node scripts/build.mjs
```

## Dominio

Las URL canónicas y el sitemap usan `SITE_URL` (por defecto la de GitHub Pages del repositorio). Para tu dominio:

```bash
SITE_URL=https://midominio.com node scripts/build.mjs
```

## Aviso

La bóveda no está cifrada. Un siguiente paso natural es protegerla con una contraseña maestra (WebCrypto).
