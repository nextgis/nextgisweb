/** @testentry mocha */
import { assert, expect } from "chai";

import { registry } from "./registry";

describe("Test registry", () => {
    it("throws error on register", () => {
        expect(() => {
            registry.register({
                component: "jsrealm",
                operation: "create",
                value: (what) => what,
            });
        }).to.throw();
    });
    ["foo:create", "bar:update", "zoo:delete"].forEach((itm) => {
        const [id, op] = itm.split(":");
        it(`${id} is selected for ${op}`, async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = (await registry.load({ operation: op as any }))(op);
            assert.strictEqual(res, itm);
        });
    });
});
