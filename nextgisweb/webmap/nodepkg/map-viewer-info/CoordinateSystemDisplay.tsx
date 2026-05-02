import { observer } from "mobx-react-lite";

import { useRouteGet } from "@nextgisweb/pyramid/hook";
import settings from "@nextgisweb/webmap/client-settings";

import { useMapContext } from "../map-component/context/useMapContext";

import "./CoordinateSystemDisplay.less";

function SrsDisplay({ srsId }: { srsId: number }) {
  const { data: srsInfo, isLoading } = useRouteGet({
    name: "spatial_ref_sys.item",
    params: { id: srsId },
  });

  if (isLoading || !srsInfo) {
    return null;
  }

  return (
    <div className="coordinate-system-display" title={srsInfo.display_name}>
      <span className="srs-name">{srsInfo.display_name}</span>
    </div>
  );
}

export const CoordinateSystemDisplay = observer(() => {
  const { mapStore } = useMapContext();

  const srsId = mapStore.measureSrsId || settings.measurement_srid;

  if (!srsId) {
    return null;
  }

  return <SrsDisplay srsId={srsId} />;
});

CoordinateSystemDisplay.displayName = "CoordinateSystemDisplay";
