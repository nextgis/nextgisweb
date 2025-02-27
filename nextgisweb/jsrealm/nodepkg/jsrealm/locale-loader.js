/** @entrypoint */

export function load(path, require, ready) {
    const ep = `@nextgisweb/jsrealm/locale/${ngwConfig.locale}`;
    ngwEntry(ep).then(ready);
}
