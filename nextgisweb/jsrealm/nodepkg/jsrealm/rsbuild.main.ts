import { createRequire } from "node:module";
import path from "node:path";

import type { TransformOptions } from "@babel/core";
import type { EnvironmentConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

import config from "./config";
import { registryReplacementPlugin, sharedIconIds } from "./prepare";
import {
  commonDev,
  commonDistPath,
  commonOutput,
  commonPerformance,
  createCompressionPlugins,
  createFontWeightFixPostcssPlugin,
  createNgwLessPlugin,
} from "./rsbuild.common";

export const isDevServer = process.argv.includes("dev");
const require = createRequire(import.meta.url);

const babelOptions = config.debug
  ? undefined
  : (require("./babelrc.cjs") as TransformOptions);

const iconUtil = require("./icon/util.cjs") as {
  symbolId: (filename: string) => string | undefined;
};

const babelLoaders = babelOptions
  ? [{ loader: "babel-loader", options: babelOptions }]
  : [];

function svgSymbolId(filename: string): string {
  return (
    sharedIconIds[filename] ||
    iconUtil.symbolId(filename) ||
    `icon-${path.basename(filename, ".svg")}`
  );
}

export default {
  plugins: [
    ...(isDevServer ? [pluginReact({ splitChunks: false })] : []),
    createNgwLessPlugin(),
  ],

  source: {
    entry: {
      ngwEntry: {
        import: require.resolve("@nextgisweb/jsrealm/ngwEntry.js"),
        html: false,
      },
    },
  },

  dev: commonDev("main"),

  output: {
    ...commonOutput,

    distPath: {
      ...commonDistPath,
      root: path.resolve(config.distPath, "main"),
    },
  },

  performance: {
    ...commonPerformance,
  },

  tools: {
    postcss(_postcssOptions, { addPlugins }) {
      addPlugins(createFontWeightFixPostcssPlugin());
    },

    swc(swcOptions) {
      swcOptions.jsc ??= {};
      swcOptions.jsc.transform ??= {};
      swcOptions.jsc.transform.react = {
        ...swcOptions.jsc.transform.react,
        runtime: "automatic",
        importSource: "react",
      };
    },

    rspack(rspackConfig, { appendRules, appendPlugins }) {
      appendRules([
        {
          test: /\.(m?js|tsx?)$/,
          exclude: config.debug
            ? /node_modules/
            : /node_modules\/(core-js|react|react-dom)|\.min\.js$/,
          resolve: { fullySpecified: false },
          use: [
            ...babelLoaders,
            require.resolve("./module-info-loader.cjs"),
            require.resolve("./icon-loader.cjs"),
          ],
        },

        {
          test: /\.svg$/i,
          type: "javascript/auto",
          use: [
            ...babelLoaders,
            require.resolve("./svg-icon-loader.cjs"),
            {
              loader: "rspack-plugin-svg-sprite/loader",
              options: {
                symbolId: svgSymbolId,
              },
            },
            "svgo-loader",
          ],
        },

        {
          test: /\.po$/,
          use: [...babelLoaders, require.resolve("./i18n/loader.cjs")],
        },
      ]);

      appendPlugins([registryReplacementPlugin, ...createCompressionPlugins()]);

      rspackConfig.resolve = {
        ...rspackConfig.resolve,
        extensions: [".tsx", ".ts", "..."],
      };

      rspackConfig.optimization = isDevServer
        ? {
            ...rspackConfig.optimization,
            runtimeChunk: false,
            splitChunks: false,
          }
        : {
            ...rspackConfig.optimization,
            splitChunks: {
              chunks: "all",
              minSize: 0,
            },
          };

      return rspackConfig;
    },
  },
} satisfies EnvironmentConfig;
