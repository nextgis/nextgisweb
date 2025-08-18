import { useContext, useMemo } from "react";

import { ToggleGroupContext } from "./ToggleGroupContext";

export function useToggleGroupItem(id?: string) {
    const group = useContext(ToggleGroupContext);

    return useMemo(() => {
        if (!group.present || !id) {
            return {
                inGroup: false,
                isActive: false,
                activate: () => {},
                toggle: () => {},
                makeDefault: () => {},
            };
        }
        const isActive = group.isActive(id);

        return {
            inGroup: true,
            isActive,
            activate: () => {
                group.setActiveId(id);
            },
            makeDefault: () => {
                group.setDefaultId?.(id);
            },
            toggle: () => {
                if (isActive) {
                    group.setActiveId(null);
                } else {
                    group.setActiveId(id);
                }
            },
        };
    }, [group, id]);
}
