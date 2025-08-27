import { useCallback, useEffect, useState } from "react";

import { useToggleGroupItem } from "../toggle-group/useToggleGroupItem";

export type ToggleActiveProp<T> = T | ((value: boolean) => T);

export interface UseToggleControlOptions {
    value?: boolean;
    groupId?: string;
    initialValue?: boolean;
    isDefaultGroupId?: boolean;
    canToggle?: (next: boolean) => boolean | Promise<boolean>;
    onChange?: (next: boolean) => void | Promise<void>;
}

export function useToggleControl({
    isDefaultGroupId = false,
    initialValue = false,
    groupId,
    value: controlledValue,
    onChange,
    canToggle,
}: UseToggleControlOptions) {
    const group = useToggleGroupItem(groupId);

    const isInGroup = group.inGroup;
    const groupValue = isInGroup ? group.isActive : undefined;

    const isControlledStandalone = !isInGroup && controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);

    const currentValue: boolean = !!(isInGroup
        ? groupValue
        : isControlledStandalone
          ? controlledValue
          : uncontrolledValue);

    const handleToggle = useCallback(async () => {
        const next = !currentValue;
        if (canToggle) {
            const allowed = await canToggle(next);
            if (!allowed) return;
        }
        if (isInGroup) {
            group.toggle();
            return;
        }
        if (!isControlledStandalone) {
            setUncontrolledValue(next);
        } else if (onChange) {
            onChange(next);
        }
    }, [
        group,
        isInGroup,
        currentValue,
        isControlledStandalone,
        canToggle,
        onChange,
    ]);

    useEffect(() => {
        if (isDefaultGroupId) {
            group.makeDefault();
        }
    }, [group, isDefaultGroupId]);

    useEffect(() => {
        onChange?.(currentValue);
    }, [currentValue, onChange]);

    return {
        value: currentValue,
        toggle: handleToggle,
    };
}
