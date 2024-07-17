declare module "@nextgisweb/pyramid/settings!basemap" {
    interface Config {
        qms_geoservices_url: string;
        qms_icons_url: string;
        qms_url: string;
    }

    const value: Config;

    export = value;
}
