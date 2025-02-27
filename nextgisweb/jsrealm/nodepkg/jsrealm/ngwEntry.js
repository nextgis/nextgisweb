const registryLoader = import("./entrypoint/registry").then(({ registry }) => {
    const mapping = Object.fromEntries(
        registry.queryAll().map((i) => [i.identity, i.value])
    );

    return (name) => {
        const plugin = mapping[name];
        if (plugin) return plugin();
    };
});

const entrypointLoader = import("@nextgisweb/jsrealm/entrypoint").then(
    ({ default: entrypoint }) => {
        return (name) => entrypoint(name);
    }
);

const cache = {};

window.ngwEntry = (name) => {
    const cached = cache[name];
    if (cached) return cached;

    let resolve, reject;
    const promise = (cache[name] = new Promise((res, rej) => {
        [resolve, reject] = [res, rej];
    }));

    registryLoader.then((c) => {
        const fromRegistry = c(name);
        if (fromRegistry) {
            fromRegistry.then(resolve, reject);
        } else {
            entrypointLoader.then((c) => {
                c(name).then(resolve, reject);
            });
        }
    }, reject);

    return promise;
};
