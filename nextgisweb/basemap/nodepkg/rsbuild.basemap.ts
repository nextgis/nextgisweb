import { createRequire } from "node:module";
import path from "node:path";

import type { EnvironmentConfig } from "@rsbuild/core";

import config from "@nextgisweb/jsrealm/config";
import {
  commonDev,
  commonDistPath,
  commonOutput,
  commonPerformance,
  createCompressionPlugins,
} from "@nextgisweb/jsrealm/rsbuild.common";

const require = createRequire(import.meta.url);

export default {
  source: {
    entry: {
      "maplibre-worker": {
        import: require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"),
        html: false,
      },
    },
  },
  dev: {
    ...commonDev("basemap"),
    hmr: false,
    liveReload: false,
  },
  output: {
    ...commonOutput,
    target: "web-worker",
    distPath: {
      ...commonDistPath,
      root: path.resolve(config.distPath, "basemap"),
    },
  },
  performance: {
    ...commonPerformance,
    chunkSplit: { strategy: "all-in-one" },
  },
  tools: {
    rspack: {
      plugins: createCompressionPlugins(),
      module: {
        rules: [
          {
            test: /maplibre-gl-worker\.mjs$/,
            // Extension URLs are resolved at runtime, not by the bundler.
            parser: { importDynamic: false },
          },
        ],
      },
    },
  },
} satisfies EnvironmentConfig;
