import { gettext } from "@nextgisweb/pyramid/i18n";

const msgLine = gettext("Line");
const msgDotted = gettext("Dotted");
const msgDashed = gettext("Dashed");
const msgDashDotted = gettext("Dash - dotted");

export const linePatternPresets = [
    {
        displayName: msgLine,
        keyname: "line",
        value: {
            kind: "Line",
            color: "black",
            width: 2,
            cap: "butt",
        },
    },
    {
        displayName: msgDotted,
        keyname: "dotted",
        value: {
            kind: "Line",
            color: "black",
            width: 2,
            dasharray: [3, 3],
            cap: "butt",
        },
    },
    {
        displayName: msgDashed,
        keyname: "dashed",
        value: {
            kind: "Line",
            color: "black",
            width: 2,
            dasharray: [9, 3],
            cap: "butt",
        },
    },
    {
        displayName: msgDashDotted,
        keyname: "dash-dotted",
        value: {
            kind: "Line",
            color: "black",
            width: 2,
            dasharray: [9, 3, 3, 3],
            cap: "butt",
        },
    },
];
