// Punto de entrada serverless para todas las rutas /api/* en Vercel.
// La aplicación Express conserva la autenticación, CSRF y almacenamiento Blob.
import app from "../server.js";

export default app;
