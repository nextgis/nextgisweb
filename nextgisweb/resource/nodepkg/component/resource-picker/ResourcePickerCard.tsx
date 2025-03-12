import { useCallback, useEffect, useState } from "react";

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
    store: storeProp,
}: ResourcePickerCardProps<V>) {
    const style = cardOptions.style || defaultStyle;
    const bodyStyle = cardOptions.styles?.body || defaultBodyStyle;

    const [store] = useState(
        () => storeProp || new ResourcePickerStore(pickerOptions)
    );

    const onOk_ = useCallback(
        (resource: V) => {
            if (onSelect) {
                onSelect(resource);
            }
        },
        [onSelect]
    );

    useEffect(() => {
        const destroy = store.destroy;
        return destroy;
    }, [store]);

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
                    store={store}
                />
            }
            actions={[
                <ResourcePickerFooter
                    key="footer"
                    store={store}
                    onOk={onOk_}
                />,
            ]}
        >
            <ResourcePickerChildren store={store} onOk={onOk_} />
        </Card>
    );
}
