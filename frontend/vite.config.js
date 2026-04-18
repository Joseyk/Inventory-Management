import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig(({ command }) => {
  // 🔑 Check if we are running on Render
  const isRender = process.env.RENDER === "true";

  let httpsOptions = false;
  let host = "172.16.104.223"; // Your local office IP

  // 🔑 Only try to read certificates if NOT on Render
  if (!isRender) {
    try {
      const keyPath = path.resolve(__dirname, "..", "cert.key");
      const certPath = path.resolve(__dirname, "..", "cert.crt");
      httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    } catch (err) {
      console.warn(
        "SSL certificates not found, falling back to HTTP for local dev.",
      );
    }
  } else {
    // On Render, we don't bind to a specific IP, we use '0.0.0.0' or default
    host = "0.0.0.0";
  }

  return {
    plugins: [react()],
    publicDir: "public",
    server: {
      host: host,
      port: 5009,
      https: httpsOptions,
      cors: true,
    },
    preview: {
      host: host,
      port: 5009,
      https: httpsOptions,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
    },
  };
});
