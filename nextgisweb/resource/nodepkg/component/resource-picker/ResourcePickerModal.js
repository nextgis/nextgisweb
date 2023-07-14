import { Modal } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

import { ResourcePickerCard } from "./ResourcePickerCard";
import usePickerModal from "./hook/usePickerModal";

export function ResourcePickerModal({
    visible: initVisible,
    store,
    onSelect,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    height: height_ = 400,
    ...rest
}) {
    const [visible, setVisible] = useState(initVisible ?? true);

    const { modalProps, cardProps } = usePickerModal({ height: height_, cardOptions, ...rest });

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

ResourcePickerModal.propTypes = {
    pickerOptions: PropTypes.object,
    cardOptions: PropTypes.object,
    closeOnSelect: PropTypes.bool,
    onSelect: PropTypes.func,
    store: PropTypes.object,
    visible: PropTypes.bool,
    height: PropTypes.number,
};
