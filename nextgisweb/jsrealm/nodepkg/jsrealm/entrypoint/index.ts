export default <T = unknown>(name: string) => {
    return new Promise<T>((resolve) => {
        // @ts-expect-error It AMD require, not CommonJS
        window.require([name], (module) => resolve(module));
    });
};
