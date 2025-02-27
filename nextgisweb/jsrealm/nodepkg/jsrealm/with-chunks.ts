/** @entrypoint */

// NOTE: Don't add imports here! This entrypoint is used for loading chunk and
// can't have any chunks (and imports) itself!

// Capture Webpack internals: __webpack_require__ is an argument. We use it for
// loading chunks as import() do.
declare const __webpack_require__: {
    e: (name: string) => Promise<unknown>;
};

const manifestUrl = ngwConfig.staticUrl + "main/manifest.json";
export const manifest = fetch(manifestUrl).then((resp) =>
    resp.json().then((data: { dependencies: Record<string, string[]> }) => {
        const dependencies = data.dependencies;
        const selfDependencies = dependencies[MODULE_NAME];
        if (Array.isArray(selfDependencies) && selfDependencies.length > 0) {
            throw Error(`${MODULE_NAME} must not have any dependencies!`);
        }
        return dependencies;
    })
);

export function load(
    entry: string,
    require: unknown,
    callback: (m: null) => void
) {
    manifest.then((dependencies) => {
        const deps = dependencies![entry];
        if (deps === undefined || (Array.isArray(deps) && deps.length === 0)) {
            callback(null);
        } else {
            Promise.all(deps.map((i) => __webpack_require__.e(i))).then(() =>
                callback(null)
            );
        }
    });
}
