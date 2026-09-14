import type { EnvironmentConfig } from "@rsbuild/core";

export default {
  tools: {
    rspack: {
      module: {
        rules: [
          {
            test: /[\\/]maplibre-gl[\\/]dist[\\/]maplibre-gl\.mjs$/,
            // MapLibre resolves worker URLs at runtime; they are not assets.
            parser: { url: false },
          },
        ],
      },
    },
  },
} satisfies EnvironmentConfig;
