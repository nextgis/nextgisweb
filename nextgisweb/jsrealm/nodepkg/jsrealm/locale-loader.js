/** @entrypoint */
import entrypoint from "./entrypoint";

export function load(path, require, ready) {
    const ep = `@nextgisweb/jsrealm/locale/${ngwConfig.locale}`;
    entrypoint(ep).then(ready);
}
