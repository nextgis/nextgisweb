const { constants: zlibConst } = require("zlib");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { StatsWriterPlugin } = require("webpack-stats-plugin");

const { debug, pyramid } = require("../config.cjs");

module.exports = ({ once, clean, compress, bundleAnalyzer } = {}) => {
    const result = [];
    const add = (plugin) => result.push(plugin);

    clean !== false && add(new CleanWebpackPlugin());

    if (compress || (!debug && compress !== false)) {
        const compressRegExp = /\.(js|css|html|hbs|json|svg)$/i;

        pyramid.compression.gzip &&
            add(
                new CompressionPlugin({
                    test: compressRegExp,
                    algorithm: "gzip",
                    // Use ".gzip" suffix instead of ".gz" to match the
                    // precompressed file name with HTTP encoding name.
                    filename: "[path][base].gzip",
                    threshold: 256,
                    minRatio: 0.9,
                    // Use minimum for development mode and maximum otherwise
                    compressionOptions: { level: debug ? 1 : 9 },
                })
            );

        pyramid.compression.br &&
            add(
                new CompressionPlugin({
                    test: compressRegExp,
                    algorithm: "brotliCompress",
                    filename: "[path][base].br",
                    threshold: 256,
                    minRatio: 0.9,
                    // Use minimum for development mode and maximum otherwise
                    compressionOptions: {
                        params: {
                            [zlibConst.BROTLI_PARAM_QUALITY]: debug ? 1 : 11,
                        },
                    },
                })
            );
    }

    (bundleAnalyzer || (!debug && bundleAnalyzer !== false)) &&
        add(new BundleAnalyzerPlugin({ analyzerMode: "static" }));

    if (once) {
        // Enable only for permanent builds, as it's slow
        add(
            new StatsWriterPlugin({
                filename: "webpack-stats.json",
                fields: ["errorsCount"],
            })
        );
    }

    return result;
};
