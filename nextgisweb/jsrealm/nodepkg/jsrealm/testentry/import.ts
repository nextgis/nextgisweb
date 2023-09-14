/** @testentry mocha */
import { assert } from "chai";

function check(m: { default: string; named: string }) {
    assert.equal(m.default, "default");
    assert.equal(m.named, "named");
}

describe("Webpack import", () => {
    it("imports module by absolute path", async () => {
        const m = await import("@nextgisweb/jsrealm/testentry/mod/abs");
        check(m);
    });

    it("imports module by relative path", async () => {
        const m = await import("./mod/rel");
        check(m);
    });

    it("imports entrypoint by relative path", async () => {
        const m = await import("@nextgisweb/jsrealm/testentry/entry/abs");
        check(m);
    });

    it("imports entrypoint by absolute path", async () => {
        const m = await import("./entry/rel");
        check(m);
    });
});
