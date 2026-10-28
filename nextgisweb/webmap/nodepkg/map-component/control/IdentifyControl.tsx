import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import { errorModal } from "@nextgisweb/gui/error";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";

import { ButtonControl } from "./ButtonControl";
import type { ControlProps } from "./MapControl";
import { ToggleControl } from "./ToggleControl";
import { useToggleGroupItem } from "./toggle-group/useToggleGroupItem";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";
import ClearIcon from "@nextgisweb/icon/material/close";

type IdentifyControlProps = ControlProps<{
  label?: string;
  groupId?: string;
  isDefaultGroupId?: boolean;
}>;

const IdentifyControl = observer(
  ({
    order,
    label,
    groupId,
    position,
    isDefaultGroupId = false,
  }: IdentifyControlProps) => {
    const { display } = useDisplayContext();
    const { isActive, makeDefault } = useToggleGroupItem(groupId);

    const { identify, map } = display;
    const { adapter, started } = map;
    const { identifyInfo, active } = identify;

    useEffect(() => {
      if (isDefaultGroupId) {
        makeDefault();
      }
    }, [isDefaultGroupId, makeDefault]);

    useEffect(() => {
      if (!isActive || !active || !started) return;
      return adapter.subscribeClick((event) => {
        identify
          .execute(event.pixel, event.pointerType === "touch" ? 2 : undefined)
          .catch(errorModal);
      });
    }, [adapter, started, isActive, active, identify]);

    if (!identifyInfo || !identifyInfo.response.featureCount) {
      return (
        <ToggleControl
          position={position}
          title={label}
          order={order}
          groupId={groupId}
        >
          <IdentifyIcon />
        </ToggleControl>
      );
    }

    return (
      <ButtonControl
        position={position}
        order={order}
        onClick={() => {
          display.identify.clear();
        }}
        title={gettext("Clear selection")}
      >
        <ClearIcon />
      </ButtonControl>
    );
  }
);

IdentifyControl.displayName = "IdentifyControl";

export default IdentifyControl;
