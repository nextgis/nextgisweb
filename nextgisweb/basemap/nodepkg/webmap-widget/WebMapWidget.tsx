import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { CheckboxValue, InputValue } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { InputOpacity } from "@nextgisweb/gui/component";
import { FocusTable, action } from "@nextgisweb/gui/focus-table";
import type {
  FocusTableAction,
  FocusTablePropsActions,
} from "@nextgisweb/gui/focus-table";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/component";
import { useFocusTablePicker } from "@nextgisweb/resource/component/resource-picker";
import type { EditorWidget } from "@nextgisweb/resource/type";

import { AdditionalSettingsWidget } from "./AdditionalSettingsWidget";
import { Basemap } from "./Basemap";
import type { WebMapStore } from "./WebMapStore";

import ArrowBackIcon from "@nextgisweb/icon/material/arrow_back";
import SettingsIcon from "@nextgisweb/icon/material/tune";

const msgSettings = gettext("Additional settings");
const msgBack = gettext("Back to basemaps");

const BasemapWidget = observer<{
  item: Basemap;
}>(({ item }) => {
  return (
    <Area pad>
      <LotMV
        label={gettext("Display name")}
        value={item.displayName}
        component={InputValue}
      />
      <LotMV
        value={item.enabled}
        component={CheckboxValue}
        props={{ children: gettext("Default basemap") }}
      />
      <LotMV
        label={gettext("Opacity")}
        value={item.opacity}
        component={InputOpacity}
      />
      <LotMV
        label={gettext("Resource")}
        value={item.resourceId}
        component={ResourceSelect}
        props={{
          readOnly: true,
          style: { width: "100%" },
          pickerOptions: {
            initParentId: item.store.composite.parent,
          },
        }}
      />
    </Area>
  );
});

BasemapWidget.displayName = "BasemapWidget";

const ConfigPanel = observer<{
  store: WebMapStore;
  onBack: () => void;
}>(({ store, onBack }) => {
  const disabled = store.disable.value;
  return (
    <div>
      <ActionToolbar
        borderBlockEnd
        actions={[
          {
            key: "back",
            type: "text",
            title: msgBack,
            icon: <ArrowBackIcon />,
            disabled,
            action: onBack,
          },
        ]}
      />
      <AdditionalSettingsWidget store={store} />
    </div>
  );
});

ConfigPanel.displayName = "ConfigPanel";

export const WebMapWidget: EditorWidget<WebMapStore> = observer(({ store }) => {
  const [showSettings, setShowSettings] = useState(() => store.disable.value);

  const { pickToFocusTable } = useFocusTablePicker({
    initParentId: store.composite.parent || undefined,
  });

  const { tableActions, itemActions } = useMemo<
    FocusTablePropsActions<Basemap>
  >(
    () => ({
      tableActions: [
        pickToFocusTable(
          (res) => {
            return new Basemap(store, {
              resource_id: res.id,
              display_name: res.get("resource.display_name"),
              enabled: !store.basemaps.some((i) => i.enabled.value),
              opacity: null,
            });
          },
          {
            pickerOptions: {
              requireClass: "basemap_layer",
              multiple: true,
            },
          }
        ),
        (context: Basemap | null): FocusTableAction<Basemap | null>[] => {
          if (context) return [];
          return [
            {
              key: "settings",
              title: msgSettings,
              icon: <SettingsIcon />,
              placement: "left",
              callback: () => setShowSettings(true),
            },
          ];
        },
      ],
      itemActions: [action.deleteItem()],
    }),
    [pickToFocusTable, store]
  );

  return showSettings ? (
    <ConfigPanel store={store} onBack={() => setShowSettings(false)} />
  ) : (
    <FocusTable<Basemap>
      store={store}
      title={(item) => item.displayName.value}
      columns={[]}
      tableActions={tableActions}
      itemActions={itemActions}
      renderDetail={({ item }) => <BasemapWidget item={item} />}
    />
  );
});

WebMapWidget.displayName = "WebMapWidget";
WebMapWidget.title = gettext("Basemaps");
