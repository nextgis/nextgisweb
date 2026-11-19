import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
  ActionToolbarAction,
  ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ExtentFilterStatus } from "./hook/useExtentFilter";

import ExtentIcon from "@nextgisweb/icon/material/crop_free/outline";

const msgExtentFilter = gettext("Show only photos in the current map extent");

export interface WebMapPhotoToolbarProps extends Omit<
  ActionToolbarProps,
  "actions"
> {
  extentFilterStatus: ExtentFilterStatus;
  onExtentFilterToggle: () => void;
}

export function WebMapPhotoToolbar({
  extentFilterStatus,
  onExtentFilterToggle,
  ...props
}: WebMapPhotoToolbarProps) {
  const actions: ActionToolbarAction[] = [
    <Tooltip key="extent" title={msgExtentFilter}>
      <Button
        size="small"
        type={extentFilterStatus !== "off" ? "primary" : "default"}
        loading={extentFilterStatus === "loading"}
        icon={<ExtentIcon />}
        onClick={onExtentFilterToggle}
      />
    </Tooltip>,
  ];

  return <ActionToolbar size="small" {...props} actions={actions} />;
}
