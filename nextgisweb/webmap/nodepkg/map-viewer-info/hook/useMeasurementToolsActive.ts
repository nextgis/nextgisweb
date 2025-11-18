import { useMemo } from "react";

import { useMemoDebounce } from "@nextgisweb/pyramid/hook/useMemoDebounce";

import { useToggleGroupItem } from "../../map-component/control/toggle-group/useToggleGroupItem";

export function useMeasurementToolsActive() {
    const measuringLength = useToggleGroupItem("measuringLength");
    const measuringArea = useToggleGroupItem("measuringArea");

    const isActive = useMemo(
        () => measuringLength.isActive || measuringArea.isActive,
        [measuringLength.isActive, measuringArea.isActive]
    );

    return useMemoDebounce(isActive, 100);
}
