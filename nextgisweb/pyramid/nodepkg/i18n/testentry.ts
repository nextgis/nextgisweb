/** @testentry call */
import { INDEX } from "@nextgisweb/jsrealm/i18n/catalog";
import { pgettext, npgettext } from "@nextgisweb/pyramid/i18n";

console.log(INDEX);

const mUnits = (num: number) => npgettext("test", "unit", "units", num);

export default function () {
    console.log(pgettext("test", "unit"));

    const logNumberOfUnits = (num: number) =>
        console.log(`${num} ${mUnits(num)}`);
    logNumberOfUnits(1);
    logNumberOfUnits(2);
    logNumberOfUnits(5);
}
