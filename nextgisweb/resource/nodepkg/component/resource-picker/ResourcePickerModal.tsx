import { useCallback, useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";
import { ResourcePickerStore } from "./store/ResourcePickerStore";
import type { ResourcePickerModalProps, SelectValue } from "./type";

import "./ResourcePickerModal.less";

export function ResourcePickerModal<V extends SelectValue = SelectValue>({
    open: open_,
    visible: visible_,
    store,
    onSelect,
    onPick: onPickProp,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_,
    ...rest
}: ResourcePickerModalProps<V>) {
    const [open, setOpen] = useState(open_ ?? visible_ ?? true);

    const [resourceStore] = useState(
        () => store || new ResourcePickerStore(pickerOptions)
    );

    const { modalProps, cardProps } = usePickerModal({
        height: height_,
        cardOptions,
        ...rest,
    });

    const close = () => setOpen(false);

    const onPick = useCallback(
        (resourceId: V) => {
            if (onSelect) {
                onSelect(resourceId);
            }
            if (onPickProp) {
                if (Array.isArray(resourceId)) {
                    const resourceItems: CompositeRead[] = [];
                    for (const id of resourceId) {
                        const item = resourceStore.resources.find(
                            (r) => r.resource.id === id
                        );
                        if (item) {
                            resourceItems.push(item);
                        }
                    }
                    onPickProp(resourceItems);
                } else {
                    const item = resourceStore.resources.find(
                        (r) => r.resource.id === resourceId
                    );
                    if (item) {
                        onPickProp(item);
                    }
                }
            }
            if (closeOnSelect) {
                close();
            }
        },
        [closeOnSelect, onPickProp, onSelect, resourceStore.resources]
    );

    useEffect(() => {
        setOpen(open_ ?? visible_ ?? true);
    }, [open_, visible_]);

    return (
        <Modal
            className="resource-picker-modal"
            open={open}
            destroyOnClose
            footer={null}
            closable={false}
            onCancel={() => setOpen(false)}
            {...modalProps}
        >
            <ResourcePickerCard
                store={resourceStore}
                pickerOptions={pickerOptions}
                cardOptions={cardProps}
                onSelect={onPick}
                onClose={close}
                showClose
            />
        </Modal>
    );
}
