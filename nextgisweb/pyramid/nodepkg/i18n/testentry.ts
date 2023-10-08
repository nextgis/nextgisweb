/** @testentry mocha */
import { assert } from "chai";

import { npgettext, pgettext } from "@nextgisweb/pyramid/i18n";

describe("Gettext implementation", () => {
    it("pgettext returns something", () => {
        assert.isNotEmpty(pgettext("test", "unit"));
    });

    it("translates plurals", () => {
        const f = (num: number) => npgettext("test", "unit", "units", num);
        assert.notStrictEqual(f(1), f(2));
    });
});
