import { useEffect, useState } from "react";

import { route } from "@nextgisweb/pyramid/api";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";
import settings from "@nextgisweb/webmap/client-settings";

import { useMapContext } from "../map-component/context/useMapContext";

import "./CoordinateSystemDisplay.less";

export function CoordinateSystemDisplay() {
    const { mapStore } = useMapContext();
    const [srsInfo, setSrsInfo] = useState<SRSRead | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const srsId = mapStore.measureSrsId || settings.measurement_srid;
        if (!srsId) {
            setSrsInfo(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        route("spatial_ref_sys.item", { id: srsId })
            .get({ cache: true })
            .then((data: SRSRead) => {
                if (!cancelled) {
                    setSrsInfo(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSrsInfo(null);
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [mapStore.measureSrsId]);

    if (isLoading || !srsInfo) {
        return null;
    }

    return (
        <div className="coordinate-system-display" title={srsInfo.display_name}>
            <span className="srs-name">{srsInfo.display_name}</span>
        </div>
    );
}
