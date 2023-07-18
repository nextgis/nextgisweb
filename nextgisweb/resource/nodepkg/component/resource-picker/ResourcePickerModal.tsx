import { Modal } from "@nextgisweb/gui/antd";
import { useEffect, useState } from "react";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";

import type { ResourcePickerModalProps } from "./type";

export function ResourcePickerModal({
    visible: initVisible,
    store,
    onSelect,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_ = 400,
    ...rest
}: ResourcePickerModalProps) {
    const [visible, setVisible] = useState(initVisible ?? true);

    const { modalProps, cardProps } = usePickerModal({
        height: height_,
        cardOptions,
        ...rest,
    });

    const close = () => setVisible(false);

    const onPick = (resource) => {
        if (onSelect) {
            onSelect(resource);
        }
        if (closeOnSelect) {
            close();
        }
    };

    useEffect(() => {
        setVisible(initVisible);
    }, [initVisible]);

    return (
        <Modal
            className="resource-picker-modal"
            open={visible}
            destroyOnClose
            footer={null}
            closable={false}
            onCancel={() => setVisible(false)}
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
