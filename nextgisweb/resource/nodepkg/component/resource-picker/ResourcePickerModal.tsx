import { useCallback, useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";
import { ResourcePickerStore } from "./store/ResourcePickerStore";
import type {
    ResourcePickerAttr,
    ResourcePickerModalProps,
    SelectValue,
} from "./type";

import "./ResourcePickerModal.less";

function ResourcePickerModal<V extends SelectValue = SelectValue>({
    open: openProp,
    store: storeProp,
    onSelect,
    onPick: onPickProp,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_,
    ...rest
}: ResourcePickerModalProps<V>) {
    const [open, setOpen] = useState(openProp ?? true);

    const [store] = useState(
        () => storeProp || new ResourcePickerStore(pickerOptions)
    );

    const { modalProps, cardProps } = usePickerModal({
        height: height_,
        cardOptions,
        ...rest,
    });

    const close = useCallback(() => setOpen(false), []);

    const onPick = useCallback(
        (resourceId: V) => {
            if (onSelect) {
                onSelect(resourceId);
            }
            if (onPickProp) {
                if (store.allLoadedResources) {
                    if (Array.isArray(resourceId)) {
                        const resourceItems: ResourcePickerAttr[] = [];
                        for (const id of resourceId) {
                            const item = store.allLoadedResources.get(id);
                            if (item) {
                                resourceItems.push(item);
                            }
                        }
                        onPickProp(resourceItems);
                    } else {
                        const item = store.allLoadedResources.get(resourceId);
                        if (item) {
                            onPickProp(item);
                        }
                    }
                }
            }
            if (closeOnSelect) {
                close();
            }
        },
        [close, closeOnSelect, onPickProp, onSelect, store.allLoadedResources]
    );

    useEffect(() => {
        setOpen(openProp ?? true);
    }, [openProp]);

    return (
        <Modal
            className="resource-picker-modal"
            open={open}
            destroyOnHidden
            footer={null}
            closable={false}
            onCancel={() => setOpen(false)}
            {...modalProps}
        >
            <ResourcePickerCard
                store={store}
                pickerOptions={pickerOptions}
                cardOptions={cardProps}
                onSelect={onPick}
                onClose={close}
                showClose
            />
        </Modal>
    );
}

export default ResourcePickerModal;
