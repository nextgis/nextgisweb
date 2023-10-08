const path = require("path");

const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const defaults = require("../jsrealm/webpack/defaults.cjs");

const stylesheetRoot = path.resolve(__dirname, "../../../static");
const filename = stylesheetRoot + "/css/layout.less";

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
                test: /\.(woff2?|ttf|eot)?$/,
                use: [
                    {
                        loader: "file-loader",
                        options: { outputPath: "font", name: "[name].[ext]" },
                    },
                ],
            },
            {
                test: /\.(png|gif|svg)?$/,
                use: [
                    {
                        loader: "file-loader",
                        options: { outputPath: "image", name: "[name].[ext]" },
                    },
                ],
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
