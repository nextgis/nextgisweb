/** @plugin */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.register(
    { component: COMP_ID, operation: "update" },
    { sync: (what: string) => `bar:${what}` }
);
