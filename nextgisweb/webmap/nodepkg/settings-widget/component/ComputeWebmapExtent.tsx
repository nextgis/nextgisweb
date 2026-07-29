import { useCallback, useTransition } from "react";

import { Button, Dropdown } from "@nextgisweb/gui/antd";
import { getExtentFromLayer } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import type { ExtentRowValue } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import { unionExtents } from "@nextgisweb/gui/component/extent-row/util";
import { getChildrenDeep } from "@nextgisweb/gui/util/tree";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useOptionalDisplayContext } from "@nextgisweb/webmap/display/context";
import type {
  WebMapItemGroupWrite,
  WebMapItemLayerWrite,
  WebMapItemRootWrite,
} from "@nextgisweb/webmap/type/api";
import { extractExtentFromArray } from "@nextgisweb/webmap/utils/extent";

import type { SettingStore } from "../SettingStore";

import { DownOutlined } from "@ant-design/icons";
import CurrentExtentIcon from "@nextgisweb/icon/material/center_focus_weak";
import ExtentFromAllIcon from "@nextgisweb/icon/material/zoom_out_map";

const msgCompute = gettext("Compute extent from all added layers");
const msgCurrentExtent = gettext("Use current map extent");

interface ComputeWebmapExtentProps {
  store: SettingStore;
  onDone?: (extent: ExtentRowValue) => void;
}

export function ComputeWebmapExtent({
  store,
  onDone,
}: ComputeWebmapExtentProps) {
  const [isPending, startTransition] = useTransition();
  const { makeSignal } = useAbortController();
  const displayContext = useOptionalDisplayContext();

  const handleClick = useCallback(() => {
    startTransition(async () => {
      try {
        const value = await store.composite.getValue();
        if (!value?.webmap?.root_item) return;

        const items = getChildrenDeep<
          WebMapItemGroupWrite | WebMapItemLayerWrite | WebMapItemRootWrite
        >(value.webmap.root_item);

        if (!items.length) return;

        const signal = makeSignal();

        const layers = items.filter((i) => i.item_type === "layer");

        if (!layers.length) return;

        const extents = await Promise.all(
          layers.map((item) =>
            getExtentFromLayer({
              resourceId: item.layer_style_id,
              signal,
            })
          )
        );

        const combined = unionExtents(extents);
        if (combined) {
          onDone?.(combined);
        }
      } catch {
        // ignore
      }
    });
  }, [store.composite, makeSignal, onDone]);

  const handleCurrentExtentClick = useCallback(() => {
    if (!displayContext) return;

    const { display } = displayContext;
    onDone?.(
      extractExtentFromArray(display.map.getExtent(display.lonlatProjection))
    );
  }, [displayContext, onDone]);

  if (displayContext) {
    return (
      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            {
              key: "layers",
              label: msgCompute,
              icon: <ExtentFromAllIcon />,
              onClick: handleClick,
            },
            {
              key: "map",
              label: msgCurrentExtent,
              icon: <CurrentExtentIcon />,
              onClick: handleCurrentExtentClick,
            },
          ],
        }}
      >
        <Button
          loading={isPending}
          title={msgCompute}
          icon={!isPending && <DownOutlined />}
        />
      </Dropdown>
    );
  }

  return (
    <Button
      onClick={handleClick}
      loading={isPending}
      title={msgCompute}
      icon={!isPending && <ExtentFromAllIcon />}
    ></Button>
  );
}
