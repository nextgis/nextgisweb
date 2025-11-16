import { debounce } from "lodash-es";
import { useEffect, useMemo, useState } from "react";

import { useToggleGroupItem } from "../../map-component/control/toggle-group/useToggleGroupItem";

export function useMeasurementToolsActive() {
    const measuringLength = useToggleGroupItem("measuringLength");
    const measuringArea = useToggleGroupItem("measuringArea");

    const isActive = useMemo(
        () => measuringLength.isActive || measuringArea.isActive,
        [measuringLength.isActive, measuringArea.isActive]
    );

    const [debouncedActive, setDebouncedActive] = useState(isActive);

    const setDebouncedFalse = useMemo(
        () =>
            debounce(() => {
                setDebouncedActive(false);
            }, 100),
        []
    );

    useEffect(() => {
        if (isActive) {
            setDebouncedFalse.cancel();
            setDebouncedActive(true);
        } else {
            setDebouncedFalse();
        }

        return () => {
            setDebouncedFalse.cancel();
        };
    }, [isActive, setDebouncedFalse]);

    return debouncedActive;
}
