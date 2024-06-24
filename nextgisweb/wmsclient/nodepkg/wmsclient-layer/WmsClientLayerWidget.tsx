import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import type { ResourceRef } from "@nextgisweb/resource/type/api";

import type { WmsClientLayerStore } from "./WmsClientLayerStore";
import { VendorParamsModal } from "./component/VendorParamsModal";

import "./WmsClientLayerWidget.less";
import type { WMSConnectionLayer } from "./type";
import { getConnectionResource } from "./util/getConnectionResource";

export const WmsClientLayerWidget: EditorWidgetComponent<
    EditorWidgetProps<WmsClientLayerStore>
> = observer(({ store }) => {
    const [open, setOpen] = useState<boolean>(false);

    const [layers, setLayers] = useState<OptionType[]>();
    const [formats, setFormats] = useState<OptionType[]>();

    const mapLayers = (value: WMSConnectionLayer[]) => {
        return value.map((item: WMSConnectionLayer) => {
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
                const { wmsclient_connection } = await route(
                    "resource.item",
                    store.connection.id
                ).get({
                    cache: true,
                });
                console.log(wmsclient_connection);
                const capcache = wmsclient_connection.capcache;
                const options = mapLayers(capcache.layers);
                const formats = mapFormats(capcache.formats);
                setFormats(formats);
                setLayers(options);
            }
        };
        getCapcache();
    }, [store.connection]);

    return (
        <>
            <div className="ngw-wmsclient-layer-widget">
                <label>{gettext("WMS Connection")}</label>
                <ResourceSelectRef
                    value={store.connection ? store.connection : null}
                    onChange={async (resourceRef: ResourceRef | null) => {
                        if (resourceRef) {
                            const res =
                                await getConnectionResource(resourceRef);
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
                    onChange={(value) => {
                        store.update({ wmsLayers: value });
                    }}
                />
                <label>{gettext("Vendor parameters")}</label>
                <Button
                    onClick={() =>
                        showModal(VendorParamsModal, {
                            value: store.vendorParams,
                            destroyOnClose: true,
                            onChange: (value: any) => {
                                store.update({ vendorParams: value });
                            },
                        })
                    }
                >
                    {gettext("Edit vendor parameters")}
                </Button>
            </div>
        </>
    );
});

WmsClientLayerWidget.title = gettext("WMS Layer");
WmsClientLayerWidget.order = 10;
