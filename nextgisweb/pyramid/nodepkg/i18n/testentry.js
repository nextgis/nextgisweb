/** @testentry call */
import i18n from "@nextgisweb/pyramid/i18n";

const mUnits = (num) => i18n.npgettext("test", "unit", "units", num);

export default function () {
    const logNumberOfUnits = (num) => console.log(`${num} ${mUnits(num)}`);
    logNumberOfUnits(1);
    logNumberOfUnits(2);
    logNumberOfUnits(5);
}
