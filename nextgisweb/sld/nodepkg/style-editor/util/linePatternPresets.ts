import { gettext } from "@nextgisweb/pyramid/i18n";

const msgSolidLine = gettext("Solid");
const msgDotted = gettext("Dotted");
const msgDashed = gettext("Dashed");
const msgDashDotted = gettext("Dash - dotted");

const linePatternPresets = [
    {
        displayName: msgSolidLine,
        keyname: "line",
        value: {},
    },
    {
        displayName: msgDotted,
        keyname: "dotted",
        value: {
            dasharray: [1, 1],
        },
    },
    {
        displayName: msgDashed,
        keyname: "dashed",
        value: {
            dasharray: [3, 1],
        },
    },
    {
        displayName: msgDashDotted,
        keyname: "dash-dotted",
        value: {
            dasharray: [3, 1, 1, 1],
        },
    },
];

export const getLinePatternPresets = (width: number) => {
    return linePatternPresets.map((preset) => {
        if (preset.value && Array.isArray(preset.value.dasharray)) {
            return {
                ...preset,
                value: {
                    ...preset.value,
                    dasharray: preset.value.dasharray.map(
                        (element) => element * width
                    ),
                },
            };
        }
        return preset;
    });
};
