import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
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
import type { WMSConnectionLayer } from "./type";

export const WmsClientLayerWidget: EditorWidgetComponent<
    EditorWidgetProps<WmsClientLayerStore>
> = observer(({ store }) => {
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

    useEffect(() => {
        const getCapcache = async () => {
            if (store.connection) {
                const { wmsclient_connection } = await route(
                    "resource.item",
                    store.connection.id
                ).get({
                    cache: true,
                });
                const capcache = wmsclient_connection?.capcache;
                const options = mapLayers(capcache.layers);
                const formats = mapFormats(capcache.formats);
                setFormats(formats);
                setLayers(options);
            }
        };
        getCapcache();
    }, [store.connection]);

    return (
        <Area pad cols={["1fr", "1fr"]}>
            <Lot row label={gettext("WMS Connection")}>
                <ResourceSelectRef
                    value={store.connection ? store.connection : null}
                    onChange={async (resourceRef: ResourceRef | null) => {
                        if (resourceRef) {
                            store.update({ connection: resourceRef });
                        }
                    }}
                    pickerOptions={{ requireClass: "wmsclient_connection" }}
                    style={{ width: "100%" }}
                />
            </Lot>
            <Lot row label={gettext("Image format")}>
                <Select
                    value={store.imgFormat}
                    options={formats ? formats : undefined}
                    onChange={(value) => {
                        store.update({ imgFormat: value });
                    }}
                    style={{ width: "100%" }}
                />
            </Lot>
            <Lot row label={gettext("WMS layers")}>
                <Select
                    value={store.wmsLayers}
                    mode="multiple"
                    options={layers}
                    onChange={(value) => {
                        store.update({ wmsLayers: value });
                    }}
                    style={{ width: "100%" }}
                />
            </Lot>
            <Lot row label={gettext("Vendor parameters")}>
                <Button
                    onClick={() =>
                        showModal(VendorParamsModal, {
                            value: store.vendorParams,
                            destroyOnClose: true,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange: (value: any) => {
                                store.update({ vendorParams: value });
                            },
                        })
                    }
                    style={{ width: "100%" }}
                >
                    {gettext("Edit vendor parameters")}
                </Button>
            </Lot>
        </Area>
    );
});

WmsClientLayerWidget.title = gettext("WMS Layer");
WmsClientLayerWidget.order = 10;
WmsClientLayerWidget.displayName = "WmsClientLayerWidget";
