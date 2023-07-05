/** @testentry call */
import i18n from "@nextgisweb/pyramid/i18n";

interface Foo {
    some: number;
    other: string;
}

export default function() {
    let x: Foo = { some: 1, other: i18n.gettext("Create") };
    return x.other;
}
