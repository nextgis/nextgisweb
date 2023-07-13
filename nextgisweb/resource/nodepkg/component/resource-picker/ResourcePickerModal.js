import { Modal } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

import { ResourcePickerCard } from "./ResourcePickerCard";

const minHeight = 400;
const cardTitleHeight = 56;
const cardFooterHeight = 56;
const cardHeight = minHeight - cardTitleHeight - cardFooterHeight;

const MODAL_DEFAULTS = {
    centered: true,
    width: "40em",
    transitionName: "",
    maskTransitionName: "",
};

const DEFAULT_STYLE = { width: "100%", height: minHeight };

const DEFAULT_BODY_STYLE = {
    height: cardHeight,
    overflow: "auto",
};

export function ResourcePickerModal({
    visible: initVisible,
    store,
    onSelect,
    closeOnSelect = true,
    pickerOptions = {},
    cardOptions = {},
    ...props
}) {
    const [visible, setVisible] = useState(initVisible ?? true);

    cardOptions = cardOptions || {};
    cardOptions.bodyStyle = cardOptions.bodyStyle || DEFAULT_BODY_STYLE;
    cardOptions.style = cardOptions.style || DEFAULT_STYLE;

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
            {...MODAL_DEFAULTS}
            {...props}
            open={visible}
            destroyOnClose
            className="resource-picker-modal"
            bodyStyle={{
                overflowY: "auto",
                minHeight: minHeight,
                height: "calc(50vh - 200px)",
                padding: "0",
            }}
            footer={null}
            closable={false}
            onCancel={() => setVisible(false)}
        >
            <ResourcePickerCard
                store={store}
                pickerOptions={pickerOptions}
                cardOptions={cardOptions}
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
};
