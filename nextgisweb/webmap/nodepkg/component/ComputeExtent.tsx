import { useCallback, useState } from "react";

import { Button, Dropdown } from "@nextgisweb/gui/antd";
import { getExtentFromLayer } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import type { ExtentRowValue } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import { unionExtents } from "@nextgisweb/gui/component/extent-row/util";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { DownOutlined } from "@ant-design/icons";
import CurrentExtentIcon from "@nextgisweb/icon/material/center_focus_weak";
import ExtentFromAllIcon from "@nextgisweb/icon/material/zoom_out_map";

const msgCompute = gettext("Compute extent from all added layers");
const msgCurrentExtent = gettext("Use current map extent");

export interface ComputeExtentProps {
  getCurrentExtent?: () => ExtentRowValue;
  getLayerIds: () => Promise<number[]>;
  onDone: (extent: ExtentRowValue) => void;
}

export function ComputeExtent({
  getCurrentExtent,
  getLayerIds,
  onDone,
}: ComputeExtentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { makeSignal } = useAbortController();

  const handleClick = useCallback(async () => {
    const signal = makeSignal();
    setIsLoading(true);
    try {
      const resourceIds = await getLayerIds();
      if (signal.aborted || !resourceIds.length) return;

      const extents = await Promise.all(
        resourceIds.map((resourceId) =>
          getExtentFromLayer({ resourceId, signal })
        )
      );

      const combined = unionExtents(extents);
      if (!signal.aborted && combined) {
        onDone(combined);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [getLayerIds, makeSignal, onDone]);

  const handleCurrentExtentClick = useCallback(() => {
    if (getCurrentExtent) {
      onDone(getCurrentExtent());
    }
  }, [getCurrentExtent, onDone]);

  if (getCurrentExtent) {
    return (
      <Dropdown
        disabled={isLoading}
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
          loading={isLoading}
          title={msgCompute}
          icon={!isLoading && <DownOutlined />}
        />
      </Dropdown>
    );
  }

  return (
    <Button
      icon={!isLoading && <ExtentFromAllIcon />}
      title={msgCompute}
      loading={isLoading}
      onClick={handleClick}
    />
  );
}
