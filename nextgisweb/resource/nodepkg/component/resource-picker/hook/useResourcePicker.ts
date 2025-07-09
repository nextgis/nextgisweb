import { useCallback, useEffect, useRef } from "react";

import type { ModalStore } from "@nextgisweb/gui/show-modal/ModalStore";

import { showResourcePicker as showResourcePickerOriginal } from "..";
import type { ResourcePickerModalProps, SelectValue } from "../type";

export interface ResourcePickerHookProps {
    doNotSavePosition?: boolean;
    initParentId?: number;
    modalStore?: ModalStore;
}

export function useResourcePicker({
    doNotSavePosition,
    initParentId,
    modalStore,
}: ResourcePickerHookProps = {}) {
    const pickerParentIdRef = useRef<number>(null);
    const pickerModal =
        useRef<ReturnType<typeof showResourcePickerOriginal<any>>>(null);

    const updatePickerOptions = useCallback(
        <V extends SelectValue>(options: ResourcePickerModalProps<V>) => {
            const updatedOptions = { ...options, modalStore };
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
        [doNotSavePosition, initParentId, modalStore]
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
