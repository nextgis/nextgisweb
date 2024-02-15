import { useEffect, useState } from "react";

import { Card } from "@nextgisweb/gui/antd";

import { ResourcePickerChildren } from "./ResourcePickerChildren";
import { ResourcePickerFooter } from "./ResourcePickerFooter";
import { ResourcePickerTitle } from "./ResourcePickerTitle";
import { ResourcePickerStore } from "./store/ResourcePickerStore";
import type { ResourcePickerCardProps, SelectValue } from "./type";

import "./ResourcePickerCard.less";

const defaultStyle = {
    height: "100%",
    width: "450px",
};
const defaultBodyStyle = {
    height: "300px",
    overflow: "auto",
};

export function ResourcePickerCard<V extends SelectValue = SelectValue>({
    pickerOptions = {},
    cardOptions = {},
    showClose,
    onSelect,
    onClose,
    store,
}: ResourcePickerCardProps<V>) {
    const style = cardOptions.style || defaultStyle;
    const bodyStyle = cardOptions.styles?.body || defaultBodyStyle;

    const [resourceStore] = useState(
        () => store || new ResourcePickerStore(pickerOptions)
    );

    const onOk_ = (resource: V) => {
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
            styles={{ body: bodyStyle }}
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
            <ResourcePickerChildren
                resourceStore={resourceStore}
                onOk={onOk_}
            />
        </Card>
    );
}
