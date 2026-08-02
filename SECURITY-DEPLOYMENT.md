# Seguridad y publicación de GANO+1

## HTTPS / SSL

La página debe publicarse detrás de HTTPS. Active el certificado automático del proveedor de hosting y fuerce la redirección de HTTP a HTTPS. HSTS ya está configurado en `_headers` y `vercel.json`; solo tiene efecto cuando el sitio responde por HTTPS.

## Encabezados incluidos

- Content Security Policy restrictiva.
- Protección contra inclusión en iframes.
- Bloqueo de detección incorrecta de tipos de archivo.
- Cámara, micrófono, ubicación, pagos y USB deshabilitados.
- Política de referencia limitada.
- Aislamiento entre ventanas y recursos.
- Caché larga para imágenes y archivos versionados.

## Cookies y privacidad

La página no crea cookies, almacenamiento local ni rastreadores. No necesita banner de consentimiento mientras se mantenga así. Si se agrega analítica, publicidad o píxeles sociales, deben permanecer desactivados hasta obtener consentimiento explícito.

## Antes de publicar

1. Publicar el contenido de `dist` después de ejecutar `npm run build`. La compilación copia automáticamente la física del ánfora y los archivos de seguridad.
2. Activar HTTPS y redirección automática desde HTTP.
3. Confirmar que el proveedor aplique `_headers` o `vercel.json`.
4. Probar el dominio final con una auditoría de encabezados y rendimiento.
