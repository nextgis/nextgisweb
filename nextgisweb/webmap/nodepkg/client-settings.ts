import { fetchSettings } from "@nextgisweb/pyramid/settings";
import type {
    AddressGeocoder,
    AreaUnits,
    DegreeFormat,
    LengthUnits,
} from "@nextgisweb/webmap/type/api";

interface Adapters {
    tile: { display_name: string };
    image: { display_name: string };
}

export interface WebmapSettings {
    editing: boolean;
    annotation: boolean;
    adapters: Adapters;
    check_origin: boolean;
    identify_radius: number;
    identify_attributes: boolean;
    show_geometry_info: boolean;
    address_search_enabled: boolean;
    address_search_extent: boolean;
    address_geocoder: AddressGeocoder;
    yandex_api_geocoder_key: string;
    nominatim_countrycodes: string;
    units_length: LengthUnits;
    units_area: AreaUnits;
    degree_format: DegreeFormat;
    measurement_srid: number;
    legend_symbols: unknown;
    hide_nav_menu: boolean;
    nonimatim_url: string;
}

export default await fetchSettings<WebmapSettings>(COMP_ID);
