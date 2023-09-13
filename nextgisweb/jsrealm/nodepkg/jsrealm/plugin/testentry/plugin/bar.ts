/** @plugin jsrealm/plugin/testentry */
import { registry } from "../registry";

registry.register({
    component: "jsrealm",
    operation: "update",
    value: (what: string) => `bar:${what}`,
});
