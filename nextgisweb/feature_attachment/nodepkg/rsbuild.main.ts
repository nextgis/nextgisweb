import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { EnvironmentConfig } from "@rsbuild/core";

const require = createRequire(import.meta.url);

function packageRoot(file: string) {
  let dir = path.dirname(file);
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    dir = path.dirname(dir);
  }
  return dir;
}

// Photo Sphere Viewer plugins import "three" without declaring it as a
// dependency, so with hoisted node_modules they may get a three.js version
// different from the core one. Resolve it the same way as the core does.
const psvCore = require.resolve("@photo-sphere-viewer/core");
const psvThree = packageRoot(createRequire(psvCore).resolve("three"));

export default {
  tools: {
    rspack: {
      module: {
        rules: [
          {
            test: /[\\/]@photo-sphere-viewer[\\/][^\\/]+-plugin[\\/]/,
            resolve: { alias: { three: psvThree } },
          },
        ],
      },
    },
  },
} satisfies EnvironmentConfig;
