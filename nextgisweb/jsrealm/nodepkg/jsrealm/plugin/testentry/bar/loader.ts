/** @plugin jsrealm/plugin/testentry */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

registry.register({
    component: "jsrealm",
    operation: "update",
    import: () => import("."),
});
