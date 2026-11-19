import { createRequire } from "node:module";
import path from "node:path";

import { rspack } from "@rsbuild/core";
import type { EnvironmentConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";

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
  isDevServer,
} from "./rsbuild.common";

const require = createRequire(import.meta.url);

const iconUtil = require("./icon/util.cjs") as {
  symbolId: (filename: string) => string | undefined;
};

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
    pluginTypeCheck({
      enable: config.debug && config.jsrealm.tscheck,
      tsCheckerOptions: {
        async: true,
        issue: {
          defaultSeverity: "warning",
        },
        devServer: false,
      },
    }),
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

    minify: {
      jsOptions: {
        minimizerOptions: {
          compress: { keep_classnames: true },
          mangle: { keep_classnames: true },
        },
      },
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
      swcOptions.jsc.keepClassNames = true;
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
            require.resolve("./module-info-loader.cjs"),
            require.resolve("./icon-loader.cjs"),
          ],
        },

        {
          test: /\.svg$/i,
          type: "javascript/auto",
          use: [
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
          use: [require.resolve("./i18n/loader.cjs")],
        },
      ]);

      appendPlugins([
        registryReplacementPlugin,
        ...(isDevServer
          ? []
          : [new rspack.experiments.CssChunkingPlugin({ strict: true })]),
        ...createCompressionPlugins(),
      ]);

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
              chunks: "async",
              minSize: 0,
            },
          };

      return rspackConfig;
    },
  },
} satisfies EnvironmentConfig;
