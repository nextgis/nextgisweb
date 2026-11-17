import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
  ActionToolbarAction,
  ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Radio, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ExtentFilterState, PhotoToolbarMode } from "./type";

import GoToIcon from "@nextgisweb/icon/material/center_focus_weak";
import ExtentIcon from "@nextgisweb/icon/material/crop_free/outline";
import OpenIcon from "@nextgisweb/icon/material/preview";

const msgViewMode = gettext("View");
const msgSelectMode = gettext("Selection");
const msgOpen = gettext("Open");
const msgGoto = gettext("Go to");
const msgExtentFilter = gettext("Show only photos in the current map extent");

export interface WebMapPhotoToolbarProps extends Omit<
  ActionToolbarProps,
  "actions"
> {
  mode: PhotoToolbarMode;
  hasSelection: boolean;
  extentFilter: ExtentFilterState;
  onModeChange: (mode: PhotoToolbarMode) => void;
  onOpen: () => void;
  onGoTo: () => void;
  onExtentFilterToggle: () => void;
}

export function WebMapPhotoToolbar({
  mode,
  hasSelection,
  extentFilter,
  onModeChange,
  onOpen,
  onGoTo,
  onExtentFilterToggle,
  ...props
}: WebMapPhotoToolbarProps) {
  const actions: ActionToolbarAction[] = [
    <Radio.Group
      key="mode"
      size="small"
      optionType="button"
      value={mode}
      onChange={(e) => onModeChange(e.target.value)}
      options={[
        { value: "view", label: msgViewMode },
        { value: "select", label: msgSelectMode },
      ]}
    />,
  ];

  if (mode === "select") {
    actions.push(
      {
        key: "open",
        icon: <OpenIcon />,
        title: msgOpen,
        disabled: !hasSelection,
        action: onOpen,
      },
      {
        key: "goto",
        icon: <GoToIcon />,
        title: msgGoto,
        disabled: !hasSelection,
        action: onGoTo,
      },
      <Tooltip key="extent" title={msgExtentFilter}>
        <Button
          size="small"
          type={extentFilter !== "off" ? "primary" : "default"}
          loading={extentFilter === "loading"}
          icon={<ExtentIcon />}
          onClick={onExtentFilterToggle}
        />
      </Tooltip>
    );
  }

  return <ActionToolbar size="small" {...props} actions={actions} />;
}
