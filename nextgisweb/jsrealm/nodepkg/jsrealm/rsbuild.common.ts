import type {
  DevConfig,
  DistPathConfig,
  OutputConfig,
  PerformanceConfig,
} from "@rsbuild/core";
import { pluginLess } from "@rsbuild/plugin-less";
import type { PluginLessOptions } from "@rsbuild/plugin-less";
import { CompressionRspackPlugin } from "compression-rspack-plugin";
import type { Plugin } from "postcss";

import config from "./config";

export const commonDev: DevConfig = {
  assetPrefix: "auto",
};

export const commonOutput: OutputConfig = {
  assetPrefix: "auto",
  filenameHash: false,
  sourceMap: true,
};

export const commonDistPath: Omit<DistPathConfig, "root"> = {
  js: "./",
  jsAsync: "./",
  css: "./",
  cssAsync: "./",
  svg: "./",
  font: "./",
  wasm: "./",
  image: "./",
  media: "./",
  assets: "./",
};

export const commonPerformance: PerformanceConfig = {
  printFileSize: {
    compressed: false,
    detail: false,
  },
};

export function createNgwLessPlugin(options?: PluginLessOptions) {
  return pluginLess(options);
}

export function createFontWeightFixPostcssPlugin(): Plugin {
  return {
    postcssPlugin: "ngw-font-weight-fix",

    Declaration(decl) {
      if (decl.prop !== "font-weight") return;

      if (decl.value === "normal" || decl.value === "bold") {
        decl.value = `var(--ngw-text-font-weight-${decl.value})`;
      }
    },
  };
}

export function createCompressionPlugins(): CompressionRspackPlugin[] {
  const plugins: CompressionRspackPlugin[] = [];
  if (config.debug) return [];
  const compressRegExp = /\.(js|css|html|json|svg)$/i;
  for (const [algorithm, extension] of [
    ["gzip", "gzip"],
    ["brotliCompress", "br"],
  ] as const) {
    plugins.push(
      new CompressionRspackPlugin({
        test: compressRegExp,
        algorithm: algorithm,
        filename: `[path][base].${extension}`,
        threshold: 256,
        minRatio: 0.9,
      })
    );
  }
  return plugins;
}
