# Sistema de Seguridad Biblioteca (Backend)

Backend en Node.js + Express con:
- 2FA por correo (Nodemailer + Gmail)
- Access Token JWT de 15 segundos
- Refresh Token de 1 dia
- Rutas protegidas con middleware `authMidd.js`
- Control de acceso por roles (`estudiante` y `admin`)

## Estructura

```text
backend/
  authMidd.js
  server.js
  .env.example
  package.json
```

## 1. Configuracion

1. Ubicate en `backend`:

```bash
cd backend
```

2. Crea archivo `.env` copiando `.env.example`.
3. Completa estas variables:
   - `GMAIL_USER=tu_correo@gmail.com`
   - `GMAIL_APP_PASSWORD=tu_app_password_de_16_caracteres`
   - `ADMIN_EMAIL` y `STUDENT_EMAIL` (puede ser el mismo Gmail real)
   - `JWT_SECRET`

## 2. Ejecutar

```bash
npm install
npm start
```

Servidor: `http://localhost:3000`
Info API: `http://localhost:3000/`
Estado API: `http://localhost:3000/api`

Frontend separado en: `../frontend`

## 3. Endpoints

### POST `/login-paso1`
Valida correo y password, y envia codigo de 4 digitos por correo.

Body:

```json
{
  "email": "tu_correo@gmail.com",
  "password": "student123"
}
```

### POST `/login-paso2`
Valida el codigo 2FA y devuelve Access Token + Refresh Token.

Body:

```json
{
  "email": "tu_correo@gmail.com",
  "codigo": "1234"
}
```

### POST `/refresh-token`
Recibe refresh token y devuelve un nuevo access token de 15 segundos.

Body:

```json
{
  "refreshToken": "TOKEN_RECIBIDO_EN_LOGIN_PASO2"
}
```

### GET `/mi-espacio` (solo rol `estudiante`)
Header obligatorio:

```text
Authorization: Bearer ACCESS_TOKEN
```

### GET `/dashboard-admin` (solo rol `admin`)
Header obligatorio:

```text
Authorization: Bearer ACCESS_TOKEN
```

## 4. Prueba en Postman (orden recomendado)

1. `POST /login-paso1` con usuario estudiante o admin.
2. Revisa tu Gmail y copia el codigo recibido.
3. `POST /login-paso2` con ese codigo.
4. Guarda `accessToken` y `refreshToken`.
5. `GET /mi-espacio` con `Authorization: Bearer <accessToken>` si el token es de estudiante.
6. `GET /dashboard-admin` con `Authorization: Bearer <accessToken>` si el token es de admin.
7. Espera mas de 15 segundos para que expire el access token.
8. `POST /refresh-token` con el `refreshToken` para obtener un nuevo access token.
