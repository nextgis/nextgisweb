import type {
  DistPathConfig,
  OutputConfig,
  PerformanceConfig,
} from "@rsbuild/core";
import { pluginLess } from "@rsbuild/plugin-less";
import type { PluginLessOptions } from "@rsbuild/plugin-less";
import type { Plugin } from "postcss";

export const commonDev = {
  assetPrefix: "auto",
} as const;

export const commonOutput: OutputConfig = {
  assetPrefix: "auto",
  filenameHash: false,
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
