import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Grid, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";

import type { WmsClientLayerStore } from "./WmsClientLayerStore";
import { getConnectionResource } from "./util/getConnectionResource";

import "./WmsClientLayerWidget.less";
import { EdiTable } from "@nextgisweb/gui/nodepkg/edi-table";

export const WmsClientLayerWidget: EditorWidgetComponent<
    EditorWidgetProps<WmsClientLayerStore>
> = observer(({ store }) => {
    const [layers, setLayers] = useState<OptionType[]>();
    const [formats, setFormats] = useState<OptionType[]>();

    const mapLayers = (value: any) => {
        return value.map((item: any) => {
            return { label: item.title, value: item.id };
        });
    };

    const mapFormats = (value: string[]) => {
        return value.map((item: string) => {
            return {
                value: item,
                label: item,
            };
        });
    };

    // const mapLayerValue
    useEffect(() => {
        const getCapcache = async () => {
            if (store.connection) {
                const res = await route(
                    "resource.item",
                    store.connection.id
                ).get({
                    cache: true,
                });
                console.log(res);
                const capcache = res.wmsclient_connection.capcache;
                const options = mapLayers(capcache.layers);
                const formats = mapFormats(capcache.formats);
                setFormats(formats);
                setLayers(options);
            }
        };
        getCapcache();
    }, [store.connection]);

    return (
        <div className="ngw-wmsclient-layer-widget">
            <label>{gettext("WMS Connection")}</label>
            <ResourceSelectRef
                value={store.connection ? store.connection : null}
                onChange={async (resourceRef: ResourceRef | null) => {
                    if (resourceRef) {
                        const res = await getConnectionResource(resourceRef);
                        store.update({ connection: res });
                    }
                }}
                pickerOptions={{ requireClass: "wmsclient_connection" }}
            />
            <label>{gettext("Image format")}</label>
            <Select
                value={store.imgFormat}
                options={formats ? formats : undefined}
                onChange={(value) => {
                    store.update({ imgFormat: value });
                }}
            />
            <label>{gettext("WMS layers")}</label>
            <Select
                value={store.wmsLayers}
                mode="multiple"
                options={layers}
                onChange={(values) => {
                    store.update({ wmsLayers: values });
                }}
            />
            <label>{gettext("Vendor Parameters")}</label>
            {/* <EdiTable></EdiTable> */}
        </div>
    );
});

WmsClientLayerWidget.title = gettext("WMS Layer");
WmsClientLayerWidget.order = 10;
