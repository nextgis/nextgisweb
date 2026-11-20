import { useMemo } from "react";

import { Button, message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  Photo,
  PhotoTransform,
} from "@nextgisweb/webmap/photo/PhotoLayerStore";
import { usePhotoTransform } from "@nextgisweb/webmap/photo/hook/usePhotoTransform";

import type { PhotoToolPluginProps } from "../registry";

import { useExtentFilter } from "./useExtentFilter";

import ExtentIcon from "@nextgisweb/icon/material/crop_free/outline";

const msgLeaveVisible = gettext("Leave visible");
const msgExtentFilterFailed = gettext("Failed to filter photos by map extent");

export default function ExtentFilterTool({
  store,
  display,
  programmaticExtent,
}: PhotoToolPluginProps) {
  const [messageApi, contextHolder] = message.useMessage();

  const { status, featureIds, toggle } = useExtentFilter({
    store,
    display,
    programmaticExtent,
    onError: () => messageApi.error(msgExtentFilterFailed),
  });

  const transform = useMemo<PhotoTransform | undefined>(
    () =>
      featureIds &&
      ((photos: Photo[]) => photos.filter((p) => featureIds.has(p.featureId))),
    [featureIds]
  );
  usePhotoTransform(store, "extent", transform);

  return (
    <>
      {contextHolder}
      <Button
        size="small"
        type={status !== "off" ? "primary" : "default"}
        icon={<ExtentIcon />}
        iconPlacement="end"
        loading={status === "loading"}
        onClick={toggle}
      >
        {msgLeaveVisible}
      </Button>
    </>
  );
}
