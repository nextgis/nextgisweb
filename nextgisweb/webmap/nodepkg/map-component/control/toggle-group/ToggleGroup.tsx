import { useCallback, useMemo, useState } from "react";
import type React from "react";

import { ToggleGroupContext } from "./ToggleGroupContext";
import type { ToggleGroupContextValue } from "./ToggleGroupContext";

export interface ToggleGroupProps {
    allowToggleOff?: boolean;
    defaultValue?: string | null;
    initialValue?: string | null;
    children: React.ReactNode;
    value?: string | null;
    onChange?: (id: string | null) => void;
    onDefaultChange?: (id: string | null) => void;
}

export function ToggleGroup({
    defaultValue = null,
    initialValue = null,
    children,
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
            // Use a two-phase update here to ensure all components unmount before the next one mounts
            const action = (val: string | null) => {
                if (!isControlled) {
                    setUncontrolled(val);
                }
                onChange?.(val);
            };
            action(null);
            setTimeout(() => {
                action(next);
            });
        },
        [isControlled, onChange]
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
