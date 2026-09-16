import { observer } from "mobx-react-lite";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
  ActionToolbarAction,
  ActionToolbarProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Tabs, message } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { TabsLabelBadge } from "@nextgisweb/gui/component";
import { SaveButton } from "@nextgisweb/gui/component/SaveButton";
import { errorModal } from "@nextgisweb/gui/error";
import { useUnsavedChanges } from "@nextgisweb/gui/hook";
import { assert } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { GEOMETRY_KEY } from "../geometry-editor/constant";
import type { EditorStore, EditorStoreConstructor } from "../type";

import { FeatureEditorStore } from "./FeatureEditorStore";
import { ATTRIBUTES_KEY } from "./constant";
import { registry } from "./registry";
import type { FeatureEditorTab } from "./registry";
import type { FeatureEditorWidgetProps } from "./type";

import ResetIcon from "@nextgisweb/icon/material/restart_alt";
import "./FeatureEditorWidget.less";

type TabItem = NonNullable<TabsProps["items"]>[number] & {
  order?: number;
};

const msgLoading = gettext("Loading...");
const msgSave = gettext("Save");
const msgOk = gettext("OK");
const msgReset = gettext("Reset");

const msgSaved = gettext("Feature saved");
const msgNoChanges = gettext("No changes to save");

const TabsLabelObserver = observer(
  ({ widgetStore, label }: { widgetStore: EditorStore; label: ReactNode }) => (
    <TabsLabelBadge
      error={widgetStore.isValid === false}
      counter={widgetStore.counter ?? undefined}
      dirty={widgetStore.dirty}
    >
      {label}
    </TabsLabelBadge>
  )
);

TabsLabelObserver.displayName = "TabsLabelObserver";

export const FeatureEditorWidget = observer(
  ({
    showGeometryTab = true,
    allowEmpty,
    resourceId,
    featureId,
    geometry,
    okBtnMsg = msgOk,
    toolbar,
    store: storeProp,
    mode = "save",
    onOk,
    onSave,
  }: FeatureEditorWidgetProps) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [activeKey, setActiveKey] = useState(ATTRIBUTES_KEY);
    const [store] = useState<FeatureEditorStore>(() => {
      if (storeProp) return storeProp;
      assert(resourceId && featureId);
      return new FeatureEditorStore({
        resourceId,
        featureId,
        geometry,
      });
    });

    const { dirty, saving } = store;

    const [items, setItems] = useState<TabItem[]>([]);

    const createEditorTab = useCallback(
      (newEditorWidget: FeatureEditorTab, attributeStore?: EditorStore) => {
        const key = newEditorWidget.identity;
        const widgetStore = newEditorWidget.store;
        const Widget = newEditorWidget.widget;

        return {
          key,
          order: newEditorWidget.order,
          destroyOnHidden: widgetStore === attributeStore,
          label: (
            <TabsLabelObserver
              widgetStore={widgetStore}
              label={newEditorWidget.label}
            />
          ),
          children: (
            <Suspense fallback={msgLoading}>
              <Widget store={widgetStore}></Widget>
            </Suspense>
          ),
        };
      },
      []
    );

    useEffect(() => {
      let cancelled = false;
      setItems([]);

      const loadWidgets = async () => {
        await store.init();
        if (cancelled) return;

        const stores = new Map<EditorStoreConstructor, EditorStore>();
        const editorWidgets: FeatureEditorTab[] = [];
        for (const reg of registry.queryAll()) {
          try {
            const Store = await reg.store();
            if (cancelled) return;

            let widgetStore = stores.get(Store.default);
            if (!widgetStore) {
              widgetStore = new Store.default({
                parentStore: store,
              });
              stores.set(Store.default, widgetStore);
            }
            const provider = await reg.provider({
              parentStore: store,
              store: widgetStore,
            });
            editorWidgets.push(...provider);
          } catch (error) {
            if (!cancelled) {
              errorModal(error);
            }
          }
          if (cancelled) return;
        }

        const geometryTabAvailable =
          showGeometryTab && store.featureLayer?.geometry_type !== "NONE";

        const tabs = editorWidgets.filter(
          ({ identity }) => identity !== GEOMETRY_KEY || geometryTabAvailable
        );
        const attributes = tabs.find(
          ({ identity }) => identity === ATTRIBUTES_KEY
        );
        const geometry = tabs.find(({ identity }) => identity === GEOMETRY_KEY);
        if (attributes) {
          store.attachAttributeStore(attributes.store);
        }
        if (geometry) {
          store.attachGeometryStore(geometry.store);
        }

        const attachedStores = new Set([attributes?.store, geometry?.store]);
        const newTabs: TabItem[] = [];
        for (const tab of tabs) {
          if (!attachedStores.has(tab.store)) {
            store.addExtensionStore(tab.identity, tab.store);
            attachedStores.add(tab.store);
          }
          newTabs.push(createEditorTab(tab, attributes?.store));
        }
        newTabs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
        setActiveKey(newTabs[0]?.key ?? ATTRIBUTES_KEY);
        setItems(newTabs);
      };

      loadWidgets().catch((error) => {
        if (!cancelled) {
          errorModal(error);
        }
      });

      return () => {
        cancelled = true;
        store.destroy();
      };
    }, [store, createEditorTab, showGeometryTab]);

    const onSaveClick = useCallback(async () => {
      if (!(await store.validate())) {
        return;
      }

      if (mode === "save") {
        try {
          if (!dirty) {
            messageApi.success({ content: msgNoChanges });
            return;
          }
          const res = await store.save();
          if (res) {
            messageApi.success({ content: msgSaved });
            if (onSave) {
              onSave(res);
            }
          }
        } catch (err) {
          errorModal(err);
        }
      } else if (onOk) {
        onOk(
          store.preparePayload(),
          store.preparePayload({ ignoreDirty: true })
        );
      }
    }, [dirty, messageApi, mode, onOk, onSave, store]);

    useUnsavedChanges({ dirty });

    const toolbarProps: Partial<ActionToolbarProps> = useMemo(() => {
      const actions: ActionToolbarAction[] = [
        <SaveButton
          disabled={!items.length || (allowEmpty ? false : !dirty)}
          key="save"
          loading={saving}
          onClick={onSaveClick}
        >
          {mode === "save" ? msgSave : okBtnMsg}
        </SaveButton>,
      ];
      const rightActions: ActionToolbarAction[] = [];
      if (dirty) {
        rightActions.push(
          <Button
            key="reset"
            onClick={() => {
              store.reset();
            }}
            icon={<ResetIcon />}
          >
            {msgReset}
          </Button>
        );
      }

      return {
        ...toolbar,
        actions: [...actions, ...(toolbar?.actions || [])],
        rightActions: [...rightActions, ...(toolbar?.rightActions || [])],
      };
    }, [
      allowEmpty,
      items,
      dirty,
      saving,
      onSaveClick,
      mode,
      okBtnMsg,
      toolbar,
      store,
    ]);

    return (
      <div className="ngw-feature-layer-editor">
        <Tabs
          type="card"
          size="large"
          activeKey={activeKey}
          onChange={setActiveKey}
          items={items}
          parentHeight
        />
        <ActionToolbar {...toolbarProps} />
        {contextHolder}
      </div>
    );
  }
);

FeatureEditorWidget.displayName = "FeatureEditorWidget";
