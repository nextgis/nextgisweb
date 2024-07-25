/** @testentry mocha */
import { assert } from "chai";

import {
    gettextf,
    ngettext,
    ngettextf,
    npgettext,
    npgettextf,
    pgettext,
    pgettextf,
} from "@nextgisweb/pyramid/i18n";

describe("Gettext implementation", () => {
    it("gettextf implementation", () => {
        const f = gettextf("Hello, {first} {last}");

        assert.equal(
            f({ first: "Arthur", last: "Dent" }),
            "Hello, Arthur Dent"
        );
    });

    it("pgettext returns something", () => {
        assert.isNotEmpty(pgettext("test", "unit"));
    });

    it("pgettextf implementation", () => {
        assert.equal(
            pgettextf("test", "unit {}")("on ellipsoid"),
            "unit on ellipsoid"
        );
    });

    it("ngettext implementation", () => {
        assert.equal(
            ngettext(
                "The resource has been moved",
                "Resources have been moved",
                2
            ),
            "Resources have been moved"
        );
    });

    it("ngettextf implementation", () => {
        const num = 3;

        assert.equal(
            ngettextf(
                "The resource has been deleted",
                "{} resources have been deleted",
                num
            )(num),
            "3 resources have been deleted"
        );
    });

    it("translates plurals (npgettext)", () => {
        const f = (num: number) => npgettext("test", "unit", "units", num);
        assert.notStrictEqual(f(1), f(2));
    });

    it("npgettextf implementation", () => {
        const num = 3;
        assert.equal(
            npgettextf("test", "{} unit", "{} units", num)(num + ` edited`),
            "3 edited units"
        );
    });
});
