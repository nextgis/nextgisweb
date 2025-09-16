import { useCallback, useMemo, useState } from "react";
import type React from "react";

import { ToggleGroupContext } from "./ToggleGroupContext";
import type { ToggleGroupContextValue } from "./ToggleGroupContext";

export interface ToggleGroupProps {
    allowToggleOff?: boolean;
    defaultValue?: string | null;
    initialValue?: string | null;
    children: React.ReactNode;
    nonEmpty?: boolean;
    value?: string | null;
    onChange?: (id: string | null) => void;
    onDefaultChange?: (id: string | null) => void;
}

export const PHASE_UNMOUNT = "__UNMOUNT_PHASE__";

export function ToggleGroup({
    defaultValue = null,
    initialValue = null,
    children,
    nonEmpty,
    value,
    onChange,
    onDefaultChange,
}: ToggleGroupProps) {
    const isControlled = value !== undefined;
    const [uncontrolled, setUncontrolled] = useState<string | null>(
        initialValue
    );
    const activeId = (isControlled ? value : uncontrolled) || defaultValue;

    const setActiveId = useCallback(
        (next: string | null) => {
            const action = (val = next) => {
                if (!isControlled) {
                    setUncontrolled(val);
                }
                onChange?.(val);
            };
            // Use a two-phase update here to ensure all components unmount before the next one mounts
            if (nonEmpty && (next === undefined || next === null)) {
                return;
            }
            // Not a null, because it could mount the default value
            action(PHASE_UNMOUNT);
            setTimeout(action, 10);
        },
        [isControlled, nonEmpty, onChange]
    );

    const ctx = useMemo<ToggleGroupContextValue>(() => {
        return {
            present: true,
            activeId: activeId,
            isActive: (id: string) => activeId === id,
            setActiveId,
            setDefaultId: onDefaultChange,
        };
    }, [activeId, onDefaultChange, setActiveId]);

    return <ToggleGroupContext value={ctx}>{children}</ToggleGroupContext>;
}
