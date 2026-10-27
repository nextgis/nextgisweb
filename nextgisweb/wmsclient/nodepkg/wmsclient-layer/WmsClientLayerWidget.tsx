import { observer } from "mobx-react-lite";
import { lazy, useEffect, useState } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Button, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";
import { SrsSelectExpandable } from "@nextgisweb/spatial-ref-sys/srs-select-expandable";
import type { WMSConnectionLayer } from "@nextgisweb/wmsclient/type/api";

import type { WmsClientLayerStore } from "./WmsClientLayerStore";
import { useWmsSrsItems } from "./useWmsSrsItems";

const VendorParamsModalLazy = lazy(
  () => import("./component/VendorParamsModal")
);

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
    const { showModal, modalHolder } = useShowModal();
    const { makeSignal } = useAbortController();

    const { srsItems, refresh: refreshSrs } = useWmsSrsItems({
      wmsSrsCodes,
      remoteSrs: store.remote_srs,
    });

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
          setWmsSrsCodes(capcache.srs?.length ? capcache.srs : null);
        }
      };
      getCapcache();
    }, [connectionId, makeSignal]);

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
          <SrsSelectExpandable
            style={{ width: "100%" }}
            value={store.remote_srs.value?.id}
            items={srsItems}
            onChange={(id) => {
              store.remote_srs.value = id !== undefined ? { id } : null;
            }}
            refresh={refreshSrs}
          />
        </Lot>

        <Lot row label={gettext("Vendor parameters")}>
          <Button
            onClick={() => {
              showModal(VendorParamsModalLazy, {
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
WmsClientLayerWidget.activateOn = { create: true, update: true };
WmsClientLayerWidget.order = 10;
