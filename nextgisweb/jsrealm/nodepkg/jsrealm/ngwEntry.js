window.ngwEntry = (name) => {
    return new Promise((resolve, reject) => {
        import("@nextgisweb/jsrealm/entrypoint").then(
            ({ default: entrypoint }) => {
                entrypoint(name).then((m) => resolve(m), reject);
            }
        );
    });
};
