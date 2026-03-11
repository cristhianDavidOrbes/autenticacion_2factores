# Frontend Sistema Biblioteca

Frontend basico (HTML semantico + CSS + JS) para:
- Login paso 1 (correo + password)
- Login paso 2 (codigo 2FA)
- Renovar access token
- Probar ruta estudiante `/mi-espacio`
- Probar ruta admin `/dashboard-admin`

Flujo visual:
`login -> pantalla 2fa -> dashboard por rol (estudiante/admin)`

## Archivos

```text
frontend/
  index.html
  styles.css
  app.js
  static-server.js
```

## Ejecutar frontend separado

1. Ejecuta backend en otra terminal:

```bash
cd backend
npm start
```

2. Ejecuta frontend en otra terminal:

```bash
cd frontend
node static-server.js
```

3. Abre:

```text
http://localhost:5500
```

Nota: `app.js` apunta al backend en `http://localhost:3000`.
Si quieres otro backend, abre por ejemplo:
`http://localhost:5500/?api=http://localhost:3001`
"# autenticacion_2factores" 
