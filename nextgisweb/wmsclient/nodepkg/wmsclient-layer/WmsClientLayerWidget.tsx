import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import showModal from "@nextgisweb/gui/showModal";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { WmsClientLayerStore } from "./WmsClientLayerStore";
import { VendorParamsModal } from "./component/VendorParamsModal";
import type { WMSConnectionLayer } from "./type";

function LayersSelect({
    value,
    onChange,
    ...rest
}: {
    value: string;
    onChange: (val: string) => void;
}) {
    return (
        <Select
            mode="multiple"
            value={value ? value.split(",") : []}
            onChange={(val) => onChange(val?.join(","))}
            {...rest}
        />
    );
}

export const WmsClientLayerWidget: EditorWidget<WmsClientLayerStore> = observer(
    ({ store }) => {
        const [layers, setLayers] = useState<OptionType[]>();
        const [formats, setFormats] = useState<OptionType[]>();

        const { makeSignal } = useAbortController();

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
                if (store.connection.value) {
                    const { wmsclient_connection } = await route(
                        "resource.item",
                        store.connection.value.id
                    ).get({
                        cache: true,
                        signal: makeSignal(),
                    });
                    const capcache = wmsclient_connection?.capcache;
                    const options = mapLayers(capcache.layers);
                    const formats = mapFormats(capcache.formats);
                    setFormats(formats);
                    setLayers(options);
                }
            };
            getCapcache();
        }, [store.connection.value, makeSignal]);

        return (
            <Area pad cols={["1fr", "1fr"]}>
                <LotMV
                    row
                    label={gettext("WMS Connection")}
                    value={store.connection}
                    component={ResourceSelectRef}
                    props={{
                        pickerOptions: {
                            requireClass: "wmsclient_connection",
                            initParentId: store.composite.parent,
                        },
                        style: { width: "100%" },
                    }}
                />
                <LotMV
                    row
                    label={gettext("Image format")}
                    value={store.imgformat}
                    component={Select}
                    props={{
                        style: { width: "100%" },
                        options: formats ? formats : undefined,
                    }}
                />

                <LotMV
                    row
                    label={gettext("WMS layers")}
                    value={store.wmslayers}
                    component={LayersSelect}
                    props={{
                        style: { width: "100%" },
                        options: layers,
                    }}
                />

                <Lot row label={gettext("Vendor parameters")}>
                    <Button
                        onClick={() => {
                            showModal(VendorParamsModal, {
                                value: store.vendor_params.value || undefined,
                                destroyOnClose: true,
                                onChange: (value?: Record<string, string>) => {
                                    store.vendor_params.value = value;
                                },
                            });
                        }}
                        style={{ width: "100%" }}
                    >
                        {gettext("Edit vendor parameters")}
                    </Button>
                </Lot>
            </Area>
        );
    }
);

WmsClientLayerWidget.title = gettext("WMS Layer");
WmsClientLayerWidget.order = 10;
WmsClientLayerWidget.displayName = "WmsClientLayerWidget";
