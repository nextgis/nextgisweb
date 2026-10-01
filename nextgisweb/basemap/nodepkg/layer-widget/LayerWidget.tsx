import { observer } from "mobx-react-lite";
import { useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import type { BasemapType } from "@nextgisweb/basemap/type/api";
import { InputInteger, InputValue, Segmented } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";
import { URLLayer } from "@nextgisweb/webmap/map-component";
import { OpacityControl } from "@nextgisweb/webmap/map-component/control/OpacityControl";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import { GeoservicesBanner } from "./GeoservicesBanner";
import type { LayerStore } from "./LayerStore";
import { QMSSelect } from "./component/QMSSelect";

/* prettier-ignore */ const
msgPickQms = gettext("Pick from QMS"),
msgPickQmsHelpMainPart = gettext("Search for geoservices provided by "),
msgPickQmsHelpTodoPart = gettext("You can search by name or ID"),
msgDisabled = gettext("If a service from QMS is selected, this field cannot be edited."),
msgMaxZoomHelp = gettext("Above this zoom level, no new tiles are fetched but tiles from the nearest allowed zoom are displayed and upscaled."),
msgMinZoomHelp = gettext("Below this zoom level, the layer is hidden and no new tiles are fetched.");

export const LayerWidget: EditorWidget<LayerStore> = observer(({ store }) => {
  const qmsId = store.qms.value?.id;
  const disabled = qmsId !== undefined;
  const [opacity, setOpacity] = useState(100);
  const url = store.url.value;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <GeoservicesBanner />
      <div style={{ flex: "none" }}>
        <Area pad style={{ height: "100%" }} cols={["1fr", "1fr", "1fr"]}>
          <Lot
            label={msgPickQms}
            row
            help={() => (
              <>
                {msgPickQmsHelpMainPart}
                <a href={settings.qms.url} target="_blank">
                  NextGIS QMS
                </a>
                . {msgPickQmsHelpTodoPart}.
              </>
            )}
          >
            <QMSSelect
              value={qmsId}
              selected={store.qms.value}
              onChange={(value) => {
                if (value === undefined) {
                  store.qms.value = null;
                }
              }}
              onService={(service) => {
                if (service.type !== "tms" && service.type !== "vector_tiles") {
                  return;
                }
                store.type.value = service.type;
                store.url.value = service.url;
                store.epsg.value = service.epsg;
                store.copyrightText.value = service.copyright_text;
                store.copyrightUrl.value = service.copyright_url;
                store.qms.value = {
                  id: service.id,
                  name: service.name,
                };
                store.maxzoom.value = service.z_max;
                store.minzoom.value = service.z_min;
              }}
            ></QMSSelect>
          </Lot>
          <LotMV
            label={gettext("Type")}
            help={disabled ? msgDisabled : undefined}
            row
            value={store.type}
            component={Segmented<BasemapType>}
            props={{
              disabled,
              options: [
                { value: "tms", label: gettext("TMS") },
                { value: "vector_tiles", label: gettext("Vector tiles") },
              ],
            }}
          />
          <LotMV
            help={disabled ? msgDisabled : undefined}
            row
            value={store.url}
            component={InputValue}
            label={
              store.type.value === "vector_tiles"
                ? gettext("Style URL")
                : gettext("URL")
            }
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
          {store.type.value !== "vector_tiles" && (
            <>
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
              <LotMV
                help={disabled ? msgDisabled : undefined}
                label={gettext("EPSG")}
                value={store.epsg}
                component={InputInteger}
                props={{
                  disabled,
                  style: { width: "100%" },
                }}
              />
            </>
          )}
        </Area>
      </div>
      {url ? (
        <div style={{ flex: 1 }}>
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
            <OpacityControl value={opacity} onChange={setOpacity} />
            <URLLayer
              url={url}
              key={qmsId}
              type={store.type.value}
              opacity={opacity}
              copyrightText={store.copyrightText.value}
              copyrightUrl={store.copyrightUrl.value}
              layerOptions={{
                // Put minZoom in layerOptions (not sourceOptions, as with maxZoom) to avoid triggering
                // an avalanche of high‑zoom tiles when zoomed out. Below this zoom, the layer is simply
                // hidden instead of trying to fetch zoom‑18 tiles at zoom‑0, for example.
                // Although this differs from maxZoom’s upscaling behavior, but it makes the map more stable
                // and since minZoom is realy rarely used, it shouldn't cause any problems.
                minZoom: store.minzoom.value ?? undefined,
              }}
              sourceOptions={{
                projection: `EPSG:${store.epsg.value}`,
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
