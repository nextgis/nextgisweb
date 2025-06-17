import type { LayerSymbols } from "../compat/type";
import type { DisplayURLParams } from "../type";
import type { URLParams } from "../utils/URL";
import { UrlParams } from "../utils/UrlParams";

const toFloat = (val: URLParams[0]) =>
    typeof val === "string" ? parseFloat(val) : undefined;
const toInt = (val: URLParams[0]) =>
    typeof val === "string" ? parseInt(val) : undefined;

export const displayURLParams = new UrlParams<DisplayURLParams>({
    lon: { parse: toFloat },
    lat: { parse: toFloat },
    base: {},
    zoom: { parse: toInt },
    angle: { parse: toInt },
    annot: {},
    events: {},
    panel: {},
    panels: {
        parse: (val) => (typeof val === "string" ? val.split(",") : []),
    },
    styles: {
        // styles=1[0-5|8-12],2,3[-1] >>> { 1: ['0-5', '8-12'], 2: [], 3: '-1' }
        parse: (val) => {
            const result: Record<number, LayerSymbols> = {};
            if (!val || typeof val !== "string") return result;

            val.split(",").forEach((entry) => {
                const match = entry.match(/^(\d+)(?:\[(.*?)\])?$/);
                if (!match) return;

                const id = parseInt(match[1], 10);
                const content = match[2];

                if (content === undefined) {
                    result[id] = null;
                } else if (content === "-1") {
                    result[id] = "-1";
                } else {
                    result[id] = content.split("|");
                }
            });
            return result;
        },
    },
    hl_val: {},
    hl_lid: {},
    hl_attr: {},
    controls: {
        parse: (val) => (typeof val === "string" ? val.split(",") : []),
    },
    linkMainMap: {},
});
