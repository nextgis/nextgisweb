import { observer } from "mobx-react-lite";
import type { MapBrowserEvent } from "ol";
import Interaction from "ol/interaction/Interaction";
import { useEffect, useMemo } from "react";

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

        const identifyInfo = display.identify.identifyInfo;

        useEffect(() => {
            if (isDefaultGroupId) {
                makeDefault();
            }
        }, [isDefaultGroupId, makeDefault]);

        const interaction = useMemo(() => {
            const handleEvent = (evt: MapBrowserEvent<any>) => {
                if (evt.type === "singleclick") {
                    display.identify.execute(evt.pixel);
                    evt.preventDefault?.();
                }
                return true;
            };
            return new Interaction({ handleEvent });
        }, [display.identify]);

        useEffect(() => {
            if (!isActive) {
                display.identify.setControl(null);
                return;
            }

            display.identify.setControl(interaction);

            return () => {
                display.identify.setControl(null);
            };
        }, [isActive, interaction, display.identify]);

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
