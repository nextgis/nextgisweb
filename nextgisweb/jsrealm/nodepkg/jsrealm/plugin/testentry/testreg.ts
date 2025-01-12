/** @testentry mocha */
import { assert, expect } from "chai";

import { registry } from "./registry";
import type { Operation } from "./registry";

export default () => {
    describe("Test registry", () => {
        it("throws error on register", () => {
            expect(() => {
                registry.registerValue(COMP_ID, (what) => what, {
                    operation: "create",
                });
            }).to.throw();
        });

        ["foo:create", "bar:update", "zoo:delete"].forEach((itm) => {
            const [id, operation] = itm.split(":") as [string, Operation];
            it(`${id} is selected for ${operation}`, async () => {
                const fn = await registry.queryOne({ operation }).load();
                assert.strictEqual(fn(operation), itm);
            });
        });

        it("queryOne throws error on multiple results", () => {
            expect(() => {
                registry.queryOne({});
            }).to.throw();
        });

        it("queryOne throws error if nothing found", () => {
            expect(() => {
                registry.queryOne({ operation: "unknown" as Operation });
            }).to.throw();
        });
    });
};
