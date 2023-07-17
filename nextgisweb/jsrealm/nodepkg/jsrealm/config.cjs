const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

const CompressionPlugin = require("compression-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const env = Object.fromEntries(
    Object.entries(process.env)
        .map(([k, v]) => {
            const prefix = "npm_package_config_nextgisweb_";
            if (k.startsWith(prefix)) return [k.slice(prefix.length), v];
            return undefined;
        })
        .filter((v) => v)
);

const configRoot = env.jsrealm_root;

const packages = [];
const externals = [];

const packageJson = JSON.parse(fs.readFileSync(`${configRoot}/package.json`));
for (const wsPath of packageJson.workspaces) {
    const packageJson = JSON.parse(fs.readFileSync(`${wsPath}/package.json`));
    const packageName = packageJson.name;
    packages.push({ name: packageName, path: wsPath, json: packageJson });
    externals.push(...(packageJson?.nextgisweb?.externals || []));
}

const rootPath = path.resolve(configRoot);
const distPath = path.resolve(configRoot + "/dist");
const debug = env.core_debug === "true";
const locales = env.core_locale_available.split(/\s*,\s*/);

const compressRegExp = /\.(js|css|html|json|svg)$/i;
const compressionPlugins = [];

if (!debug || env.pyramid_compression === "true") {
    for (const algo of JSON.parse(env.pyramid_compression_algorithms)) {
        if (algo === "gzip") {
            compressionPlugins.push(
                new CompressionPlugin({
                    test: compressRegExp,
                    algorithm: "gzip",
                    // Use ".gzip" suffix instead of ".gz" to match the
                    // precompressed file name with HTTP encoding name.
                    filename: "[path][base].gzip",
                    threshold: 256,
                    minRatio: 0.9,
                    // Use minimum compression level in development mode
                    // and maximum in production mode.
                    compressionOptions: { level: debug ? 1 : 9 },
                })
            );
        } else if (algo === "br") {
            compressionPlugins.push(
                new CompressionPlugin({
                    test: compressRegExp,
                    algorithm: "brotliCompress",
                    filename: "[path][base].br",
                    threshold: 256,
                    minRatio: 0.9,
                    // Use minimum compression level in development mode
                    // and maximum in production mode.
                    compressionOptions: {
                        params: {
                            [zlib.constants.BROTLI_PARAM_QUALITY]: debug
                                ? 1
                                : 11,
                        },
                    },
                })
            );
        } else {
            throw "Unknown compression algorithm: " + algo;
        }
    }
}

const bundleAnalyzerPlugins =
    !debug || env.jsrealm_bundle_analyzer === "true"
        ? [new BundleAnalyzerPlugin({ analyzerMode: "static" })]
        : [];

module.exports = {
    debug,
    rootPath,
    distPath,
    packages,
    externals,
    locales,
    targets: JSON.parse(env.jsrealm_targets),
    iconSources: JSON.parse(env.jsrealm_icon_sources),
    compressionPlugins,
    bundleAnalyzerPlugins,
};
