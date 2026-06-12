import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
  ActionToolbarAction,
  ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Input, Space, Tabs, message } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import llmSettings from "@nextgisweb/llm-core/client-settings";
import { route } from "@nextgisweb/pyramid/api";
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
const msgGenerateWithAI = gettext("Generate with AI");
const msgAIPromptPlaceholder = gettext(
  "Describe the filter in plain language…"
);

export const FeatureFilterEditor = observer(
  ({
    fields,
    resourceId,
    value,
    valueWidget,
    onChange,
    onValidityChange,
    onApply,
    onCancel,
  }: FeatureFilterEditorProps) => {
    const [initialValue] = useState<FilterExpressionString | undefined>(value);
    const store = useMemo(
      () => new FilterEditorStore({ fields, valueWidget }),
      [fields, valueWidget]
    );
    const [messageApi, contextHolder] = message.useMessage();
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

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
          gettext("Filter is invalid. Please fix errors before applying.")
        );
        return;
      }

      try {
        const jsonString = store.toJsonString() as FilterExpressionString;
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

    const handleAiGenerate = useCallback(async () => {
      if (!resourceId) return;
      setAiLoading(true);
      try {
        const result = await route(
          "feature_layer.filter.generate",
          resourceId
        ).post({
          json: { prompt: aiPrompt },
        });
        store.loadFilter(JSON.stringify(result) as FilterExpressionString);
        store.setActiveTab("constructor");
      } catch {
        messageApi.error(gettext("Failed to generate filter"));
      } finally {
        setAiLoading(false);
      }
    }, [resourceId, aiPrompt, store, messageApi]);

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
        <SaveButton disabled={!store.isValid} key="save" onClick={handleApply}>
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

        {resourceId !== undefined && llmSettings.available && (
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={msgAIPromptPlaceholder}
              onPressEnter={handleAiGenerate}
            />
            <Button
              loading={aiLoading}
              disabled={!aiPrompt.trim()}
              onClick={handleAiGenerate}
            >
              {msgGenerateWithAI}
            </Button>
          </Space.Compact>
        )}

        <ActionToolbar {...toolbarProps} />
      </div>
    );
  }
);

FeatureFilterEditor.displayName = "FeatureFilterEditor";

export default FeatureFilterEditor;
