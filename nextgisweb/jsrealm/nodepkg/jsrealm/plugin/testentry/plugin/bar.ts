/** @plugin */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.registerValue(COMP_ID, (what) => `bar:${what}`, {
    operation: "update",
});
