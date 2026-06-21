import { createRequire } from "node:module";

import { defineConfig, loadConfig } from "@rsbuild/core";
import type { EnvironmentConfig, RsbuildConfig } from "@rsbuild/core";
import { pluginEslint } from "@rsbuild/plugin-eslint";
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

import config from "./config";

const require = createRequire(import.meta.url);

export default defineConfig(async (): Promise<RsbuildConfig> => {
  const environments: Record<string, EnvironmentConfig> = {};

  for (const pkg of config.packages) {
    const rsbuildConfigs = pkg.json.nextgisweb?.rsbuildConfigs ?? {};

    for (const [name, modFile] of Object.entries(rsbuildConfigs)) {
      const resolved = require.resolve(`${pkg.name}/${modFile}`);
      const { content } = await loadConfig({ path: resolved });

      environments[name] = content;
    }
  }

  // TODO: Add RegExp.escape when available in the Node.js version we target
  const envNames = Object.keys(environments).join("|");
  const noProxyRE = new RegExp(`^/(static/dev/(${envNames})|_rspack)/`);

  return {
    mode: config.debug ? "development" : "production",
    environments,
    server: {
      host: "0.0.0.0",
      port: 25784,
      strictPort: true,
      setup: ({ server }) => {
        // Backend uses random static key and frontend is not aware of it, so we
        // need to rewrite the URL to match the dev asset prefix.
        const rewriteRE = new RegExp(`^/static/(?!dev)[^/]+/(${envNames})/`);
        server.middlewares.use((req, res, next) => {
          if (req.url && rewriteRE.test(req.url)) {
            const newUrl = req.url.replace(rewriteRE, "/static/dev/$1/");
            req.url = newUrl;
          }
          next();
        });

        // Workaround for Firefox: it's confused by the dev server's empty
        // responses on the trigger URL and attempts to parse them as XML.
        const triggerRE = new RegExp(`^/_rspack/lazy/trigger_+[0-9]+`);
        server.middlewares.use((req, res, next) => {
          if (req.url && triggerRE.test(req.url)) {
            res.setHeader("Content-Type", "text/plain");
            res.setHeader("Content-Length", "0");
          }
          next();
        });
      },
      proxy: [
        {
          pathFilter: (path) => !noProxyRE.test(path),
          target: "http://127.0.0.1:8080",
          // Backend needs to see the original host for correct URL generation,
          // so we disable host header change.
          changeOrigin: false,
        },
      ],
    },
    dev: {
      client: {
        protocol: "ws",
        host: "localhost",
        port: 25784,
        path: "/_rspack/rsbuild-hmr",
      },
    },
    plugins: [
      pluginTypeCheck({
        enable: config.debug && config.jsrealm.tscheck,
      }),
      pluginEslint({
        enable: config.debug && config.jsrealm.eslint,
      }),
    ],
  };
});
