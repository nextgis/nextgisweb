const registryLoader = import("./entrypoint/registry").then(({ registry }) => {
    const mapping = Object.fromEntries(
        registry.queryAll().map((i) => [i.identity, i.value])
    );

    return (name) => {
        const plugin = mapping[name];
        if (plugin) return plugin();
    };
});

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
            const err = new Error(`Entrypoint not found: '${name}'`);
            err.name = "EntrypointError";
            reject(err);
        }
    }, reject);

    return promise;
};

const extCache = {};

function normalize(name) {
    if (!name.includes("/")) name = `${name}/index`;
    return name;
}

window.ngwExternal = (name) => {
    name = normalize(name);

    const cached = extCache[name];
    if (cached) return cached.promise;

    let resolve, reject;
    const promise = new Promise((res, rej) => {
        [resolve, reject] = [res, rej];
    });

    const script = document.createElement("script");
    const record = { promise, resolve, reject, script, defined: false };
    extCache[name] = record;

    script.src = `${ngwConfig.staticUrl}${name}.js`;
    script.onload = () => {
        if (!record.defined) resolve({});
    };

    document.head.append(script);
    return promise;
};

window.ngwExternal.define = (name, dependencies, factory) => {
    name = normalize(name);

    const cached = extCache[name];
    const { resolve, reject } = cached;
    cached.defined = true;

    try {
        resolve(factory());
    } catch (e) {
        reject(e);
    }
};
