import "./ResourcePickerModal.css";

import { Modal } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

import { ResourcePickerChildren } from "../resource-picker-children";
import { ResourcePickerStore } from "../store/ResourcePickerStore";
import { ResourcePickerModalFooter } from "./ResourcePickerModalFooter";
import { ResourcePickerModalTitle } from "./ResourcePickerModalTitle";

const DEFAULTS = {
    centered: true,
    width: "40em",
    transitionName: "",
    maskTransitionName: "",
};

export function ResourcePickerModal({
    store,
    showCls = ["resource_group"],
    visible: initVisible,
    multiple,
    selected,
    onSelect,
    enabledCls = ["resource_group"],
    onNewGroup,
    resourceId,
    getThisMsg,
    disabledIds,
    closeOnSelect = true,
    getSelectedMsg,
    enabledInterfaces,
    ...props
}) {
    const [visible, setVisible] = useState(initVisible ?? true);

    const [resourceStore] = useState(() => store ||
        new ResourcePickerStore({
            parentId: resourceId,
            enabledInterfaces,
            getSelectedMsg,
            getThisMsg,
            disabledIds,
            enabledCls,
            onNewGroup,
            selected,
            multiple,
            showCls,
        })
    );
    const close = () => setVisible(false);

    const onOk = (resource) => {
        if (onSelect) {
            onSelect(resource);
        }
        if (closeOnSelect) {
            close();
        }
    };

    useEffect(() => {
        return () => resourceStore.destroy();
    });

    useEffect(() => {
        setVisible(initVisible);
    }, [initVisible]);

    return (
        <Modal
            {...DEFAULTS}
            {...props}
            open={visible}
            destroyOnClose
            className="resource-picker-modal"
            bodyStyle={{
                overflowY: "auto",
                minHeight: "400px",
                maxHeight: "calc(50vh - 200px)",
                padding: "0",
            }}
            closable={false}
            onCancel={() => setVisible(false)}
            title={
                <ResourcePickerModalTitle
                    onClose={close}
                    resourceStore={resourceStore}
                />
            }
            footer={
                <ResourcePickerModalFooter
                    resourceStore={resourceStore}
                    allowCreateResourceBtn
                    onOk={onOk}
                />
            }
        >
            <ResourcePickerChildren
                resourceStore={resourceStore}
                enabledCls={["resource_group"]}
            />
        </Modal>
    );
}

ResourcePickerModal.propTypes = {
    store: PropTypes.object,
    visible: PropTypes.bool,
    closeOnSelect: PropTypes.bool,
    disabledIds: PropTypes.arrayOf(PropTypes.number),
    enabledCls: PropTypes.array,
    enabledInterfaces: PropTypes.array,
    getSelectedMsg: PropTypes.string,
    getThisMsg: PropTypes.string,
    onNewGroup: PropTypes.any,
    onSelect: PropTypes.func,
    resourceId: PropTypes.number,
    selected: PropTypes.array,
    showCls: PropTypes.array,
    multiple: PropTypes.bool,
};
