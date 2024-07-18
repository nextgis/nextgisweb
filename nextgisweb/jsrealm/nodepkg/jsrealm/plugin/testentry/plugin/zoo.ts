/** @plugin */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.register(
    { component: COMP_ID, operation: "delete" },
    {
        promise: () =>
            new Promise((resolve) => resolve((what: string) => `zoo:${what}`)),
    }
);
