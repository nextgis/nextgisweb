import { useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";
import type { ResourcePickerModalProps, SelectValue } from "./type";

import "./ResourcePickerModal.less";

export function ResourcePickerModal<V extends SelectValue = SelectValue>({
    open: open_,
    visible: visible_,
    store,
    onSelect,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_,
    ...rest
}: ResourcePickerModalProps<V>) {
    const [open, setOpen] = useState(open_ ?? visible_ ?? true);

    const { modalProps, cardProps } = usePickerModal({
        height: height_,
        cardOptions,
        ...rest,
    });

    const close = () => setOpen(false);

    const onPick = (resource: V) => {
        if (onSelect) {
            onSelect(resource);
        }
        if (closeOnSelect) {
            close();
        }
    };

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
