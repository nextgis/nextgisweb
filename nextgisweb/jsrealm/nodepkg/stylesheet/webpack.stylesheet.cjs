const fs = require("fs");
const path = require("path");

const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const { jsrealm } = require("../jsrealm/config.cjs");
const defaults = require("../jsrealm/webpack/defaults.cjs");

const stylesheetRoot = path.resolve(__dirname, "../../../static");
const filename = stylesheetRoot + "/css/layout.less";

const include = jsrealm["stylesheets"].map((fn) => {
    return `@import "${fn}";`;
});

fs.writeFileSync(
    path.join(stylesheetRoot, "css/include.less"),
    include.join("\n")
);

module.exports = defaults("stylesheet", {
    entry: { layout: filename },
    plugins: [new MiniCssExtractPlugin()],
    module: {
        rules: [
            {
                test: filename,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: { publicPath: "./" },
                    },
                    "css-loader",
                    {
                        loader: "less-loader",
                        options: {
                            lessOptions: {
                                rootpath: stylesheetRoot + "/css",
                                globalVars: {
                                    node_modules:
                                        path.resolve("./node_modules"),
                                },
                                javascriptEnabled: true,
                            },
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ["css-loader"],
            },
            {
                test: /\.(woff2?|ttf|eot|png|gif|svg)$/,
                type: "asset/resource",
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [
            new CssMinimizerPlugin({
                minimizerOptions: {
                    preset: [
                        "default",
                        { discardComments: { removeAll: true } },
                    ],
                },
            }),
        ],
    },
});
