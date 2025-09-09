import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { MapControl } from "@nextgisweb/webmap/map-component";
import type { MapControlProps } from "@nextgisweb/webmap/map-component";

import { routeURL } from "../api";

import "./CompanyLogoControl.less";

const settings = pyramidSettings.company_logo;

export default function CompanyLogoControl(props: MapControlProps) {
    if (!settings?.enabled) return null;

    const imgSrc = `${routeURL("pyramid.asset.blogo")}?ckey=${settings.ckey}`;

    const href = settings.link?.trim();

    const isNextGisCloude = href ? /(^|[^\w])nextgis\.com/i.test(href) : false;

    const alt = isNextGisCloude
        ? gettext("Get your own Web GIS at nextgis.com")
        : undefined;

    const aProps = href ? { href, target: "_blank" } : {};

    return (
        <MapControl {...props} margin>
            <a className="map-logo company-logo" {...aProps}>
                <img src={imgSrc} alt={alt} />
            </a>
        </MapControl>
    );
}
