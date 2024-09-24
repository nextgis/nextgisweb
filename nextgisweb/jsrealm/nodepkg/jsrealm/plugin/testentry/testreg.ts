/** @testentry mocha */
import { assert, expect } from "chai";

import { registry } from "./registry";
import type { Operation } from "./registry";

describe("Test registry", () => {
    it("throws error on register", () => {
        expect(() => {
            registry.register(COMP_ID, (what) => what, {
                operation: "create",
            });
        }).to.throw();
    });
    ["foo:create", "bar:update", "zoo:delete"].forEach((itm) => {
        const [id, operation] = itm.split(":") as [string, Operation];
        it(`${id} is selected for ${operation}`, async () => {
            const fn = await registry.load({ operation });
            assert.strictEqual(fn(operation), itm);
        });
    });
});
