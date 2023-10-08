/** @testentry mocha */
import { assert } from "chai";

import { meta } from "..";
import type { PluginRegistry } from "..";

Array.from(meta.query()).map((registry) => {
    const lit = (
        assertion: string,
        callback: (val: PluginRegistry<never, never>) => void
    ) => {
        it(assertion, async () => {
            await callback(await registry.load());
        });
    };

    describe(registry.identity, () => {
        lit("has been sealed", (r) => assert.isTrue(r.sealed));
        lit("has some plugins", (r) => assert.isAtLeast(r.count, 0));
        lit("all plugins can be loaded", async (r) => {
            for (const p of Array.from(r.query())) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (p as any).load();
            }
        });
    });
});
