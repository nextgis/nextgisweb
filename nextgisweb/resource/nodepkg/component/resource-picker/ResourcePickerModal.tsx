import { useCallback, useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";
import { ResourcePickerStore } from "./store/ResourcePickerStore";
import type { ResourcePickerModalProps, SelectValue } from "./type";

import "./ResourcePickerModal.less";

function ResourcePickerModal<V extends SelectValue = SelectValue>({
    open: open_,
    visible: visible_,
    store: storeProp,
    onSelect,
    onPick: onPickProp,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_,
    ...rest
}: ResourcePickerModalProps<V>) {
    const [open, setOpen] = useState(open_ ?? visible_ ?? true);

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
                        const resourceItems: CompositeRead[] = [];
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
