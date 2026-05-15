import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { componentTagger } from "lovable-tagger";

function readPackageVersion() {
  try {
    const raw = readFileSync(path.resolve(__dirname, "package.json"), "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function runtimeMetadataPlugin(mode: string) {
  return {
    name: "morneven-runtime-metadata",
    apply: "build" as const,
    writeBundle(options: { dir?: string }) {
      const outDir = path.resolve(options.dir ?? "dist");
      mkdirSync(outDir, { recursive: true });

      const version = readPackageVersion();
      const commitSha =
        process.env.BUILD_COMMIT_SHA ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.RAILWAY_GIT_COMMIT_SHA ??
        process.env.GITHUB_SHA ??
        null;
      const generatedAt = new Date().toISOString();

      const writeJson = (name: string, payload: Record<string, unknown>) => {
        writeFileSync(path.join(outDir, name), `${JSON.stringify(payload, null, 2)}\n`);
      };

      writeJson("health", { ok: true, service: "morneven-website", env: mode, generatedAt });
      writeJson("ready", { ok: true, service: "morneven-website", env: mode, generatedAt });
      writeJson("version", {
        service: "morneven-website",
        version,
        buildVersion: process.env.BUILD_VERSION ?? version,
        commitSha,
        commit: commitSha,
        env: mode,
        generatedAt,
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), runtimeMetadataPlugin(mode)].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // Single-bundle output avoids environments that aggressively cap file requests.
        inlineDynamicImports: true,
      },
    },
  },
}));
