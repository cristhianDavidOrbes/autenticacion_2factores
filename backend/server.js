require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cors = require("cors");
const { protegerRuta, permitirRol } = require("./authMidd");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.ACCESS_TOKEN_SECRET ||
  "jwt-secret-cambiar-en-produccion";
const ACCESS_TOKEN_EXPIRES_IN = "15s";
const TWO_FACTOR_TTL_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const users = [
  {
    id: 1,
    email: process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "admin@gmail.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
    borrowedBooks: [],
    twoFactorCode: null,
    twoFactorExpiresAt: null,
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
  },
  {
    id: 2,
    email:
      process.env.STUDENT_EMAIL || process.env.GMAIL_USER || "estudiante@gmail.com",
    password: process.env.STUDENT_PASSWORD || "student123",
    role: "estudiante",
    borrowedBooks: [
      "Cien Anos de Soledad",
      "Clean Code",
      "Eloquent JavaScript",
    ],
    twoFactorCode: null,
    twoFactorExpiresAt: null,
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
  },
];

const libraryInventory = [
  { id: "L001", title: "Clean Code", total: 8, available: 5 },
  { id: "L002", title: "Cien Anos de Soledad", total: 6, available: 4 },
  { id: "L003", title: "Eloquent JavaScript", total: 10, available: 9 },
  { id: "L004", title: "Don Quijote de la Mancha", total: 5, available: 5 },
];

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function generateFourDigitCode() {
  return crypto.randomInt(1000, 10000).toString();
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      correo: user.email,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ensureEmailConfig(res) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    res.status(500).json({
      mensaje:
        "Configura GMAIL_USER y GMAIL_APP_PASSWORD en .env para enviar codigos 2FA.",
    });
    return false;
  }

  return true;
}

const apiInfo = {
  estado: "ok",
  servicio: "Sistema de Seguridad biblioteca",
  endpoints: [
    "POST /login-paso1",
    "POST /login-paso2",
    "POST /refresh-token",
    "GET /mi-espacio (rol estudiante)",
    "GET /dashboard-admin (rol admin)",
  ],
};

app.get("/", (_req, res) => {
  return res.json(apiInfo);
});

app.get("/api", (_req, res) => {
  return res.json(apiInfo);
});

app.post("/login-paso1", async (req, res) => {
  if (!ensureEmailConfig(res)) {
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      mensaje: "Debes enviar email y password en el cuerpo.",
    });
  }

  const user = users.find(
    (item) =>
      item.email.toLowerCase() === String(email).toLowerCase().trim() &&
      item.password === password
  );

  if (!user) {
    return res.status(401).json({ mensaje: "Credenciales invalidas." });
  }

  const code = generateFourDigitCode();
  user.twoFactorCode = code;
  user.twoFactorExpiresAt = Date.now() + TWO_FACTOR_TTL_MS;

  try {
    await transporter.sendMail({
      from: `"Biblioteca Seguridad" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: "Codigo 2FA - Sistema Biblioteca",
      text: `Tu codigo de acceso es ${code}. Expira en 5 minutos.`,
    });
  } catch (error) {
    user.twoFactorCode = null;
    user.twoFactorExpiresAt = null;
    return res.status(500).json({
      mensaje: "No fue posible enviar el codigo por correo.",
      detalle: error.message,
    });
  }

  return res.json({
    mensaje: "Codigo 2FA enviado al correo.",
    siguientePaso: "Enviar email y codigo a /login-paso2",
  });
});

app.post("/login-paso2", (req, res) => {
  const { email, codigo } = req.body;

  if (!email || !codigo) {
    return res.status(400).json({
      mensaje: "Debes enviar email y codigo en el cuerpo.",
    });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedCode = String(codigo).trim();

  const candidates = users.filter(
    (item) => item.email.toLowerCase() === normalizedEmail
  );

  if (!candidates.length) {
    return res.status(401).json({
      mensaje: "No hay codigo activo para este usuario.",
    });
  }

  const user = candidates.find(
    (item) => item.twoFactorCode && item.twoFactorCode === normalizedCode
  );

  if (!user || !user.twoFactorExpiresAt) {
    return res.status(401).json({ mensaje: "Codigo incorrecto." });
  }

  if (Date.now() > user.twoFactorExpiresAt) {
    user.twoFactorCode = null;
    user.twoFactorExpiresAt = null;
    return res.status(401).json({ mensaje: "El codigo ya expiro." });
  }

  user.twoFactorCode = null;
  user.twoFactorExpiresAt = null;

  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken();

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;

  return res.json({
    mensaje: "Autenticacion completada.",
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresInHours: 24,
    role: user.role,
  });
});

app.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ mensaje: "Debes enviar refreshToken." });
  }

  const incomingTokenHash = hashToken(refreshToken);
  const user = users.find((item) => item.refreshTokenHash === incomingTokenHash);

  if (!user || !user.refreshTokenExpiresAt) {
    return res.status(401).json({ mensaje: "Refresh Token invalido." });
  }

  if (Date.now() > user.refreshTokenExpiresAt) {
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    return res.status(401).json({ mensaje: "Refresh Token expirado." });
  }

  const newAccessToken = signAccessToken(user);

  return res.json({
    accessToken: newAccessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
});

app.get("/mi-espacio", protegerRuta, permitirRol("estudiante"), (req, res) => {
  const user = users.find((item) => item.id === Number(req.user.id));

  if (!user) {
    return res.status(404).json({ mensaje: "Usuario no encontrado." });
  }

  return res.json({
    mensaje: "Bienvenido a tu espacio de estudiante.",
    email: user.email,
    role: user.role,
    librosPrestados: user.borrowedBooks,
  });
});

app.get(
  "/dashboard-admin",
  protegerRuta,
  permitirRol("admin"),
  (_req, res) => {
    return res.json({
      mensaje: "Panel de administracion de biblioteca.",
      inventarioTotal: libraryInventory,
    });
  }
);

app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
