import { useCallback } from "react";

import { useMapContext } from "../context/useMapContext";

import { ButtonControl } from "./ButtonControl";
import type { ControlProps } from "./MapControl";

import HomeIcon from "@nextgisweb/icon/material/home";

export default function InitialExtentControl(props: ControlProps) {
    const { mapStore } = useMapContext();

    const onClick = useCallback(() => {
        mapStore.zoomToInitialExtent();
    }, [mapStore]);

    return (
        <ButtonControl {...props} onClick={onClick}>
            <HomeIcon />
        </ButtonControl>
    );
}
