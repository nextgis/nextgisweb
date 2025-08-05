import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

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
const msgCancel = gettext("Cancel");

export const FeatureFilterEditor = observer(
    ({
        fields,
        value,
        onChange,
        onValidityChange,
        showFooter = false,
    }: FeatureFilterEditorProps) => {
        const [initialValue] = useState<string | undefined>(value);
        const store = useMemo(
            () => new FilterEditorStore({ fields }),
            [fields]
        );
        const [messageApi, contextHolder] = message.useMessage();

        useEffect(() => {
            if (value) {
                store.loadFilter(value);
            }
        }, [value, store]);

        useEffect(() => {
            onValidityChange?.(store.isValid);
            onChange?.(store.validJsonValue);
        }, [store.isValid, onValidityChange, store.validJsonValue]);

        const handleApply = () => {
            if (!store.isValid) {
                messageApi.error(
                    gettext(
                        "Filter is invalid. Please fix errors before applying."
                    )
                );
                return;
            }

            try {
                const jsonString = store.toJsonString();
                onChange?.(jsonString);
                messageApi.success(gettext("Filter applied successfully"));
            } catch (error) {
                messageApi.error(gettext("Failed to apply filter"));
                console.error("Filter application error:", error);
            }
        };

        const handleCancel = () => {
            onChange?.(initialValue);
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

        const hasErrors = !store.isValid && store.validationError;

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

                {showFooter && (
                    <div
                        className="filter-footer"
                        style={{ marginTop: "16px", textAlign: "right" }}
                    >
                        {hasErrors && (
                            <div className="error-message">
                                {store.validationError}
                            </div>
                        )}
                        <Button
                            type="primary"
                            onClick={handleApply}
                            disabled={!store.isValid}
                        >
                            {msgApply}
                        </Button>
                        <Button type="primary" onClick={handleCancel}>
                            {msgCancel}
                        </Button>
                    </div>
                )}
            </div>
        );
    }
);

FeatureFilterEditor.displayName = "FeatureFilterEditor";

export default FeatureFilterEditor;
