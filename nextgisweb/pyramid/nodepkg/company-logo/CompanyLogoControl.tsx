import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { MapControl } from "@nextgisweb/webmap/map-component";
import type { MapControlProps } from "@nextgisweb/webmap/map-component";

import { routeURL } from "../api";
import { url } from "../nextgis";

import "./CompanyLogoControl.less";

const { enabled, link, ckey } = pyramidSettings.company_logo;

const aHref = enabled && link ? url(link) : undefined;
const aProps = aHref ? { href: aHref, target: "_blank" } : {};

const iSrc = `${routeURL("pyramid.asset.blogo")}?ckey=${ckey}`;

export default function CompanyLogoControl(props: MapControlProps) {
    if (!enabled) return null;
    return (
        <MapControl {...props} margin>
            <a className="map-logo company-logo" {...aProps}>
                <img src={iSrc} />
            </a>
        </MapControl>
    );
}
