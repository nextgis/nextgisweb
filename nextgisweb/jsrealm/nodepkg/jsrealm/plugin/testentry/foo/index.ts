/** @plugin jsrealm/plugin/testentry */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.register({
    component: "jsrealm",
    operation: "create",
    value: (what: string) => {
        console.log(`Foo creates ${what}`);
    },
});
