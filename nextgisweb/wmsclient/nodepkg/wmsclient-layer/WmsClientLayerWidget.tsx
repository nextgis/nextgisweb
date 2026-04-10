import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Button, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { assert } from "@nextgisweb/jsrealm/error";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController, useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";
import type { WMSConnectionLayer } from "@nextgisweb/wmsclient/type/api";

import type { WmsClientLayerStore } from "./WmsClientLayerStore";

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
      mode="tags"
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
    const [wmsSrsCodes, setWmsSrsCodes] = useState<string[] | null>();
    const { lazyModal, modalHolder } = useShowModal();
    const { makeSignal } = useAbortController();

    const { data: localSrsList } = useRouteGet("spatial_ref_sys.collection");
    const remoteSrsInitialId = store.remote_srs.initial?.id;

    const srsOptions = useMemo<OptionType[] | undefined>(() => {
      if (wmsSrsCodes === undefined || !localSrsList) return undefined;

      if (wmsSrsCodes === null) {
        // Old connection: capcache has no SRS info - show saved value or fall back to EPSG:3857
        const id = remoteSrsInitialId ?? 3857;
        const local = localSrsList.find((s) => s.id === id);
        return local ? [{ value: local.id, label: local.display_name }] : [];
      }

      const options: OptionType[] = wmsSrsCodes.flatMap((code) => {
        const match = code.match(/^([A-Z]+):(\d+)$/i);
        if (!match) return [];
        const [, authName, authSrid] = match;
        const local = localSrsList.find(
          (s) =>
            s.auth_name?.toUpperCase() === authName.toUpperCase() &&
            s.auth_srid === parseInt(authSrid)
        );
        return [
          {
            value: local?.id,
            label: local ? (
              local.display_name
            ) : (
              <span>
                {code}{" "}
                <a
                  href={
                    routeURL("srs.catalog") +
                    "?q=" +
                    encodeURIComponent(code)
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {gettext("Add to Web GIS")}
                </a>
              </span>
            ),
            disabled: !local,
          },
        ];
      });

      // If the saved SRS is not in the WMS list, prepend it with a warning
      if (
        remoteSrsInitialId !== undefined &&
        !options.some((o) => o.value === remoteSrsInitialId)
      ) {
        const local = localSrsList.find((s) => s.id === remoteSrsInitialId);
        assert(local, "Initial remote SRS not found in local SRS list");
        options.unshift({
          value: local.id,
          label: `⚠ ${local.display_name}`,
        });
      }

      return options;
    }, [wmsSrsCodes, localSrsList, remoteSrsInitialId]);

    const connectionId = store.connection.value?.id;
    useEffect(() => {
      const getCapcache = async () => {
        if (!connectionId) return;
        const { wmsclient_connection } = await route(
          "resource.item",
          connectionId
        ).get({
          cache: true,
          signal: makeSignal(),
        });
        const capcache = wmsclient_connection?.capcache;
        if (capcache) {
          setLayers(
            capcache.layers.map((item: WMSConnectionLayer) => ({
              label: item.title,
              value: item.id,
            }))
          );
          setFormats(
            capcache.formats.map((item: string) => ({
              value: item,
              label: item,
            }))
          );
          const srsCodes = capcache.srs?.length ? capcache.srs : null;
          setWmsSrsCodes(srsCodes);
          if (store.remote_srs.value === null) {
            const has3857 =
              srsCodes === null ||
              srsCodes.some((c) => c.toUpperCase() === "EPSG:3857");
            if (has3857) store.remote_srs.value = { id: 3857 };
          }
        }
      };
      getCapcache();
    }, [connectionId, makeSignal, store.remote_srs]);

    return (
      <Area pad cols={["1fr", "1fr"]}>
        {modalHolder}
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

        <Lot row label={gettext("Remote SRS")} error={store.remote_srs.error}>
          <Select
            style={{ width: "100%" }}
            value={store.remote_srs.value?.id}
            options={srsOptions}
            onChange={(id) => {
              store.remote_srs.value = id !== undefined ? { id } : null;
            }}
          />
        </Lot>

        <Lot row label={gettext("Vendor parameters")}>
          <Button
            onClick={() => {
              lazyModal(() => import("./component/VendorParamsModal"), {
                value: store.vendor_params.value || undefined,
                destroyOnHidden: true,
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

WmsClientLayerWidget.displayName = "WmsClientLayerWidget";
WmsClientLayerWidget.title = gettext("WMS Layer");
WmsClientLayerWidget.activateOn = { create: true };
WmsClientLayerWidget.order = 10;
