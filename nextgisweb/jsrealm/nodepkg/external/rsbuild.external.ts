import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rspack } from "@rsbuild/core";
import type { EnvironmentConfig } from "@rsbuild/core";

import {
  commonDev,
  commonDistPath,
  commonPerformance,
} from "@nextgisweb/jsrealm/rsbuild.common";

import config from "../jsrealm/config";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mochaRoot = path.dirname(require.resolve("mocha/package.json"));

function minifyCopiedAsset(
  content: Buffer,
  filename: string
): Buffer | string | Promise<string> {
  if (config.debug || /\.min\./.test(filename)) {
    return content;
  }

  if (filename.endsWith(".js")) {
    return rspack.experiments.swc
      .minify(content.toString(), {
        compress: false,
        mangle: true,
        format: {
          comments: false,
        },
      })
      .then((result) => result.code);
  }

  return content;
}

export default {
  source: {
    entry: {
      external: {
        import: path.resolve(__dirname, "empty.js"),
        html: false,
      },
    },
  },

  dev: commonDev("external"),

  output: {
    copy: [
      {
        context: mochaRoot,
        from: "mocha.*",
        to: "mocha",
        transform: minifyCopiedAsset,
      },
    ],

    distPath: {
      ...commonDistPath,
      root: path.resolve(config.distPath, "external"),
    },

    filenameHash: false,
    minify: false,
  },

  performance: {
    ...commonPerformance,
  },

  tools: {
    htmlPlugin: false,
  },
} satisfies EnvironmentConfig;
