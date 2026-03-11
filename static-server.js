const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.FRONTEND_PORT) || 5500;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function resolveFile(urlPath) {
  const rawPath = String(urlPath || "/").split("?")[0].split("#")[0];
  let safePath = path.posix.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, "");
  safePath = safePath.replace(/^[/\\]+/, "");

  if (!safePath || safePath === ".") {
    safePath = "index.html";
  }

  return path.join(ROOT, safePath);
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url || "/");
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Archivo no encontrado.");
        return;
      }

      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Error interno al servir frontend.");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend en http://localhost:${PORT}`);
});
