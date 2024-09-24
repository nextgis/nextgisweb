/** @plugin */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.register(COMP_ID, (what) => `bar:${what}`, {
    operation: "update",
});
