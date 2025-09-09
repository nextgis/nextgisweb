import { useContext, useMemo } from "react";

import { ToggleGroupContext } from "./ToggleGroupContext";

export function useToggleGroupItem(id?: string) {
    const group = useContext(ToggleGroupContext);

    return useMemo(() => {
        if (!group || !id) {
            return {
                inGroup: false,
                isActive: false,
                activate: () => {},
                deactivate: () => {},
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
            deactivate: () => {
                group.setActiveId(null);
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
