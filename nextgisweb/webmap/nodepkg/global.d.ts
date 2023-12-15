declare module "@nextgisweb/pyramid/settings!webmap" {
    interface BaseMap {
        base: {
            keyname: string;
            mid: string;
        };
        layer: {
            title: string;
            visible?: boolean;
        };
        source: Record<string, unknown>;
    }

    interface Adapters {
        tile: {
            display_name: string;
        };
        image: {
            display_name: string;
        };
    }

    interface Config {
        basemaps: BaseMap[];
        editing: boolean;
        annotation: boolean;
        adapters: Adapters;
        check_origin: boolean;
        identify_radius: number;
        identify_attributes: boolean;
        show_geometry_info: boolean;
        popup_width: number;
        popup_height: number;
        address_search_enabled: boolean;
        address_search_extent: boolean;
        address_geocoder: string;
        yandex_api_geocoder_key: string;
        nominatim_countrycodes: string;
        units_length: string;
        units_area: string;
        degree_format: string;
        measurement_srid: number;
        legend_symbols: unknown;
        hide_nav_menu: boolean;
    }

    const value: Config;

    export = value;
}
