/** @testentry mocha */
import { assert } from "chai";

import { meta } from "..";
import type { PluginRegistry } from "..";

meta.queryAll().map((registry) => {
    const lit = (
        assertion: string,
        callback: (val: PluginRegistry) => void
    ) => {
        it(assertion, async () => {
            await callback(await registry.load());
        });
    };

    describe(registry.identity, () => {
        lit("has been sealed", (r) => assert.isTrue(r.sealed));
        lit("has some plugins", (r) => assert.isAtLeast(r.count, 0));
        lit("all plugins can be loaded", async (r) => {
            for (const p of r.query()) {
                await (p as unknown as PluginRegistry).load();
            }
        });
    });
});
