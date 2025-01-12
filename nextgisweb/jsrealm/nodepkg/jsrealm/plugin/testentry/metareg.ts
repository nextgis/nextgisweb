/** @testentry mocha */
import { assert } from "chai";

import { meta } from "..";
import { LoaderObject } from "../loader";
import type { BaseRegistry } from "../registry";

export default () => {
    meta.queryAll().map((registry) => {
        const lit = (
            assertion: string,
            callback: (val: BaseRegistry) => void
        ) => {
            it(assertion, async () => {
                await callback(await registry.load());
            });
        };

        describe(registry.identity, () => {
            lit("has been sealed", (r) => assert.isTrue(r.status().sealed));
            lit("has some plugins", (r) =>
                assert.isAtLeast(r.status().count, 0)
            );
            lit("plugins can be loaded", async (r) => {
                for (const p of r.query()) {
                    if (p instanceof LoaderObject) {
                        await p.load();
                    }
                }
            });
        });
    });
};
