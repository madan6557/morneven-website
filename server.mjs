import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 8080);
const distDir = resolve("dist");
const indexPath = join(distDir, "index.html");

if (!existsSync(indexPath)) {
  console.error(`Missing build output: ${indexPath}`);
  console.error("Run npm run build before starting the Railway web server.");
  process.exit(1);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(response, filePath) {
  const extension = extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(response);
}

function resolvePublicPath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const candidate = normalize(join(distDir, decodedPath));

  if (!candidate.startsWith(distDir + sep) && candidate !== distDir) {
    return null;
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  return indexPath;
}

createServer((request, response) => {
  if (request.url === "/health" || request.url === "/ready") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  const filePath = resolvePublicPath(request.url || "/");
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  if (request.method === "HEAD") {
    response.writeHead(200);
    response.end();
    return;
  }

  sendFile(response, filePath);
})
  .on("error", (error) => {
    console.error("Morneven frontend server failed to start", error);
    process.exit(1);
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Morneven frontend listening on 0.0.0.0:${port}`);
    console.log(`Serving static files from ${distDir}`);
  });
