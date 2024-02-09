/** @entrypoint */
import { gettext } from "@nextgisweb/pyramid/i18n";
import pyramidSettings from "@nextgisweb/pyramid/settings!pyramid";

import { routeURL } from "./api";

const css = [
    ".map-logo { display: block; position: absolute; right: 10px; bottom: 28px; text-decoration: none; line-height: 1; z-index: 1000;  }",
    ".map-logo img { width: 94px; }",
].join("\n");

const style = document.createElement("style");
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);

const settings = pyramidSettings.company_logo;

export function appendTo(parent) {
    if (!settings.enabled) return;

    const aElem = document.createElement("a");
    aElem.className = "map-logo company-logo";

    const imgElem = document.createElement("img");
    imgElem.src = routeURL("pyramid.asset.blogo") + `?ckey=${settings.ckey}`;

    const url = settings.link;
    if (url && url.trim()) {
        aElem.href = url;
        aElem.target = "_blank";
        if (/[^\w]nextgis\.com/.test(url)) {
            imgElem.alt = gettext("Get your own Web GIS at nextgis.com");
        }
    }

    aElem.appendChild(imgElem);
    parent.appendChild(aElem);
}
