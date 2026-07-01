import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 8080);
const distDir = resolve("dist");
const indexPath = join(distDir, "index.html");
const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));
const frontendVersion = {
  service: "morneven-website",
  version: packageJson.version || "unknown",
  buildVersion: process.env.BUILD_VERSION || packageJson.version || "unknown",
  commitSha: process.env.BUILD_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
  env: process.env.NODE_ENV || "production",
  startedAt: new Date().toISOString(),
};

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

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' data: blob: https: http:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:* ws: wss:",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
].join("; ");

const securityHeaders = {
  "Content-Security-Policy": contentSecurityPolicy,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=()",
};

function fileHeaders(filePath) {
  const extension = extname(filePath).toLowerCase();
  return {
    ...securityHeaders,
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  };
}

function sendFile(response, filePath) {
  response.writeHead(200, fileHeaders(filePath));
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
    response.writeHead(200, { ...securityHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true, env: frontendVersion.env }));
    return;
  }

  if (request.url === "/version") {
    response.writeHead(200, { ...securityHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(frontendVersion));
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  const filePath = resolvePublicPath(request.url || "/");
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  if (request.method === "HEAD") {
    response.writeHead(200, fileHeaders(filePath));
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
