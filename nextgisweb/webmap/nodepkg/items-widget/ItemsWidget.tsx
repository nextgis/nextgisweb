import { sortBy } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { CheckboxValue, InputValue, Select, Space } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { InputOpacity, InputScaleDenom } from "@nextgisweb/gui/component";
import { FocusTable, action } from "@nextgisweb/gui/focus-table";
import type { FocusTableAction } from "@nextgisweb/gui/focus-table";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { adapters } from "@nextgisweb/pyramid/settings!webmap";
import { ResourceSelect } from "@nextgisweb/resource/component";
import { useFocusTablePicker } from "@nextgisweb/resource/component/resource-picker/hook/useFocusTablePicker";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import { SelectLegendSymbols } from "../component";

import { DrawOrderTable } from "./DrawOrder";
import { Group, Layer } from "./Item";
import type { ItemObject } from "./Item";
import type { ItemsStore } from "./ItemsStore";

import ReorderIcon from "@nextgisweb/icon/material/reorder";

const msgDisplayName = gettext("Display name");
const msgExpanded = gettext("Expanded");
const msgExclusive = gettext("Exclusive");
const msgEnabled = gettext("Enabled");
const msgIdentifiable = gettext("Identifiable");
const msgResource = gettext("Resource");
const msgTransparency = gettext("Transparency");
const msgMinScaleDenom = gettext("Min scale");
const msgMaxScaleDenom = gettext("Max scale");
const msgLegendSymbols = gettext("Legend");
const msgAdapter = gettext("Adapter");
const msgLayer = gettext("Layer");
const msgGroup = gettext("Group");
const msgDrawOrderEdit = gettext("Edit draw order");
const msgDrawOrderCustomize = gettext("Customize draw order");

const GroupWidget = observer(({ item }: { item: Group }) => {
    return (
        <Area pad>
            <LotMV
                label={msgDisplayName}
                value={item.displayName}
                component={InputValue}
            />
            <Lot>
                <Space size="middle">
                    <CheckboxValue {...item.groupExpanded.cprops()}>
                        {msgExpanded}
                    </CheckboxValue>
                    <CheckboxValue {...item.groupExclusive.cprops()}>
                        {msgExclusive}
                    </CheckboxValue>
                </Space>
            </Lot>
        </Area>
    );
});

const adapterOptions = sortBy(
    Object.entries(adapters).map(([k, v]) => ({
        value: k,
        label: v.display_name,
    })),
    "value"
);

const LayerWidget = observer(({ item }: { item: Layer }) => {
    return (
        <Area pad cols={2}>
            <LotMV
                row
                label={msgDisplayName}
                value={item.displayName}
                component={InputValue}
            />
            <Lot row>
                <Space size="middle">
                    <CheckboxValue {...item.layerEnabled.cprops()}>
                        {msgEnabled}
                    </CheckboxValue>
                    <CheckboxValue {...item.layerIdentifiable.cprops()}>
                        {msgIdentifiable}
                    </CheckboxValue>
                </Space>
            </Lot>
            <LotMV
                row
                label={msgResource}
                value={item.layerStyleId}
                component={ResourceSelect}
                props={{
                    readOnly: true,
                    style: { width: "100%" },
                    pickerOptions: {
                        initParentId: item.store.composite.parent,
                    },
                }}
            />
            <LotMV
                label={msgMinScaleDenom}
                value={item.layerMinScaleDenom}
                component={InputScaleDenom}
                props={{ style: { width: "100%" } }}
            />
            <LotMV
                label={msgMaxScaleDenom}
                value={item.layerMaxScaleDenom}
                component={InputScaleDenom}
                props={{ style: { width: "100%" } }}
            />
            <LotMV
                row
                label={msgLegendSymbols}
                value={item.layerLegendSymbols}
                component={SelectLegendSymbols}
                props={{ allowClear: true, style: { width: "100%" } }}
            />
            <LotMV
                row
                label={msgAdapter}
                value={item.layerAdapter}
                component={Select<string>}
                props={{
                    style: { width: "100%" },
                    options: adapterOptions,
                }}
            />
            <LotMV
                row
                label={msgTransparency}
                value={item.layerTransparency}
                component={InputOpacity}
                props={{ mode: "transparency", valuePercent: true }}
            />
        </Area>
    );
});

GroupWidget.displayName = "GroupWidget";
LayerWidget.displayName = "LayerWidget";

export const ItemsWidget: EditorWidgetComponent<EditorWidgetProps<ItemsStore>> =
    observer(({ store }: EditorWidgetProps<ItemsStore>) => {
        const { makeSignal } = useAbortController();
        const [drawOrderEdit, setDrawOrderEdit] = useState(false);

        const { pickToFocusTable } = useFocusTablePicker({
            initParentId: store.composite.parent,
        });

        const drawOrderEnabled = store.drawOrderEnabled.value;
        const { tableActions, itemActions } = useMemo(
            () => ({
                tableActions: [
                    pickToFocusTable<ItemObject>(
                        async (res) => {
                            const resourceId = res.resource.id;
                            if (
                                res.resource.cls.endsWith("_style") &&
                                res.resource.parent
                            ) {
                                res = await route(
                                    "resource.item",
                                    res.resource.parent?.id
                                ).get({ signal: makeSignal() });
                            }
                            return new Layer(store, {
                                display_name: res.resource.display_name,
                                layer_style_id: resourceId,
                            });
                        },
                        {
                            title: msgLayer,
                            pickerOptions: {
                                requireInterface: "IRenderableStyle",
                                multiple: true,
                            },
                        }
                    ),
                    action.addItem<ItemObject, Group>(
                        () =>
                            new Group(store, {
                                display_name: gettext(msgGroup),
                            }),
                        {
                            key: "add_group",
                            title: msgGroup,
                        }
                    ),
                    (
                        context: ItemObject | null
                    ): FocusTableAction<ItemObject | null>[] => {
                        if (context) return [];
                        return [
                            {
                                key: "draw_order",
                                title: drawOrderEnabled
                                    ? msgDrawOrderEdit
                                    : msgDrawOrderCustomize,
                                icon: <ReorderIcon />,
                                placement: "left",
                                callback: () => setDrawOrderEdit(true),
                            },
                        ];
                    },
                ],
                itemActions: [action.deleteItem<ItemObject>()],
            }),
            [drawOrderEnabled, makeSignal, pickToFocusTable, store]
        );

        return drawOrderEdit ? (
            <DrawOrderTable
                store={store}
                close={() => setDrawOrderEdit(false)}
            />
        ) : (
            <FocusTable<ItemObject>
                store={store}
                title={(item) => item.displayName.value}
                tableActions={tableActions}
                itemActions={itemActions}
                renderDetail={({ item }) =>
                    item instanceof Group ? (
                        <GroupWidget item={item} />
                    ) : (
                        <LayerWidget item={item} />
                    )
                }
            />
        );
    });

ItemsWidget.displayName = "ItemsWidget";
ItemsWidget.title = gettext("Layers");
ItemsWidget.activateOn = { update: true };
ItemsWidget.order = -50;
