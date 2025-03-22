import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import {
    InputNumber,
    InputValue,
    Select,
    Space,
    Tooltip,
} from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { ExtentRow } from "@nextgisweb/gui/component";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import { Area } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";
import type {
    ConnectionRead,
    InspectResponse,
} from "@nextgisweb/tmsclient/type/api";

import type { TmsClientLayerStore } from "./TmsClientLayerStore";

import CloudIcon from "@nextgisweb/icon/material/cloud";

type Capmode = ConnectionRead["capmode"];

const capmodeHints: Record<Capmode & string, string> = {
    "nextgis_geoservices": gettext(
        "This connection based on NextGIS Geoservices"
    ),
};

export const TmsClientLayerWidget: EditorWidget<TmsClientLayerStore> = observer(
    ({ store }) => {
        const [layers, setLayers] = useState<InspectResponse["layers"]>();

        const { makeSignal, abort } = useAbortController();

        const [capmode, setCapmode] = useState<Capmode>(null);
        const [urlTemplate, setUrlTemplate] = useState<string>();

        const hasLayer = useMemo(() => {
            return (
                store.layer_name.value ||
                (urlTemplate && urlTemplate.search("{layer}"))
            );
        }, [store.layer_name.value, urlTemplate]);

        const options = useMemo(() => {
            if (layers) {
                return layers.map((v) => ({
                    label: v.description,
                    value: v.layer,
                }));
            }
            return [];
        }, [layers]);

        useEffect(() => {
            setLayers(undefined);

            async function fetchConnectionType(resourceId: number) {
                const signal = makeSignal();
                try {
                    const resource = await route(
                        "resource.item",
                        resourceId
                    ).get({
                        signal,
                    });
                    if ("tmsclient_connection" in resource) {
                        const tmsclientConnection =
                            resource.tmsclient_connection;
                        if (tmsclientConnection) {
                            setUrlTemplate(tmsclientConnection.url_template);
                            setCapmode(tmsclientConnection.capmode);

                            const inspect = await route(
                                "tmsclient.connection.inspect",
                                resourceId
                            ).get({ signal });
                            if (inspect.layers.length) {
                                setLayers(inspect.layers);
                            }
                        }
                    }
                } catch (err) {
                    if (!isAbortError(err)) {
                        errorModal(err);
                    }
                }
            }
            if (store.connection.value) {
                fetchConnectionType(store.connection.value.id);
            }
            return abort;
        }, [abort, makeSignal, store.connection.value]);

        useEffect(() => {
            if (layers && store.composite.operation === "create") {
                const layer = layers.find(
                    (l) => l.layer === store.layer_name.value
                );
                if (layer) {
                    store.minzoom.load(layer.minzoom);
                    store.maxzoom.load(layer.maxzoom);
                    store.tilesize.load(layer.tilesize);
                }
            }
        }, [layers, store, store.layer_name.value]);

        return (
            <Area pad cols={3}>
                <LotMV
                    row
                    label={gettext("TMS connection")}
                    value={store.connection}
                    component={ResourceSelectRef}
                    props={{
                        pickerOptions: {
                            requireClass: "tmsclient_connection",
                            initParentId: store.composite.parent,
                        },
                        style: { width: "100%" },
                        labelRender: ({ label }) => (
                            <Space>
                                {capmode ? (
                                    <Tooltip title={capmodeHints[capmode]}>
                                        <CloudIcon style={{ color: "blue" }} />
                                    </Tooltip>
                                ) : (
                                    ""
                                )}
                                {label}
                            </Space>
                        ),
                    }}
                />
                {hasLayer && options.length ? (
                    <LotMV
                        row
                        value={store.layer_name}
                        label={gettext("Layer")}
                        component={Select}
                        props={{
                            options,
                            style: { width: "100%" },
                        }}
                    />
                ) : (
                    <LotMV
                        row
                        value={store.layer_name}
                        label={gettext("Layer")}
                        component={InputValue}
                        props={{
                            style: { width: "100%" },
                        }}
                    />
                )}
                <LotMV
                    label={gettext("Min zoom level")}
                    value={store.minzoom}
                    component={InputNumber}
                    props={{
                        style: { width: "100%" },
                    }}
                />
                <LotMV
                    label={gettext("Max zoom level")}
                    value={store.maxzoom}
                    component={InputNumber}
                    props={{
                        style: { width: "100%" },
                    }}
                />
                <LotMV
                    label={gettext("Tile size")}
                    value={store.tilesize}
                    component={InputNumber}
                    props={{
                        addonAfter: "px",
                        style: { width: "100%" },
                    }}
                />
                <LotMV
                    row
                    label={gettext("Extent")}
                    value={store.extent}
                    component={ExtentRow}
                />
            </Area>
        );
    }
);

TmsClientLayerWidget.displayName = "TmsClientLayerWidget";
TmsClientLayerWidget.title = gettext("TMS layer");
TmsClientLayerWidget.order = 10;
