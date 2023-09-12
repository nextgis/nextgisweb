/** @testentry call */
import { registry } from "./registry";

export default async function () {
    (await registry.load({ operation: "create" }))("MU");
    (await registry.load({ operation: "update" }))("MU");
    (await registry.load({ operation: "delete" }))("MU");
}
