/** @plugin jsrealm/plugin/testentry */
import { registry } from "../registry";

registry.register({
    component: COMP_ID,
    operation: "update",
    value: (what: string) => `bar:${what}`,
});
