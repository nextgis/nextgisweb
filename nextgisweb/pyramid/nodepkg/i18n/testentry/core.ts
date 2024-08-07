/** @testentry mocha */
import { assert } from "chai";
// import { InfoIcon } from "package/nextgisweb/nextgisweb/gui/nodepkg/icon";

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
    it("pgettext returns something", () => {
        assert.isNotEmpty(pgettext("test", "unit"));
    });

    it("translates plurals", () => {
        const f = (num: number) => npgettext("test", "unit", "units", num);
        assert.notStrictEqual(f(1), f(2));
    });
});

const describeInterpolation = (
    family: string,
    sFn: typeof gettextf,
    nFn: typeof ngettextf
) => {
    const pluralUnit = (n: number) => npgettext("test", "item", "items", n);

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

        // it("handles TEST", () => {
        //     const f = sFn("Hello, {0}");
        //     assert.equal(f(InfoIcon), "Hello, Arthur");
        // });

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

describeInterpolation("gettext", gettextf, ngettextf);

describeInterpolation(
    "pgettext",
    (...args) => pgettextf("test", ...args),
    (...args) => npgettextf("test", ...args)
);
