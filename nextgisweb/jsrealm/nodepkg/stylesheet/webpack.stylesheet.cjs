const path = require("path");
const os = require("os");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const config = require("@nextgisweb/jsrealm/config.cjs");

const stylesheetRoot = path.resolve(__dirname, "../../../static");
const filename = stylesheetRoot + "/css/layout.less";

module.exports = {
    mode: config.debug ? "development" : "production",
    devtool: config.debug ? "source-map" : false,
    entry: {
        layout: filename,
    },
    output: {
        path: path.resolve(config.distPath + "/stylesheet"),
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin(),
        ...config.compressionPlugins,
    ],
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
                                    node_modules: path.resolve(
                                        "./node_modules"
                                    ),
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
                        {
                            discardComments: { removeAll: true },
                        },
                    ],
                },
            }),
        ],
    },
    watchOptions: {
        poll: os.release().match(/-WSL.?$/) ? 1000 : false,
        ignored: "**/node_modules",
    },
};
