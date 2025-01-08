/** @plugin */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.registerLoader(
    COMP_ID,
    () =>
        new Promise<(what: string) => string>((resolve) =>
            resolve((what: string) => `zoo:${what}`)
        ),
    { operation: "delete" }
);
