const screenLogin = document.getElementById("screen-login");
const screen2fa = document.getElementById("screen-2fa");
const screenDashboard = document.getElementById("screen-dashboard");

const formLogin = document.getElementById("form-login");
const form2fa = document.getElementById("form-2fa");

const loginEmail = document.getElementById("login-email");
const twofaCode = document.getElementById("twofa-code");
const twofaEmailLabel = document.getElementById("twofa-email-label");

const userEmail = document.getElementById("user-email");
const userRole = document.getElementById("user-role");
const accessTokenField = document.getElementById("access-token");
const refreshTokenField = document.getElementById("refresh-token");
const output = document.getElementById("output");

const studentPanel = document.getElementById("student-panel");
const adminPanel = document.getElementById("admin-panel");

const btnBackLogin = document.getElementById("btn-back-login");
const btnRefreshToken = document.getElementById("btn-refresh-token");
const btnLogout = document.getElementById("btn-logout");
const btnMiEspacio = document.getElementById("btn-mi-espacio");
const btnDashboardAdmin = document.getElementById("btn-dashboard-admin");

const queryApiBase = new URLSearchParams(window.location.search).get("api");
if (queryApiBase) {
  localStorage.setItem("apiBaseUrl", queryApiBase);
}
const API_BASE_URL =
  queryApiBase || localStorage.getItem("apiBaseUrl") || "http://localhost:3000";

const state = {
  pendingEmail: localStorage.getItem("pendingEmail") || "",
  email: localStorage.getItem("email") || "",
  role: localStorage.getItem("role") || "",
  accessToken: localStorage.getItem("accessToken") || "",
  refreshToken: localStorage.getItem("refreshToken") || "",
};

function persistState() {
  localStorage.setItem("pendingEmail", state.pendingEmail || "");
  localStorage.setItem("email", state.email || "");
  localStorage.setItem("role", state.role || "");
  localStorage.setItem("accessToken", state.accessToken || "");
  localStorage.setItem("refreshToken", state.refreshToken || "");
}

function showResponse(title, payload) {
  output.textContent = `${title}\n${JSON.stringify(payload, null, 2)}`;
}

function setScreen(screenName) {
  screenLogin.hidden = screenName !== "login";
  screen2fa.hidden = screenName !== "2fa";
  screenDashboard.hidden = screenName !== "dashboard";
}

function render2fa() {
  twofaEmailLabel.textContent = state.pendingEmail || "-";
}

function renderDashboard() {
  userEmail.textContent = state.email || "-";
  userRole.textContent = state.role || "-";
  accessTokenField.value = state.accessToken || "";
  refreshTokenField.value = state.refreshToken || "";

  studentPanel.hidden = state.role !== "estudiante";
  adminPanel.hidden = state.role !== "admin";
}

function clearSession() {
  state.pendingEmail = "";
  state.email = "";
  state.role = "";
  state.accessToken = "";
  state.refreshToken = "";
  persistState();
}

async function sendRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data.mensaje || data.message || `Error ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function goToLogin() {
  setScreen("login");
  render2fa();
  renderDashboard();
}

function goTo2fa() {
  render2fa();
  setScreen("2fa");
}

function goToDashboard() {
  renderDashboard();
  setScreen("dashboard");
}

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const body = {
      email: loginEmail.value.trim(),
      password: formLogin.password.value,
    };

    const data = await sendRequest("/login-paso1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    state.pendingEmail = body.email;
    persistState();
    goTo2fa();
    showResponse("Paso 1 correcto", data);
  } catch (error) {
    showResponse("Error paso 1", { mensaje: error.message });
  }
});

form2fa.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const body = {
      email: state.pendingEmail,
      codigo: twofaCode.value.trim(),
    };

    if (!body.email) {
      throw new Error("No hay correo pendiente para validar 2FA.");
    }

    const data = await sendRequest("/login-paso2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    state.email = body.email;
    state.role = data.role || "";
    state.accessToken = data.accessToken || "";
    state.refreshToken = data.refreshToken || "";
    state.pendingEmail = "";

    persistState();
    twofaCode.value = "";
    goToDashboard();
    showResponse("Sesion iniciada", data);
  } catch (error) {
    showResponse("Error paso 2", { mensaje: error.message });
  }
});

btnBackLogin.addEventListener("click", () => {
  state.pendingEmail = "";
  persistState();
  goToLogin();
  showResponse("Volviste a login", { apiBaseUrl: API_BASE_URL });
});

btnRefreshToken.addEventListener("click", async () => {
  try {
    if (!state.refreshToken) {
      throw new Error("No hay refresh token activo.");
    }

    const data = await sendRequest("/refresh-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    });

    state.accessToken = data.accessToken || "";
    persistState();
    renderDashboard();
    showResponse("Access token renovado", data);
  } catch (error) {
    showResponse("Error refresh token", { mensaje: error.message });
  }
});

btnLogout.addEventListener("click", () => {
  clearSession();
  formLogin.reset();
  goToLogin();
  showResponse("Sesion cerrada", { mensaje: "Tokens eliminados." });
});

btnMiEspacio.addEventListener("click", async () => {
  try {
    const data = await sendRequest("/mi-espacio", {
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
      },
    });
    showResponse("Datos estudiante", data);
  } catch (error) {
    showResponse("Error estudiante", { mensaje: error.message });
  }
});

btnDashboardAdmin.addEventListener("click", async () => {
  try {
    const data = await sendRequest("/dashboard-admin", {
      headers: {
        Authorization: `Bearer ${state.accessToken}`,
      },
    });
    showResponse("Datos admin", data);
  } catch (error) {
    showResponse("Error admin", { mensaje: error.message });
  }
});

if (state.accessToken && state.role) {
  goToDashboard();
} else if (state.pendingEmail) {
  goTo2fa();
} else {
  goToLogin();
}

showResponse("Frontend listo", {
  apiBaseUrl: API_BASE_URL,
  flujo: ["login", "2fa", "dashboard"],
});
