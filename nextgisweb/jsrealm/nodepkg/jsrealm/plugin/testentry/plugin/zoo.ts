/** @plugin jsrealm/plugin/testentry */
import { registry } from "../registry";

registry.register({
    component: "jsrealm",
    operation: "delete",
    loader: () =>
        new Promise((resolve) => resolve((what: string) => `zoo:${what}`)),
});
