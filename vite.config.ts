import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function personImageUploadPlugin(): Plugin {
  const handleUploadMiddleware = (
    rawReq: unknown,
    rawRes: unknown,
    next: () => void,
  ) => {
    const req = rawReq as {
      method?: string;
      url?: string;
      on: (event: string, listener: (chunk?: unknown) => void) => void;
    };
    const res = rawRes as {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body?: string) => void;
    };
    if (req.url !== "/api/upload-person-image" || req.method !== "POST") {
      next();
      return;
    }

    let rawBody = "";
    req.on("data", (chunk) => {
      rawBody += String(chunk ?? "");
    });
    req.on("end", () => {
      void (async () => {
        try {
          const payload = JSON.parse(rawBody) as {
            personId?: string;
            profileDataUrl?: string;
            iconDataUrl?: string;
          };
          const safeId = (payload.personId ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
          if (!safeId || !payload.profileDataUrl || !payload.iconDataUrl) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing personId or image data." }));
            return;
          }

          const fsSpecifier = "node:fs/promises";
          const pathSpecifier = "node:path";
          const bufferSpecifier = "node:buffer";
          const fsModule = (await import(/* @vite-ignore */ fsSpecifier)) as {
            mkdir: (p: string, opts: { recursive: boolean }) => Promise<void>;
            writeFile: (p: string, data: Uint8Array) => Promise<void>;
          };
          const pathModule = (await import(/* @vite-ignore */ pathSpecifier)) as {
            resolve: (...segments: string[]) => string;
          };
          const bufferModule = (await import(/* @vite-ignore */ bufferSpecifier)) as {
            Buffer: { from: (data: string, encoding: string) => Uint8Array };
          };

          const stripDataUrl = (dataUrl: string) =>
            dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

          const personsDir = pathModule.resolve("src", "images", "persons");
          await fsModule.mkdir(personsDir, { recursive: true });

          const profileFilename = `${safeId}.jpg`;
          const iconFilename = `${safeId}-icon.jpg`;

          await fsModule.writeFile(
            pathModule.resolve(personsDir, profileFilename),
            bufferModule.Buffer.from(stripDataUrl(payload.profileDataUrl), "base64"),
          );
          await fsModule.writeFile(
            pathModule.resolve(personsDir, iconFilename),
            bufferModule.Buffer.from(stripDataUrl(payload.iconDataUrl), "base64"),
          );

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              profilePath: `src/images/persons/${profileFilename}`,
              iconPath: `src/images/persons/${iconFilename}`,
            }),
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Could not write images.",
            }),
          );
        }
      })();
    });
  };

  return {
    name: "person-image-upload-plugin",
    configureServer(server) {
      server.watcher.unwatch("**/src/images/persons/**");
      server.middlewares.use(handleUploadMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleUploadMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), personImageUploadPlugin()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase/")) return "supabase";
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
      },
    },
  },
});
