const config = require('@nextgisweb/jsrealm/config.cjs');

const path = require('path');
const fs = require('fs');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const stylesheetRoot = path.resolve(__dirname, '../../../static');

module.exports = {
    mode: config.debug ? 'development' : 'production',
    devtool: config.debug ? 'source-map' : false,
    entry: {
        'layout': stylesheetRoot + '/css/layout.less',
        'default': stylesheetRoot + '/css/default.css',
        'pure': require.resolve('purecss/build/pure.css')
    },
    output: {
        path: path.resolve(config.distPath + '/stylesheet')
    },
    plugins: [
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin()
    ],
    module: {
        rules: [
            {
                test: /\.less$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: { publicPath: './' }
                    },
                    "css-loader",
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                rootpath: stylesheetRoot + '/css',
                                globalVars: {
                                    node_modules: path.resolve('./node_modules')
                                },
                                javascriptEnabled: true,
                            }
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"]
            },
            {
                test: /\.(woff2?|ttf|eot)?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: { outputPath: 'font', name: '[name].[ext]' }
                    }
                ]
            },
            {
                test: (fp) => fp.startsWith(stylesheetRoot + '/svg/'),
                use: [
                    {
                        loader: 'file-loader',
                        options: { outputPath: 'svg', name: '[name].[ext]' }
                    }
                ]
            }
        ]
    }
};