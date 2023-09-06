/** @plugin jsrealm/plugin/testentry */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.register({
    component: "jsrealm",
    operation: "delete",
    loader: () =>
        new Promise((resolve) =>
            resolve((what: string) => {
                console.log(`Zoo deletes ${what}`);
            })
        ),
});
