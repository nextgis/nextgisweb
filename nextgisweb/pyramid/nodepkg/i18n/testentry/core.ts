/** @testentry mocha */
import { assert } from "chai";

import {
    gettextf as _gettextf,
    ngettext as _ngettext,
    ngettextf as _ngettextf,
    npgettext as _npgettext,
    npgettextf as _npgettextf,
    pgettext as _pgettext,
    pgettextf as _pgettextf,
} from "@nextgisweb/pyramid/i18n";

describe("Gettext implementation", () => {
    it("gettextf implementation", () => {
        const f = _gettextf("Hello, {first} {last}");

        assert.equal(
            f({ first: "Arthur", last: "Dent" }),
            "Hello, Arthur Dent"
        );
    });

    it("pgettext returns something", () => {
        assert.isNotEmpty(_pgettext("test", "unit"));
    });

    it("pgettextf implementation", () => {
        assert.equal(
            _pgettextf("test", "units {}")("on ellipsoid"),
            "units on ellipsoid"
        );
    });

    it("ngettext implementation", () => {
        assert.equal(
            _ngettext(
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
            _ngettextf(
                "The resource has been deleted",
                "{} resources have been deleted",
                num
            )(num),
            "3 resources have been deleted"
        );
    });

    it("translates plurals (npgettext)", () => {
        const f = (num: number) => _npgettext("test", "unit", "units", num);
        assert.notStrictEqual(f(1), f(2));
    });
});

const describeInterpolation = (
    family: string,
    sFn: typeof _gettextf,
    nFn: typeof _ngettextf
) => {
    const pluralUnit = (n: number) => _npgettext("test", "item", "items", n);

    describe(`String iterpolation with ${family}`, () => {
        it("handles positional arguments", () => {
            const f = sFn("Hello, {1} {0}");
            assert.equal(f("Dent", "Arthur"), "Hello, Arthur Dent");
        });

        it("handles named arguments", () => {
            const f = sFn("Hello, {first} {last}");
            assert.equal(
                f({ first: "Arthur", last: "Dent" }),
                "Hello, Arthur Dent"
            );
        });

        it("unescapes trivial curly braces", () => {
            const f = sFn("{{Hello}} {{3}}, {0}");
            assert.equal(f("Arthur"), "{Hello} {3}, Arthur");
        });

        // it("unescapes nested curly braces", () => {
        //     const f = sFn("Hello, {{{0}}}");
        //     assert.equal(f("Arthur"), "Hello, {Arthur}");
        // });

        it("skips unused arguments", () => {
            const f = sFn("Hello, Arthur");
            assert.equal(f("Dent"), "Hello, Arthur");
        });

        it("throws error on missing arguments", () => {
            const f = sFn("Hello, {1} {0}");
            assert.throws(() => f("Dent"));
        });

        it("does simple pluralization", () => {
            const f = (n: number) => {
                return nFn("One deleted", "{} deleted", n);
            };
            assert.equal(f(1)(1), "One deleted");
            assert.equal(f(2)(2), "2 deleted");
        });

        it("does complex pluralization", () => {
            const f = (n: number) => {
                return nFn("One {1} deleted", "{0} {1} deleted", n);
            };

            assert.equal(f(1)(1, pluralUnit(1)), "One item deleted");
            assert.equal(f(2)(2, pluralUnit(2)), "2 items deleted");
        });
    });
};

describeInterpolation("gettext", _gettextf, _ngettextf);
describeInterpolation(
    "pgettext",
    (...args) => _pgettextf("test", ...args),
    (...args) => _npgettextf("test", ...args)
);
