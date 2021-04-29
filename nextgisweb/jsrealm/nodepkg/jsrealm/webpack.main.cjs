const config = require('@nextgisweb/jsrealm/config.cjs');

const path = require('path');
const fs = require('fs');
const glob = require('glob');

const WebpackAssetsManifest = require('webpack-assets-manifest');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const entryList = {};
const resolveAliases = {};


function scanForEntries(pkg) {
    const result = [];
    for (const candidate of glob.sync('**/*.{js,ts}', {
        cwd: pkg.path,
        ignore: [
            'node_modules/**',
            'contrib/**',
        ]
    })) {
        // TODO: Read only first line of the file!
        const content = fs.readFileSync(
            pkg.path + '/' + candidate,
            { encoding: 'utf-8' }
        );

        const match = /^\/\*\s*(.*?)\s*\*\//.exec(content);
        if (match !== null) {
            let head;
            eval('head = { ' + match[1] + '}');
            if (head.entry) {
                result.push(candidate);
            }
        }
    }
    return result;
}


for (const pkg of config.packages()) {
    const entries = (pkg.json.nextgisweb || {}).entrypoints || scanForEntries(pkg);
    for (const ep of entries) {
        const epName = pkg.name + '/' + ep.replace(/(?:\/index)?\.(js|ts)$/, '');
        const epSource = pkg.name + '/' + ep;
        entryList[epName] = require.resolve(epSource);

        // Aliases can be useful for importing without extension, but ESM modules
        // require an extension to be specified. So we don't use this feature:
        // resolveAliases[epName + '$'] = epSource;
    }
}


module.exports = {
    mode: config.debug ? 'development' : 'production',
    devtool: config.debug ? 'source-map' : false,
    entry: entryList,
    resolve: { alias: resolveAliases },
    target: ['web', 'es5'],
    module: {
        rules: [
            {
                test: /\.(m?js|ts?)$/,
                exclude: [
                    /node_modules\/core-js/
                ],
                resolve: { fullySpecified: false },
                use: {
                    loader: "babel-loader",
                    options: {
                        sourceType: 'unambiguous',
                        presets: [
                            ["@babel/preset-typescript", {}],
                            ["@babel/preset-env", {
                                // debug: config.debug,
                                corejs: { "version": 3 },
                                useBuiltIns: "usage",
                                targets: {
                                    "firefox": "78",
                                    "chrome": "87",
                                    "edge": "88",
                                    "safari": "13",
                                    "ie": "11"
                                }
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-transform-runtime'
                        ]
                    }
                }
            },
            {
                test: /\.css$/i,
                use: [
                    "style-loader",
                    "css-loader"
                ]
            }
        ]
    },
    plugins: [
        new WebpackAssetsManifest({ entrypoints: true }),
        new CleanWebpackPlugin(),
        new BundleAnalyzerPlugin({ analyzerMode: 'static' })
    ],
    output: {
        filename: (pathData) => (
            pathData.chunk.name !== undefined ?
                '[name].js' : 'chunk/[name].js'
        ),
        chunkFilename: 'chunk/[id].js',
        libraryTarget: 'amd',
        path: path.resolve(config.rootPath, 'dist/main')
    },
    externals: [
        function ({ context, request }, callback) {
            // Temporary solution for loaderers
            if (
                request.startsWith('@nextgisweb/jsrealm/api/load!') ||
                request.startsWith('@nextgisweb/jsrealm/i18n!')
            ) {
                return callback(null, `amd ${request}`);
            }

            // External nextgisweb AMD module from package
            for (const ext of config.externals) {
                if (request.startsWith(ext + '/')) {
                    return callback(null, `amd ${request}`);
                }
            }
            callback();
        }
    ],
    optimization: {
        splitChunks: {
            // Generate as many chunks as possible
            chunks: 'all',
            minSize: 0
        },
    },
};