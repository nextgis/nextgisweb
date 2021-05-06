const path = require("path");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const config = require("@nextgisweb/jsrealm/config.cjs");

const entry = path.resolve(path.join(__dirname, "contrib/ol/entry.js"));
const index = path.resolve(path.join(__dirname, "contrib/ol/index.js"));

// Imports of these modules cause webpack warnings because of missing default.
// Let's filter them out. It's not required for openlayers higher than 6.5.0.
const INVALID = [
    "ol/color",
    "ol/css",
    "ol/events",
    "ol/extent",
    "ol/has",
    "ol/math",
    "ol/net",
    "ol/obj",
    "ol/reproj",
    "ol/resolutionconstraint",
    "ol/sphere",
    "ol/tilegrid",
    "ol/transform",
    "ol/util",
    "ol/webgl",
    "ol/xml",
    "ol/worker/version",
    "ol/worker/webgl",
    "ol/webgl/ShaderBuilder",
    "ol/tilegrid/common",
    "ol/style/LiteralStyle",
    "ol/style/expressions",
    "ol/source/common",
    "ol/reproj/common",
    "ol/renderer/vector",
    "ol/render/canvas",
    "ol/proj/epsg3857",
    "ol/proj/epsg4326",
    "ol/geom/flat/closest",
    "ol/geom/flat/geodesic",
    "ol/format/XLink",
    "ol/events/condition",
];

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
        if (INVALID.indexOf(modname) >= 0) {
            return `const ${varname} = undefined;`;
        }
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
                            replace: '$1"$2.js";',
                        },
                        {
                            // Fix missing imports and remove unused
                            search: /^import .*$/gim,
                            replace: importReplace,
                        },
                    ],
                },
            },
            {
                test: /\.js$/,
                loader: "buble-loader",
            },
            // {
            //     test: /\.css$/i,
            //     use: ["style-loader", "css-loader"],
            // },
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
        filename: "ol.js",
        library: "ol",
        libraryTarget: "umd",
        libraryExport: "default",
    },
};
