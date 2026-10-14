import type { EnvironmentConfig } from "@rsbuild/core";

export default {
  tools: {
    rspack: {
      module: {
        rules: [
          {
            test: /[\\/]laz-perf[\\/]lib[\\/]web[\\/]laz-perf\.wasm$/,
            // Giro3D workers load "laz-perf.wasm" from a directory, so the file
            // is emitted as is instead of being compiled as a WebAssembly module.
            type: "asset/resource",
            generator: { filename: "point-cloud/laz-perf.wasm" },
          },
        ],
      },
    },
  },
} satisfies EnvironmentConfig;
