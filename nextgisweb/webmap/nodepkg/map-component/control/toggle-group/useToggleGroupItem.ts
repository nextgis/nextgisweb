import { useCallback, useContext, useEffect, useMemo, useRef } from "react";

import { ToggleGroupContext } from "./ToggleGroupContext";

export function useToggleGroupItem(id?: string) {
    const group = useContext(ToggleGroupContext);

    const activeId = group?.activeId;

    const activeIdRef = useRef<string | null | undefined>(activeId);
    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    const setActiveId = group?.setActiveId;
    const setDefaultId = group?.setDefaultId;

    const inGroup = !!(group && id);

    const activate = useCallback(() => {
        if (!inGroup || !setActiveId || !id) return;
        setActiveId(id);
    }, [inGroup, setActiveId, id]);

    const deactivate = useCallback(() => {
        if (!inGroup || !setActiveId) return;
        setActiveId(null);
    }, [inGroup, setActiveId]);

    const makeDefault = useCallback(() => {
        if (!inGroup || !setDefaultId || !id) return;
        setDefaultId(id);
    }, [inGroup, setDefaultId, id]);

    const toggle = useCallback(() => {
        if (!inGroup || !setActiveId || !id) return;
        const isActiveNow = activeIdRef.current === id;
        setActiveId(isActiveNow ? null : id);
    }, [inGroup, setActiveId, id]);

    const isActive = group && id ? group.activeId === id : false;

    return useMemo(
        () => ({
            inGroup,
            isActive,
            makeDefault,
            deactivate,
            activate,
            toggle,
        }),

        [inGroup, isActive, activate, deactivate, toggle, makeDefault]
    );
}
