import { Card } from "@nextgisweb/gui/antd";
import { useEffect, useState } from "react";

import { ResourcePickerChildren } from "./ResourcePickerChildren";
import { ResourcePickerStore } from "./store/ResourcePickerStore";
import { ResourcePickerFooter } from "./ResourcePickerFooter";
import { ResourcePickerTitle } from "./ResourcePickerTitle";

import type { ResourcePickerCardProps } from "./type";

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
}: ResourcePickerCardProps) {
    const style = cardOptions.style || defaultStyle;
    const bodyStyle = cardOptions.bodyStyle || defaultBodyStyle;

    const [resourceStore] = useState(
        () => store || new ResourcePickerStore(pickerOptions)
    );

    const onOk_ = (resource: number | number[]) => {
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
                    onOk={onOk_}
                />,
            ]}
        >
            <ResourcePickerChildren resourceStore={resourceStore} />
        </Card>
    );
}
