import { useCallback, useEffect, useRef } from "react";

import { showResourcePicker as showResourcePickerOriginal } from "..";
import type { ResourcePickerModalProps, SelectValue } from "../type";

export interface ResourcePickerHookProps {
    doNotSavePosition?: boolean;
    initParentId?: number;
}

export function useResourcePicker({
    doNotSavePosition,
    initParentId,
}: ResourcePickerHookProps = {}) {
    const pickerParentIdRef = useRef<number>();
    const pickerModal =
        useRef<ReturnType<typeof showResourcePickerOriginal<any>>>();

    const updatePickerOptions = useCallback(
        <V extends SelectValue>(options: ResourcePickerModalProps<V>) => {
            const updatedOptions = { ...options };
            if (!doNotSavePosition) {
                const pickerOptions = updatedOptions.pickerOptions
                    ? { ...updatedOptions.pickerOptions }
                    : {};

                const originalOnTraverse = pickerOptions.onTraverse;
                pickerOptions.parentId =
                    pickerParentIdRef.current ?? pickerOptions.parentId;
                pickerOptions.initParentId = initParentId;
                pickerOptions.onTraverse = (parentId: number) => {
                    pickerParentIdRef.current = parentId;
                    originalOnTraverse?.(parentId);
                };

                updatedOptions.pickerOptions = pickerOptions;
            }
            return updatedOptions;
        },
        [doNotSavePosition, initParentId]
    );

    const showResourcePicker = useCallback(
        <V extends SelectValue>(options: ResourcePickerModalProps<V>) => {
            pickerModal.current = showResourcePickerOriginal(
                updatePickerOptions(options)
            );
            return pickerModal.current;
        },
        [updatePickerOptions]
    );

    useEffect(() => {
        return () => {
            pickerModal.current?.destroy();
        };
    }, []);

    return { showResourcePicker };
}
