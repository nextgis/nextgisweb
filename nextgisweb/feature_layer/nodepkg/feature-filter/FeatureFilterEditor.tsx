import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Button, Tabs, message } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FilterEditorStore } from "./FilterEditorStore";
import { ConstructorTab } from "./component/ConstructorTab";
import { FeatureFilterJsonTab } from "./component/FeatureFilterJsonTab";
import type { FeatureFilterEditorProps } from "./type";

import "./FeatureFilterEditor.less";

const msgConstructor = gettext("Constructor");
const msgJson = gettext("JSON");
const msgApply = gettext("Apply");

export const FeatureFilterEditor = observer(
    ({ fields, value, onChange }: FeatureFilterEditorProps) => {
        const [store] = useState(
            () => new FilterEditorStore({ fields, value })
        );
        const [messageApi, contextHolder] = message.useMessage();

        useEffect(() => {
            if (value) {
                store.loadFilter(value);
            }
        }, [value, store]);

        const handleApply = () => {
            try {
                const expression = store.toMapLibreExpression();
                onChange?.(expression);
                messageApi.success(gettext("Filter applied successfully"));
            } catch (error) {
                messageApi.error(gettext("Failed to apply filter"));
                console.error("Filter application error:", error);
            }
        };

        const items: TabsProps["items"] = [
            {
                key: "constructor",
                label: msgConstructor,
                children: <ConstructorTab store={store} />,
            },
            {
                key: "json",
                label: msgJson,
                children: <FeatureFilterJsonTab store={store} />,
            },
        ];

        return (
            <div className="ngw-feature-filter-editor">
                {contextHolder}
                <Tabs
                    type="card"
                    size="large"
                    activeKey={store.activeTab}
                    onChange={store.setActiveTab}
                    items={items}
                />
                <div style={{ marginTop: "16px", textAlign: "right" }}>
                    <Button type="primary" onClick={handleApply}>
                        {msgApply}
                    </Button>
                </div>
            </div>
        );
    }
);

FeatureFilterEditor.displayName = "FeatureFilterEditor";

export default FeatureFilterEditor;
