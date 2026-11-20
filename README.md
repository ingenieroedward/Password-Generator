# Generador de Secretos

Generador de contraseñas y secretos 100 % en el navegador, sin dependencias ni servidor.

## Funciones

- **Aleatoriedad criptográfica**: `crypto.getRandomValues` con muestreo sin sesgo.
- **Tipos**: contraseña (4–128), frase de palabras, token (hex / base62 / base64url, con prefijo), UUID v4 y PIN.
- **Contraseñas**: garantiza al menos un carácter de cada tipo activo y permite evitar caracteres ambiguos (`Il1O0o|`).
- **Fortaleza real**: calculada por entropía (bits) con estimación de tiempo de crackeo.
- **Bóveda local**: guarda secretos con nombre en `localStorage`, con búsqueda, mostrar/ocultar, copiar, eliminar, exportar e importar JSON.
- Los ajustes se recuerdan entre sesiones. Interfaz responsive y accesible.

## Aviso

La bóveda guarda los secretos **en texto plano** en este navegador. No la uses para credenciales críticas en equipos compartidos. Un siguiente paso natural es cifrarla con una contraseña maestra (WebCrypto).

## Uso

Abre `index.html` en el navegador.
