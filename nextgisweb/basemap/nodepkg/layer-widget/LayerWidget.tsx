import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import { InputValue, Slider } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";
import { MapControl, UrlLayer } from "@nextgisweb/webmap/map-component";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import type { LayerStore } from "./LayerStore";
import { QMSSelect } from "./component/QMSSelect";
import type { QMSService } from "./type";

const msgPickQms = gettext("Pick from QMS");

const msgPickQmsHelpMainPart = gettext("Search for geoservices provided by ");
const msgPickQmsHelpTodoPart = gettext("You can search by name or ID");

// prettier-ignore
const msgDisabled = gettext("If a service from QMS is selected, this field cannot be edited.");

export const LayerWidget: EditorWidget<LayerStore> = observer(({ store }) => {
    const [qmsId, setQmsId] = useState<number>();

    const disabled = useMemo(() => qmsId !== undefined, [qmsId]);

    const [opacity, setOpacity] = useState(100);

    useEffect(() => {
        if (store.loaded && store.qms.value) {
            try {
                const qmsId = JSON.parse(store.qms.value) as QMSService;
                setQmsId(qmsId.id);
            } catch {
                //
            }
        }
    }, [store.loaded, store.qms.value]);

    // Clean store qms but do not touch copyright_text and copyright_url
    useEffect(() => {
        if (!qmsId) {
            store.qms.value = null;
        }
    }, [qmsId, store.qms]);

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
                <Area pad style={{ height: "100%" }}>
                    <Lot
                        label={msgPickQms}
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
                                store.copyright_text.value =
                                    service.copyright_text;
                                store.copyright_url.value =
                                    service.copyright_url;
                                store.qms.value = JSON.stringify(service);
                            }}
                        ></QMSSelect>
                    </Lot>

                    <LotMV
                        help={disabled ? msgDisabled : undefined}
                        value={store.url}
                        component={InputValue}
                        label={gettext("URL")}
                        props={{
                            disabled,
                        }}
                    />

                    <LotMV
                        help={disabled ? msgDisabled : undefined}
                        label={gettext("Copyright text")}
                        value={store.copyright_text}
                        component={InputValue}
                        props={{
                            disabled,
                        }}
                    />
                    <LotMV
                        help={disabled ? msgDisabled : undefined}
                        label={gettext("Copyright URL")}
                        value={store.copyright_url}
                        component={InputValue}
                        props={{
                            disabled,
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
                        <UrlLayer
                            url={store.url.value}
                            key={qmsId}
                            opacity={opacity}
                            attributions={
                                store.copyright_url.value
                                    ? `<a href="${store.copyright_url.value}" target="_blank">${store.copyright_text.value}</a>`
                                    : store.copyright_text.value
                            }
                        />
                    </PreviewMap>
                </div>
            ) : null}
        </div>
    );
});

LayerWidget.displayName = "LayerWidget";
LayerWidget.title = gettext("Basemaps");
