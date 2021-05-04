/* global require */
export default (name) => {
    return new Promise(resolve => {
        // TODO: Deal with require error and reject the promise.
        require([name], (module) => {
            resolve(module);
        });
    });
};
