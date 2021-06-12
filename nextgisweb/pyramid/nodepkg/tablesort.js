/** @entrypoint */
import tablesort from "tablesort";
export default tablesort;

export function byId(id) {
    tablesort(document.getElementById(id));
}

// It seems imposible to import "tablesort.number.js" due to global variables.
// That's why we're copying number sort directly from there.

function cleanNumber(i) {
    return i.replace(/[^\-?0-9.]/g, "");
}

function compareNumber(a, b) {
    a = parseFloat(a);
    b = parseFloat(b);

    a = isNaN(a) ? 0 : a;
    b = isNaN(b) ? 0 : b;

    return a - b;
};

tablesort.extend(
    "number",
    function (item) {
        return (
            item.match(/^-?[£\x24Û¢´€]?\d+\s*([,\.]\d{0,2})/) || // Prefixed currency
            item.match(/^-?\d+\s*([,\.]\d{0,2})?[£\x24Û¢´€]/) || // Suffixed currency
            item.match(/^-?(\d)*-?([,\.]){0,1}-?(\d)+([E,e][\-+][\d]+)?%?$/)
        );
    },
    function (a, b) {
        a = cleanNumber(a);
        b = cleanNumber(b);

        return compareNumber(b, a);
    }
);
