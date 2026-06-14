import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { EnvironmentConfig } from "@rsbuild/core";

import config from "../jsrealm/config";
import {
  commonDistPath,
  commonOutput,
  commonPerformance,
  createNgwLessPlugin,
} from "../jsrealm/rsbuild.common";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stylesheetRoot = path.resolve(__dirname, "../../../static");
const filename = path.join(stylesheetRoot, "css/layout.less");
const nodeModules = path.resolve("./node_modules").replaceAll("\\", "/");

export default {
  plugins: [
    createNgwLessPlugin({
      lessLoaderOptions: {
        lessOptions: {
          globalVars: {
            node_modules: nodeModules,
          },
          javascriptEnabled: true,
        },
      },
    }),
  ],

  source: {
    entry: {
      layout: {
        import: filename,
        html: false,
      },
    },
  },

  output: {
    ...commonOutput,

    distPath: {
      ...commonDistPath,
      root: path.resolve(config.distPath, "stylesheet"),
    },

    filename: {
      js: "[name].js",
      css: "[name].css",
    },

    minify: true,
  },

  performance: {
    ...commonPerformance,
  },

  tools: {
    cssExtract: {
      pluginOptions: {
        filename: "[name].css",
        chunkFilename: "[name].css",
      },
      loaderOptions: {
        publicPath: "./",
      },
    },

    htmlPlugin: false,

    rspack(rspackConfig, { appendRules }) {
      const include = config.jsrealm.stylesheets.map((fn) => {
        return `@import "${fn}";`;
      });

      fs.writeFileSync(
        path.join(stylesheetRoot, "css/include.less"),
        include.join("\n")
      );

      appendRules([
        {
          test: /\.(woff2?|ttf|eot|png|gif|svg)$/i,
          type: "asset/resource",
        },
      ]);

      return rspackConfig;
    },
  },
} satisfies EnvironmentConfig;
