import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Tabs, message } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FilterEditorStore } from "./FilterEditorStore";
import { ConstructorTab } from "./component/ConstructorTab";
import { FeatureFilterJsonTab } from "./component/FeatureFilterJsonTab";
import type {
    ActiveTab,
    FeatureFilterEditorProps,
    FilterExpressionString,
} from "./type";

import "./FeatureFilterEditor.less";

const msgConstructor = gettext("Constructor");
const msgJson = gettext("JSON");
const msgApply = gettext("Apply");
const msgCancel = gettext("Cancel");
const msgClear = gettext("Clear");

export const FeatureFilterEditor = observer(
    ({
        fields,
        value,
        onChange,
        onValidityChange,
        onApply,
        onCancel,
    }: FeatureFilterEditorProps) => {
        const [initialValue] = useState<FilterExpressionString | undefined>(
            value
        );
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
        }, [store.isValid, store.validJsonValue, onValidityChange, onChange]);

        const handleApply = useCallback(() => {
            if (!store.isValid) {
                messageApi.error(
                    gettext(
                        "Filter is invalid. Please fix errors before applying."
                    )
                );
                return;
            }

            try {
                const jsonString =
                    store.toJsonString() as FilterExpressionString;
                onChange?.(jsonString);
                onApply?.(jsonString);
                messageApi.success(gettext("Filter applied successfully"));
            } catch (error) {
                messageApi.error(gettext("Failed to apply filter"));
                console.error("Filter application error:", error);
            }
        }, [store, messageApi, onChange, onApply]);

        const handleCancel = useCallback(() => {
            onChange?.(initialValue);
            onCancel?.(initialValue);
        }, [initialValue, onChange, onCancel]);

        const handleClear = useCallback(() => {
            store.clear();
        }, [store]);

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

        const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
            const actions: ActionToolbarAction[] = [
                <SaveButton
                    disabled={!store.isValid}
                    key="save"
                    onClick={handleApply}
                >
                    {msgApply}
                </SaveButton>,
                <Button key="clear" onClick={handleClear}>
                    {msgClear}
                </Button>,
            ];
            const rightActions: ActionToolbarAction[] = [
                <Button key="cancel" onClick={handleCancel}>
                    {msgCancel}
                </Button>,
            ];

            return {
                actions: [...actions],
                rightActions: [...rightActions],
            };
        }, [handleApply, handleCancel, handleClear, store.isValid]);

        return (
            <div className="ngw-feature-filter-editor">
                {contextHolder}
                <Tabs
                    type="card"
                    size="large"
                    activeKey={store.activeTab}
                    onChange={(e) => store.setActiveTab(e as ActiveTab)}
                    items={items}
                    parentHeight
                />

                {hasErrors && (
                    <div className="error-message">{store.validationError}</div>
                )}

                <ActionToolbar {...toolbarProps} />
            </div>
        );
    }
);

FeatureFilterEditor.displayName = "FeatureFilterEditor";

export default FeatureFilterEditor;
