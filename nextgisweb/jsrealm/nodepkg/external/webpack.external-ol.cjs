const path = require("path");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const config = require("@nextgisweb/jsrealm/config.cjs");

const entry = path.resolve(path.join(__dirname, "contrib/ol/entry.js"));
const index = path.resolve(path.join(__dirname, "contrib/ol/index.js"));

// Exclude large modules from explicit including into the bundle. But they still can 
// be implicit included by other modules.
const EXCLUDE = [
    "ol/format/EsriJSON",
    "ol/format/GML",
    "ol/format/GML2",
    "ol/format/GML3",
    "ol/format/GML32",
    "ol/format/GMLBase",
    "ol/format/GPX",
    "ol/format/IGC",
    "ol/format/IIIFInfo",
    "ol/format/KML",
    "ol/format/OSMXML",
    "ol/format/OWS",
    "ol/format/TopoJSON",
    "ol/format/WFS",
    "ol/format/WMSCapabilities",
    "ol/format/WMSGetFeatureInfo",
    "ol/format/WMTSCapabilities",
    "ol/format/XMLFeature",
    "ol/layer/Graticule",
    "ol/layer/Heatmap",
    "ol/layer/MapboxVector",
    "ol/source/BingMaps",
    "ol/source/CartoDB",
    "ol/source/Cluster",
    "ol/source/GeoTIFF",
    "ol/source/IIIF",
    "ol/source/ImageArcGISRest",
    "ol/source/ImageMapGuide",
    "ol/source/Raster",
    "ol/source/Stamen",
    "ol/source/TileArcGISRest",
    "ol/source/TileImage",
    "ol/source/TileJSON",
    "ol/source/TileWMS",
    "ol/source/UTFGrid",
    "ol/source/WMTS",
];

const reDefault = /import ([\w$]+) from ['"](.*)\.js['"]/i;
const reNamed = /import {\s*\w+ as ([\w$]+)\s*} from ['"](.*)\.js['"]/i;

function importReplace(match) {
    let varname, modname;
    const md = reDefault.exec(match);

    if (md) {
        varname = md[1];
        modname = md[2];
    } else {
        const md = reNamed.exec(match);
        if (md) {
            varname = md[1];
            modname = md[2];
        } else {
            return match;
        }
    }

    for (const m of EXCLUDE) {
        if (modname == m || modname.startsWith(m + "/")) {
            return `const ${varname} = undefined;`;
        }
    }

    return match;
}

module.exports = {
    entry: entry,
    devtool: "source-map",
    mode: config.debug ? "development" : "production",
    target: ["web", "es5"],
    module: {
        rules: [
            {
                test: index,
                loader: "string-replace-loader",
                options: {
                    multiple: [
                        {
                            // Replace relative imports with absolute
                            search: /^(import .*)['"]\.\/(.*)['"];$/gim,
                            replace: '$1"$2";',
                        },
                        {
                            // Fix missing imports and remove unused
                            search: /^import .*$/gim,
                            replace: importReplace,
                        }
                    ],
                },
            },
            {
                test: /\.js$/,
                loader: "babel-loader",
                options: {
                    sourceType: "unambiguous",
                    presets: [
                        [
                            "@babel/preset-env",
                            {
                                targets: {
                                    firefox: "78",
                                    chrome: "87",
                                    edge: "88",
                                    safari: "13",
                                    ie: "11",
                                },
                            },
                        ],
                    ],
                },
        },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                {
                    from: require.resolve("ol/ol.css"),
                    to: "ol.css",
                },
            ],
        }),
        new BundleAnalyzerPlugin({ analyzerMode: "static" }),
    ],
    output: {
        path: path.resolve(config.distPath + "/external-ol"),
        publicPath: "",
        filename: "ol.js",
        library: "ol",
        libraryTarget: "umd",
        libraryExport: "default",
    },
};
