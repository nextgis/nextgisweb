/** @plugin jsrealm/testentry/driver */
import { registry } from "@nextgisweb/jsrealm/testentry/driver";

registry.register({
    component: "jsrealm",
    identity: "call",
    value: (module, el: HTMLElement) => {
        Promise.resolve(module()).then(
            (result) => {
                el.innerHTML = result;
            },
            (error) => {
                el.innerHTML = error;
            }
        );
    },
});
