# Contador dinámico y administración de eventos

## Uso local

1. Instala las dependencias una sola vez con `npm install`.
2. Genera la versión final con `npm run build`.
3. Inicia el servidor con `npm run server`.
4. Abre la página pública en `http://127.0.0.1:4174/gano-plus-landing.html#proximo-juego`.
5. Abre el panel privado en `http://127.0.0.1:4174/admin`.

En desarrollo local, si no existe un archivo `.env`, el acceso temporal es:

- Usuario: `admin`
- Contraseña: `Gano+1-Admin-2026!`

Estas credenciales son únicamente para pruebas locales.

## Configuración de producción

Copia `.env.example` como `.env` y reemplaza todos los valores. La clave de sesión debe ser larga, aleatoria y privada.

```text
ADMIN_USER=tu_usuario_privado
ADMIN_PASSWORD=una_contraseña_larga_y_unica
SESSION_SECRET=una_clave_aleatoria_de_al_menos_32_caracteres
PORT=4174
NODE_ENV=production
```

En producción el servidor no arranca si faltan estas variables. Publica el servidor detrás de HTTPS (por ejemplo, un proxy administrado o un proveedor Node con certificado TLS). El modo de producción activa HSTS y la cookie de sesión `Secure`.

## Cómo funciona

- La página pública consulta `GET /api/fecha-juego` al cargar y construye el contador con la fecha guardada.
- El panel inicia sesión y envía la nueva fecha mediante `POST /api/fecha-juego` con protección de sesión y CSRF.
- La configuración se guarda de forma atómica en `config/game-event.json`.
- Al actualizar el panel, cualquier visitante que vuelva a cargar la página recibe la nueva fecha inmediatamente.
- Al llegar a cero se muestra `¡EL JUEGO HA COMENZADO!`.

## Seguridad incluida

- Sesión firmada, `HttpOnly`, `SameSite=Strict` y caducidad de 8 horas.
- Cookie `Secure` y HSTS en producción HTTPS.
- Protección CSRF para actualizaciones y cierre de sesión.
- Límite de intentos de inicio de sesión.
- Validación estricta de fecha, tipo de contenido y tamaño de petición.
- Encabezados CSP, anti-iframe, anti-MIME sniffing y política de referrer.

El certificado SSL/TLS se configura en el dominio o proveedor de alojamiento, no dentro del HTML. No se instala un banner de cookies porque esta función no crea cookies publicitarias ni de seguimiento; la única cookie es la sesión necesaria del administrador.
