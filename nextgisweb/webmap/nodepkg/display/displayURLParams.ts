import type { LayerSymbols } from "../compat/type";
import type { DisplayURLParams } from "../type";
import { UrlParams } from "../utils/UrlParams";

export const displayURLParams = new UrlParams<DisplayURLParams>({
    lon: { parse: parseFloat },
    lat: { parse: parseFloat },
    base: {},
    zoom: { parse: parseInt },
    angle: { parse: parseInt },
    annot: {},
    events: {},
    panel: {},
    panels: { parse: (val) => val.split(",") },
    styles: {
        // styles=1[0-5|8-12],2,3[-1] >>> { 1: ['0-5', '8-12'], 2: [], 3: '-1' }
        parse: (val) => {
            const result: Record<number, LayerSymbols> = {};
            if (!val) return result;

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
    controls: { parse: (val) => val.split(",") },
    linkMainMap: {},
});
