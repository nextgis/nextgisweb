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

  return {
    mode: config.debug ? "development" : "production",
    environments,
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      cors: true,
    },
    dev: {
      client: {
        protocol: "ws",
        host: "localhost",
        port: 3000,
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
