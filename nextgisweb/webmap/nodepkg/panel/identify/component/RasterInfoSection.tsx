import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import type { RasterLayerIdentifyItem } from "@nextgisweb/raster-layer/type/api";
import { PanelSection } from "@nextgisweb/webmap/panel/component";

import { KeyValueTable } from "../KeyValueTable";
import type { FieldDataItem } from "../fields";

import ListIcon from "@nextgisweb/icon/material/list/outline";

export interface RasterInfoSectionProps {
    item: RasterLayerIdentifyItem;
}

const msgBand = gettextf("Band {}");

export function RasterInfoSection({ item }: RasterInfoSectionProps) {
    const dataSource: FieldDataItem[] = item.values.map((value, index) => ({
        key: index,
        value,
        attr: msgBand(index + 1),
    }));

    return (
        <PanelSection
            key="raster"
            icon={<ListIcon />}
            title={gettext("Raster")}
        >
            <KeyValueTable data={dataSource} />
        </PanelSection>
    );
}
