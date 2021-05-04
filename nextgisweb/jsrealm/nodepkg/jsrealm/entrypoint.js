export default (name) => {
    return new Promise((resolve, reject) => {
        // TODO: Deal with require error and reject the promise.
        require([name], (module) => {
            resolve(module);
        });
    });
};
