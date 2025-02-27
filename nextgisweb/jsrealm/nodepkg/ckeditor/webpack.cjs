const fs = require("fs");
const path = require("path");

const ckeTranslations = require("@ckeditor/ckeditor5-dev-translations");
const { bundler, styles } = require("@ckeditor/ckeditor5-dev-utils");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const { DefinePlugin } = require("webpack");

const config = require("../jsrealm/config.cjs");
const defaults = require("../jsrealm/webpack/defaults.cjs");

function pkgPath(pkg, pth) {
    const base = require.resolve(pkg + "/package.json");
    return path.resolve(base, "..", pth);
}

module.exports = defaults(
    "ckeditor",
    () => {
        const transPath = pkgPath(
            "@ckeditor/ckeditor5-core",
            "dist/translations"
        );

        const languages = { found: [], missing: [] };
        for (const { code: lang } of config.i18n.languages) {
            if (fs.existsSync(path.resolve(transPath, `${lang}.js`))) {
                languages.found.push(lang);
            } else {
                languages.missing.push(lang);
            }
        }

        if (languages.missing.length > 0) {
            const msg = languages.missing.join(", ");
            console.log(`CKEditor translations missing: ${msg}`);
        }

        return {
            entry: path.resolve(__dirname, "bundle.js"),

            output: {
                library: "ckeditor",
                filename: "index.js",
                libraryTarget: "amd",
                libraryExport: "default",
                amdContainer: "ngwExternal",
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
                new ckeTranslations.CKEditorTranslationsPlugin({
                    language: "en",
                    additionalLanguages: languages.found,
                    outputDirectory: ".",
                }),
                new DefinePlugin({
                    AVAILABLE_LANGUAGES: JSON.stringify(languages.found),
                }),
                new webpack.BannerPlugin({
                    banner: bundler.getLicenseBanner(),
                    raw: true,
                }),
            ],
        };
    },
    { once: true }
);
