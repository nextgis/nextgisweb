const config = require('@nextgisweb/jsrealm/config.cjs');

const path = require('path');
const fs = require('fs');
const glob = require('glob');

const WebpackAssetsManifest = require('webpack-assets-manifest');
const CopyPlugin = require('copy-webpack-plugin');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');


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

const entryList = {};
const entryRules = [];

for (const pkg of config.packages()) {
    const entries = (pkg.json.nextgisweb || {}).entrypoints || scanForEntries(pkg);
    for (const ep of entries) {
        const epName = pkg.name + '/' + ep.replace(/(?:\/index)?\.(js|ts)$/, '');
        const fullname = require.resolve(pkg.name + '/' + ep);

        entryList[epName] = fullname;

        // This rule injects the following construction into each entry module
        // at webpack compilation time:
        //
        //     import 'with-chunks!some-entry-name';
        //
        // The import is handled by AMD require loader and loads all chunks
        // required by the entry.

        entryRules.push({
            test: fullname,
            exclude: /node_modules/,
            use: {
                loader: 'imports-loader',
                options: { imports: ['side-effects with-chunks!' + epName] }
            }
        })
    }
}


module.exports = {
    mode: config.debug ? 'development' : 'production',
    devtool: config.debug ? 'source-map' : false,
    entry: entryList,
    target: ['web', 'es5'],
    module: {
        rules: entryRules.concat([
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
        ])
    },
    plugins: [
        new WebpackAssetsManifest({ entrypoints: true }),
        new CopyPlugin({
            // Copy with-chunks!some-entry-name loader directly to the dist
            // directly. It is written in ES5-compatible way as AMD moduleand
            // mustn't be processed by webpack runtime loader.
            patterns: [{
                from: require.resolve('./with-chunks.js'),
                to: '@nextgisweb/jsrealm/'
            }]
        }),
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
            // Use AMD require loader for with-chunks!some-entry-name imports.
            if (request.startsWith('with-chunks!')) {
                return callback(null, `amd ${request}`);
            }

            // Temporary solution for loaderers.
            if (
                request.startsWith('@nextgisweb/jsrealm/api/load!') ||
                request.startsWith('@nextgisweb/jsrealm/i18n!')
            ) {
                return callback(null, `amd ${request}`);
            }

            for (const ext of config.externals) {
                if (request.startsWith(ext + '/')) {
                    return callback(null, `amd ${request}`);
                }
            }
            callback();
        }
    ],
    optimization: {
        runtimeChunk: { name: 'chunk/runtime' },
        splitChunks: {
            // Generate as many chunks as possible
            chunks: 'all',
            minSize: 0
        },
    },
};