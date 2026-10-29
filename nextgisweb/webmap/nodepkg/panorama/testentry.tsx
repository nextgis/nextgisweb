/** @testentry react */
import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Button, InputNumber, Space } from "@nextgisweb/gui/antd";

import { PanoramaProviderSelect } from "./PanoramaProviderSelect";
import { PanoramaStore } from "./PanoramaStore";
import { PanoramaViewer } from "./PanoramaViewer";
import { panoramaSettings } from "./client-settings";
import { usePanoramaAvailability } from "./hook/usePanoramaAvailability";
import type { PanoramaStatus } from "./type";

const PanoramaTestentry = observer(() => {
  const [store] = useState(() => {
    const s = new PanoramaStore();
    s.setPosition(56.324808, 43.98455);
    return s;
  });
  const [checkStatus, setCheckStatus] = useState<PanoramaStatus>();

  const { element: checker, check } = usePanoramaAvailability(store.provider);

  if (!panoramaSettings.enabled || !panoramaSettings.provider) {
    return <div>No active panorama provider configured</div>;
  }

  const position = store.position ?? { lat: 0, lng: 0 };

  const updatePosition = (next: Partial<typeof position>) => {
    const { lat, lng } = { ...position, ...next };
    store.setPosition(lat, lng);
    setCheckStatus(undefined);
  };

  const checkPoint = async () => {
    setCheckStatus("loading");
    const result = await check(position.lat, position.lng);
    setCheckStatus(result.status);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {checker}
      <Space>
        <Space.Compact>
          <Space.Addon>Lat</Space.Addon>
          <InputNumber
            value={position.lat}
            onChange={(lat) => lat !== null && updatePosition({ lat })}
          />
        </Space.Compact>
        <Space.Compact>
          <Space.Addon>Lng</Space.Addon>
          <InputNumber
            value={position.lng}
            onChange={(lng) => lng !== null && updatePosition({ lng })}
          />
        </Space.Compact>
        <PanoramaProviderSelect store={store} />
        <Button onClick={checkPoint} loading={checkStatus === "loading"}>
          Check point
        </Button>
        {checkStatus && checkStatus !== "loading" && <span>{checkStatus}</span>}
      </Space>
      <div>
        Status: {store.status}, heading: {store.pov.heading}, pitch:{" "}
        {store.pov.pitch}
      </div>
      <PanoramaViewer store={store} style={{ height: 600 }} />
    </div>
  );
});

PanoramaTestentry.displayName = "PanoramaTestentry";

export default PanoramaTestentry;
