import { useMemo } from "react";

import { Button, Dropdown, message } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  Photo,
  PhotoTransform,
} from "@nextgisweb/webmap/photo/PhotoLayerStore";
import { usePhotoTransform } from "@nextgisweb/webmap/photo/hook/usePhotoTransform";

import type { PhotoToolPluginProps } from "../registry";

import { useLocationSort } from "./useLocationSort";
import type { LocationSortMode } from "./useLocationSort";

import SortIcon from "@nextgisweb/icon/material/sort";

const msgSort = gettext("Sort");
const msgSortFailed = gettext("Failed to sort photos by location");

const items: NonNullable<MenuProps["items"]> = [
  { key: "none", label: gettext("None") },
  { key: "west-east", label: gettext("West to east") },
  { key: "north-south", label: gettext("North to south") },
];

export default function SortTool({ store }: PhotoToolPluginProps) {
  const [messageApi, contextHolder] = message.useMessage();

  const { mode, positions, loading, select } = useLocationSort({
    store,
    onError: () => messageApi.error(msgSortFailed),
  });

  const transform = useMemo<PhotoTransform | undefined>(() => {
    if (mode === "none" || !positions) return undefined;
    const axis = mode === "west-east" ? 0 : 1;
    const sign = mode === "west-east" ? 1 : -1;
    const value = (p: Photo) => positions.get(p.featureId)?.[axis];
    return (photos) =>
      photos.toSorted((a, b) => {
        const va = value(a);
        const vb = value(b);
        if (va === undefined) return vb === undefined ? 0 : 1;
        if (vb === undefined) return -1;
        return sign * (va - vb);
      });
  }, [mode, positions]);
  usePhotoTransform(store, "sort", transform);

  return (
    <>
      {contextHolder}
      <Dropdown
        trigger={["click"]}
        menu={{
          items,
          selectable: true,
          selectedKeys: [mode],
          onClick: ({ key }) => select(key as LocationSortMode),
        }}
      >
        <Button
          size="small"
          type={mode !== "none" ? "primary" : "default"}
          loading={loading}
          iconPlacement="end"
          icon={<SortIcon />}
        >
          {msgSort}
        </Button>
      </Dropdown>
    </>
  );
}
