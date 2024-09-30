import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { InputValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!basemap";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";
import { Basemap, MapComponent } from "@nextgisweb/webmap/preview-map";

import type { LayerStore } from "./LayerStore";
import { QMSSelect } from "./component/QMSSelect";
import type { QMSService } from "./type";

const msgPickQms = gettext("Pick from QMS");
// eslint-disable-next-line prettier/prettier
const msgPickQmsHelpMainPart = gettext("Search for geoservices provided by ");
const msgPickQmsHelpTodoPart = gettext("You can search by name or ID");

// eslint-disable-next-line prettier/prettier
const msgDisabled = gettext("If a service from QMS is selected, this field cannot be edited.");

export const LayerWidget: EditorWidgetComponent<EditorWidgetProps<LayerStore>> =
    observer(({ store }) => {
        const [qmsId, setQmsId] = useState<number>();

        const disabled = useMemo(() => qmsId !== undefined, [qmsId]);

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
            <>
                <Area pad>
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
                {store.url.value ? (
                    <MapComponent
                        osm
                        style={{
                            margin: "1em",
                            height: "400px",
                            borderRadius: "4px",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: "#d9d9d9",
                        }}
                        whenCreated={(adapter) => {
                            const observer = new ResizeObserver(() => {
                                adapter?.map.updateSize();
                            });
                            observer.observe(
                                adapter?.map.getTargetElement() as Element
                            );
                        }}
                    >
                        <Basemap
                            url={store.url.value}
                            key={qmsId}
                            attributions={
                                store.copyright_url.value
                                    ? `<a href="${store.copyright_url.value}" target="_blank">${store.copyright_text.value}</a>`
                                    : store.copyright_text.value
                            }
                        />
                    </MapComponent>
                ) : null}
            </>
        );
    });

LayerWidget.displayName = "LayerWidget";
LayerWidget.title = gettext("Basemaps");
