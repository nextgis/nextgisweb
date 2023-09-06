/** @testentry call */
import { registry } from "@nextgisweb/jsrealm/plugin/testentry/registry";

export default async function () {
    (await registry.load({ operation: "create" }))("MU");
    (await registry.load({ operation: "update" }))("MU");
    (await registry.load({ operation: "delete" }))("MU");
}
