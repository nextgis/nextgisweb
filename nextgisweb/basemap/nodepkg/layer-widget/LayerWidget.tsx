import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import { InputInteger, InputValue, Slider } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";
import { MapControl, URLLayer } from "@nextgisweb/webmap/map-component";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import type { LayerStore } from "./LayerStore";
import { QMSSelect } from "./component/QMSSelect";
import type { QMSService } from "./type";

const msgPickQms = gettext("Pick from QMS");

const msgPickQmsHelpMainPart = gettext("Search for geoservices provided by ");
const msgPickQmsHelpTodoPart = gettext("You can search by name or ID");

// prettier-ignore
const [msgDisabled, msgMaxZoomHelp, msgMinZoomHelp ] = [
    gettext("If a service from QMS is selected, this field cannot be edited."),
    gettext("Above this zoom level, no new tiles are fetched but tiles from the nearest allowed zoom are displayed and upscaled."),
    gettext("Below this zoom level, the layer is hidden and no new tiles are fetched.")
];

export const LayerWidget: EditorWidget<LayerStore> = observer(({ store }) => {
    const [qmsId, setQmsId] = useState<number>();

    const disabled = useMemo(() => qmsId !== undefined, [qmsId]);

    const [opacity, setOpacity] = useState(100);

    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (store.loaded && store.qms.value) {
            try {
                const qmsId = JSON.parse(store.qms.value) as QMSService;
                setQmsId(qmsId.id);
            } finally {
                setInitialized(true);
            }
        }
    }, [store.loaded, store.qms.value]);

    // Clean store qms but do not touch copyright_text and copyright_url
    useEffect(() => {
        if (initialized && !qmsId) {
            store.qms.value = null;
        }
    }, [initialized, qmsId, store.qms]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                height: "100%",
            }}
        >
            <div style={{ flex: "none" }}>
                <Area pad style={{ height: "100%" }} cols={["1fr", "1fr"]}>
                    <Lot
                        label={msgPickQms}
                        row
                        help={() => (
                            <>
                                {msgPickQmsHelpMainPart}
                                <a href={settings.qms_url} target="_blank">
                                    NextGIS QMS
                                </a>
                                . {msgPickQmsHelpTodoPart}.
                            </>
                        )}
                    >
                        <QMSSelect
                            value={qmsId}
                            onChange={setQmsId}
                            onService={(service) => {
                                store.url.value = service.url;
                                store.copyrightText.value =
                                    service.copyright_text;
                                store.copyrightUrl.value =
                                    service.copyright_url;
                                store.qms.value = JSON.stringify(service);
                                store.maxzoom.value = service.z_max;
                                store.minzoom.value = service.z_min;
                            }}
                        ></QMSSelect>
                    </Lot>

                    <LotMV
                        help={disabled ? msgDisabled : undefined}
                        row
                        value={store.url}
                        component={InputValue}
                        label={gettext("URL")}
                        props={{ disabled }}
                    />

                    <LotMV
                        help={disabled ? msgDisabled : undefined}
                        row
                        label={gettext("Copyright text")}
                        value={store.copyrightText}
                        component={InputValue}
                        props={{ disabled }}
                    />
                    <LotMV
                        help={disabled ? msgDisabled : undefined}
                        row
                        label={gettext("Copyright URL")}
                        value={store.copyrightUrl}
                        component={InputValue}
                        props={{ disabled }}
                    />
                    <LotMV
                        help={disabled ? msgDisabled : msgMinZoomHelp}
                        label={gettext("Min zoom level")}
                        value={store.minzoom}
                        component={InputInteger}
                        props={{
                            disabled,
                            min: 0,
                            max: 24,
                            style: { width: "100%" },
                        }}
                    />
                    <LotMV
                        help={disabled ? msgDisabled : msgMaxZoomHelp}
                        label={gettext("Max zoom level")}
                        value={store.maxzoom}
                        component={InputInteger}
                        props={{
                            disabled,
                            min: 0,
                            max: 24,
                            style: { width: "100%" },
                        }}
                    />
                </Area>
            </div>
            {store.url.value ? (
                <div
                    style={{
                        flex: 1,
                        padding: "2em 0px 0px",
                    }}
                >
                    <PreviewMap
                        showZoomLevel
                        style={{
                            height: "100%",
                            borderRadius: "4px",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: "#d9d9d9",
                        }}
                    >
                        <MapControl position="top-right">
                            <div style={{ width: 200 }}>
                                <Slider
                                    min={0}
                                    max={100}
                                    value={opacity}
                                    onChange={setOpacity}
                                    tooltip={{
                                        formatter: (value) => `${value}%`,
                                    }}
                                />
                            </div>
                        </MapControl>
                        <URLLayer
                            url={store.url.value}
                            key={qmsId}
                            opacity={opacity}
                            attributions={
                                store.copyrightUrl.value
                                    ? `<a href="${store.copyrightUrl.value}" target="_blank">${store.copyrightText.value}</a>`
                                    : store.copyrightText.value
                            }
                            layerOptions={{
                                // Put minZoom in layerOptions (not sourceOptions, as with maxZoom) to avoid triggering
                                // an avalanche of high‑zoom tiles when zoomed out. Below this zoom, the layer is simply
                                // hidden instead of trying to fetch zoom‑18 tiles at zoom‑0, for example.
                                // Although this differs from maxZoom’s upscaling behavior, but it makes the map more stable
                                // and since minZoom is realy rarely used, it shouldn't cause any problems.
                                minZoom: store.minzoom.value ?? undefined,
                            }}
                            sourceOptions={{
                                maxZoom: store.maxzoom.value ?? undefined,
                            }}
                        />
                    </PreviewMap>
                </div>
            ) : null}
        </div>
    );
});

LayerWidget.displayName = "LayerWidget";
LayerWidget.title = gettext("Basemap");
LayerWidget.activateOn = { create: true };
