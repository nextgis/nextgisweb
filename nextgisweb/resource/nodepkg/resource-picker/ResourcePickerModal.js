import { Modal } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

import { ResourceChildren } from "../resource-children";
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
    resourceId,
    disabledIds,
    enabledCls = ["resource_group"],
    onNewFolder,
    onSelect,
    allowCreateResourceBtn = true,
    ...props
}) {
    const [visible, setVisible] = useState(props.visible ?? true);

    const [resourceStore] = useState(
        new ResourcePickerStore({
            parentId: resourceId,
            disabledIds,
            enabledCls,
            onNewFolder,
        })
    );
    const close = () => setVisible(false);

    const onOk = (resource) => {
        if (onSelect) {
            onSelect(resource);
        }
    };

    useEffect(() => {
        return () => resourceStore.destroy();
    });

    useEffect(() => {
        setVisible(props.visible);
    }, [props.visible]);

    return (
        <Modal
            {...DEFAULTS}
            {...props}
            visible={visible}
            destroyOnClose
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
            <ResourceChildren
                resourceStore={resourceStore}
                enabledCls={["resource_group"]}
            />
        </Modal>
    );
}

ResourcePickerModal.propTypes = {
    resourceId: PropTypes.number,
    onSelect: PropTypes.func,
    allowCreateResourceBtn: PropTypes.bool,
    disabledIds: PropTypes.arrayOf(PropTypes.number),
};
