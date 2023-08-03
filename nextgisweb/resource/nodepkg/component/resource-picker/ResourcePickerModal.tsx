import { Modal } from "@nextgisweb/gui/antd";
import { useEffect, useState } from "react";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";

import type { ResourcePickerModalProps, SelectValue } from "./type";

export function ResourcePickerModal({
    open: open_,
    visible: visible_,
    store,
    onSelect,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_ = 400,
    ...rest
}: ResourcePickerModalProps) {
    const [open, setOpen] = useState(open_ ?? visible_ ?? true);

    const { modalProps, cardProps } = usePickerModal({
        height: height_,
        cardOptions,
        ...rest,
    });

    const close = () => setOpen(false);

    const onPick = (resource: SelectValue) => {
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
