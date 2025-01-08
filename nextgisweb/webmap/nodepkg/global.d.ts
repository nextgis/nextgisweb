declare module "@nextgisweb/pyramid/settings!webmap" {
    import type { WebMapCSettingsRead } from "@nextgisweb/webmap/type/api";

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

    interface Config extends WebMapCSettingsRead {
        basemaps: BaseMap[];
        editing: boolean;
        annotation: boolean;
        adapters: Adapters;
        check_origin: boolean;
    }

    const value: Config;

    export = value;
}

declare module "@nextgisweb/webmap/icon/*.svg" {
    import type { FC, SVGProps } from "react";

    const value: FC<SVGProps<SVGSVGElement>> & { id: string };
    export = value;
}
