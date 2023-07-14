import { Card } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

import { ResourcePickerChildren } from "./ResourcePickerChildren";
import { ResourcePickerStore } from "./store/ResourcePickerStore";
import { ResourcePickerFooter } from "./ResourcePickerFooter";
import { ResourcePickerTitle } from "./ResourcePickerTitle";

import "./ResourcePickerCard.less";

const defaultStyle = {
    height: "100%",
    width: "450px",
};
const defaultBodyStyle = {
    height: "300px",
    overflow: "auto",
};

export function ResourcePickerCard({
    pickerOptions = {},
    cardOptions = {},
    showClose,
    onSelect,
    onClose,
    store,
}) {
    const style = cardOptions.style || defaultStyle;
    const bodyStyle = cardOptions.bodyStyle || defaultBodyStyle;

    const {
        multiple,
        parentId,
        selected,
        onNewGroup,
        getThisMsg,
        requireClass,
        getSelectedMsg,
        hideUnavailable,
        requireInterface,
        disableResourceIds,
        ...restPickerProps
    } = pickerOptions;

    const [resourceStore] = useState(
        () =>
            store ||
            new ResourcePickerStore({
                disableResourceIds,
                requireInterface,
                hideUnavailable,
                getSelectedMsg,
                requireClass,
                getThisMsg,
                onNewGroup,
                selected,
                parentId,
                multiple,
                ...restPickerProps,
            })
    );

    const onOk_ = (resource) => {
        if (onSelect) {
            onSelect(resource);
        }
    };

    useEffect(() => {
        const destroy = resourceStore.destroy;
        return destroy;
    }, [resourceStore]);

    return (
        <Card
            style={style}
            bodyStyle={bodyStyle}
            className="ngw-resource-resource-picker-card"
            {...cardOptions}
            title={
                <ResourcePickerTitle
                    showClose={showClose}
                    onClose={onClose}
                    resourceStore={resourceStore}
                />
            }
            actions={[
                <ResourcePickerFooter
                    key="footer"
                    resourceStore={resourceStore}
                    allowCreateResourceBtn
                    onOk={onOk_}
                />,
            ]}
        >
            <ResourcePickerChildren resourceStore={resourceStore} />
        </Card>
    );
}

const pickerOptions = {
    disableResourceIds: PropTypes.arrayOf(PropTypes.number),
    getSelectedMsg: PropTypes.string,
    getThisMsg: PropTypes.string,
    hideUnavailable: PropTypes.bool,
    multiple: PropTypes.bool,
    onClose: PropTypes.func,
    onNewGroup: PropTypes.any,
    onSelect: PropTypes.func,
    requireClass: PropTypes.string,
    requireInterface: PropTypes.string,
    resourceId: PropTypes.number,
    selected: PropTypes.array,
    showClose: PropTypes.bool,
};

const cardOptions = {
    style: PropTypes.object,
    bodyStyle: PropTypes.object,
};

ResourcePickerCard.propTypes = {
    store: PropTypes.object,
    showClose: PropTypes.bool,
    onSelect: PropTypes.func,
    onClose: PropTypes.func,
    pickerOptions: PropTypes.shape(pickerOptions),
    cardOptions: PropTypes.shape(cardOptions),
};
