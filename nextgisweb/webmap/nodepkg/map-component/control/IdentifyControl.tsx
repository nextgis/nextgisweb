import type { MapBrowserEvent } from "ol";
import Interaction from "ol/interaction/Interaction";
import { useEffect, useMemo } from "react";

import { useDisplayContext } from "@nextgisweb/webmap/display/context";

import { useToggleGroupItem } from "./toggle-group/useToggleGroupItem";

type Props = {
    groupId?: string;
    isDefaultGroupId?: boolean;
};

export default function IdentifyControl({
    groupId,
    isDefaultGroupId = false,
}: Props) {
    const { display } = useDisplayContext();
    const { isActive, makeDefault } = useToggleGroupItem(groupId);

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

    return null;
}
