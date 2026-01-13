/** @testentry mocha */
import { assert } from "chai";

function check(m: { default: string; named: string }) {
    assert.equal(m.default, "default");
    assert.equal(m.named, "named");
}

export default () => {
    describe("Webpack imports", () => {
        it("module by absolute path", async () => {
            const m = await import("@nextgisweb/jsrealm/testentry/mod/abs");
            check(m);
        });

        it("module by relative path", async () => {
            const m = await import("./mod/rel");
            check(m);
        });

        it("async module", async () => {
            const m = await import("./mod/async");
            check(m);
        });
    });

    describe("Webpack fails", () => {
        it("on module that throws", async () => {
            let caught = false;
            try {
                await import("./mod/throw");
            } catch (e) {
                caught = true;
                assert.equal((e as Error).message, "fail");
            }
            assert.isTrue(caught);
        });

        it("on async module that throws", async () => {
            let caught = false;
            try {
                await import("./mod/athrow");
            } catch (e) {
                caught = true;
                assert.equal((e as Error).message, "fail");
            }
            assert.isTrue(caught);
        });
    });
};
