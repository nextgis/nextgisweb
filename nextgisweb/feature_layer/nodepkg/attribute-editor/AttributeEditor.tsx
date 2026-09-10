import { observer } from "mobx-react-lite";
import { Suspense, useEffect, useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { Tabs } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { SizeType } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { AttributeEditorFields } from "./AttributeEditorFields";
import AttributeEditorStore from "./AttributeEditorStore";
import { registry } from "./registry";
import type { AttributeEditorLayout } from "./registry";
import type { NgwAttributeValue } from "./type";

import "./AttributeEditor.less";

const STANDARD_LAYOUT_KEY = "all-attributes";
const msgAllAttributes = gettext("All attributes");

type AttributeEditorProps = EditorWidgetProps<
  AttributeEditorStore,
  {
    fields?: FeatureLayerFieldRead[];
    size?: SizeType;
    onChange?: (value: NgwAttributeValue | null) => void;
  }
>;

const AttributeEditor = observer(
  ({
    store: store_,
    fields,
    size = "middle",
    onChange,
  }: AttributeEditorProps) => {
    const [store] = useState(
      () => store_ ?? new AttributeEditorStore({ fields })
    );
    const [layouts, setLayouts] = useState<AttributeEditorLayout[]>([]);
    const [activeKey, setActiveKey] = useState(STANDARD_LAYOUT_KEY);
    const [loadingLayouts, setLoadingLayouts] = useState(
      store._parentStore !== undefined
    );

    useEffect(() => {
      if (!store._parentStore) {
        setLoadingLayouts(false);
        return;
      }

      let cancelled = false;
      setLoadingLayouts(true);

      Promise.all(
        registry.queryAll().map(async (provider) => {
          try {
            return await provider(store);
          } catch (error) {
            errorModal(error);
            return [];
          }
        })
      ).then((groups) => {
        if (cancelled) return;

        const nextLayouts = groups.flat();
        setLayouts(nextLayouts);
        setActiveKey(nextLayouts[0]?.identity ?? STANDARD_LAYOUT_KEY);
        setLoadingLayouts(false);
      });

      return () => {
        cancelled = true;
      };
    }, [store]);

    const standardEditor = useMemo(
      () => (
        <AttributeEditorFields store={store} size={size} onChange={onChange} />
      ),
      [onChange, size, store]
    );

    const items = useMemo<NonNullable<TabsProps["items"]>>(
      () => [
        ...layouts.map(({ identity, label, content }) => ({
          key: identity,
          label,
          children: (
            <Suspense fallback={<LoadingWrapper />}>{content}</Suspense>
          ),
        })),
        {
          key: STANDARD_LAYOUT_KEY,
          label: msgAllAttributes,
          children: standardEditor,
        },
      ],
      [layouts, standardEditor]
    );

    if (loadingLayouts) return <LoadingWrapper />;
    if (!layouts.length) return standardEditor;

    return (
      <Tabs
        size="small"
        type="line"
        items={items}
        styles={{ header: { padding: "0 24px" } }}
        activeKey={activeKey}
        parentHeight
        destroyOnHidden
        onChange={setActiveKey}
      />
    );
  }
);

AttributeEditor.displayName = "AttributeEditor";

export default AttributeEditor;
