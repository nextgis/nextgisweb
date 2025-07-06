/** @testentry react */
import { useEffect } from "react";

import { routeURL } from "@nextgisweb/pyramid/api";

import { SwaggerUI } from "./SwaggerUI";

export default function SwaggerTestEntry() {
    useEffect(() => {
        const prefix = /\.swagger-ui\s+(?!>)/;
        const weights: Record<string, "normal" | "bold" | null> = {
            "inherit": null,
            "bolder": "bold",
            "100": "normal",
            "200": "normal",
            "300": "normal",
            "400": "normal",
            "500": "bold",
            "600": "bold",
            "700": "bold",
            "900": "bold",
        };

        const familyDefault: string[] = [];
        const familyMonospace: string[] = [];

        const weightNormal: string[] = [];
        const weightBold: string[] = [];

        const rule = (r: CSSRule) => {
            if (!(r instanceof CSSStyleRule)) return;
            const s = r.selectorText;
            const m = s.match(prefix);
            if (!m) return;

            const selectors = s.split(/\s*,\s*/);

            const family = r.style.fontFamily;
            if (family) {
                if (family.search(/monospace/)) {
                    familyDefault.push(...selectors);
                } else {
                    familyMonospace.push(...selectors);
                }
            }

            const weight = r.style.fontWeight;
            if (weight) {
                const w = weights[weight];
                if (w === null) {
                    // ignore
                } else if (w === "normal") {
                    weightNormal.push(...selectors);
                } else if (w === "bold") {
                    weightBold.push(...selectors);
                } else {
                    console.warn(`No idea how to map weight: ${weight}`);
                }
            }
        };

        for (const s of document.styleSheets) {
            for (const r of s.cssRules) {
                rule(r);
            }
        }

        const print = (arr: string[], label: string) => {
            arr.sort();
            console.log(`${label} = ${arr.join(", ")}`);
        };

        print(familyDefault, "FAMILY DEFAULT");
        print(familyMonospace, "FAMILY MONOSPACE");
        print(weightNormal, "WEIGHT NORMAL");
        print(weightBold, "WEIGHT BOLD");
    }, []);

    return (
        <SwaggerUI
            url={routeURL("pyramid.openapi_json_test")}
            supportedSubmitMethods={[]}
        />
    );
}
