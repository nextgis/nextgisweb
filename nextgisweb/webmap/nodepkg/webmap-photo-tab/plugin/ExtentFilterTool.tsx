import { useMemo } from "react";

import { Button, Tooltip, message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  Photo,
  PhotoTransform,
} from "@nextgisweb/webmap/photo/PhotoLayerStore";
import { usePhotoTransform } from "@nextgisweb/webmap/photo/hook/usePhotoTransform";

import { useExtentFilter } from "../hook/useExtentFilter";
import type { PhotoToolPluginProps } from "../registry";

import ExtentIcon from "@nextgisweb/icon/material/crop_free/outline";

const msgExtentFilter = gettext("Show only photos in the current map extent");
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
      <Tooltip title={msgExtentFilter}>
        <Button
          size="small"
          type={status !== "off" ? "primary" : "default"}
          loading={status === "loading"}
          icon={<ExtentIcon />}
          onClick={toggle}
        />
      </Tooltip>
    </>
  );
}
