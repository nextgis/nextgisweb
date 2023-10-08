const path = require("path");
const webpack = require("webpack");
const { bundler, styles } = require("@ckeditor/ckeditor5-dev-utils");
const { CKEditorTranslationsPlugin } = require("@ckeditor/ckeditor5-dev-translations");
const TerserPlugin = require("terser-webpack-plugin");

const defaults = require("../jsrealm/webpack/defaults.cjs");

module.exports = defaults(
    "ckeditor",
    {
        entry: path.resolve(__dirname, "bundle.js"),

        output: {
            library: "CKEditor",
            filename: "bundle.js",
            libraryTarget: "umd",
            libraryExport: "default",
        },

        optimization: {
            minimizer: [
                new TerserPlugin({
                    sourceMap: true,
                    terserOptions: {
                        output: {
                            // Preserve CKEditor 5 license comments.
                            comments: /^!/,
                        },
                    },
                    extractComments: false,
                }),
            ],
        },

        module: {
            rules: [
                {
                    test: /\.svg$/,
                    use: ["raw-loader"],
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: "style-loader",
                            options: {
                                injectType: "singletonStyleTag",
                                attributes: {
                                    "data-cke": true,
                                },
                            },
                        },
                        {
                            loader: "css-loader",
                        },
                        {
                            loader: "postcss-loader",
                            options: {
                                postcssOptions: styles.getPostCssConfig({
                                    themeImporter: {
                                        themePath: require.resolve(
                                            "@ckeditor/ckeditor5-theme-lark"
                                        ),
                                    },
                                    minify: true,
                                }),
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new CKEditorTranslationsPlugin({
                language: "en",
                additionalLanguages: "all",
            }),
            new webpack.BannerPlugin({
                banner: bundler.getLicenseBanner(),
                raw: true,
            }),
        ],
    },
    { once: true }
);
