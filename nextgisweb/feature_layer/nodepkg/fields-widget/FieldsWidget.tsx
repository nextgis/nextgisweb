import { observer } from "mobx-react-lite";
import { useCallback, useMemo } from "react";

import { CheckboxValue, InputValue, Modal } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { FocusTable, Toggle, action } from "@nextgisweb/gui/focus-table";
import type { FocusTableAction } from "@nextgisweb/gui/focus-table";
import { Area } from "@nextgisweb/gui/mayout";
import { LunkwillParam } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";

import { DatatypeSelect } from "./DatatypeSelect";
import { Field } from "./FieldsStore";
import type { FieldsStore } from "./FieldsStore";

import LabelFieldIcon from "@nextgisweb/icon/material/font_download/outline";
import TextSearchIcon from "@nextgisweb/icon/material/manage_search";
import GridVisibilityIcon from "@nextgisweb/icon/material/table_chart/outline";

const msgDisplayName = gettext("Display name");
const msgKeyname = gettext("Keyname");
const msgDatatype = gettext("Type");
const msgLookupTable = gettext("Lookup table");
const msgGridVisibility = gettext("Feature table");
const msgTextSearch = gettext("Text search");
const msgLabelField = gettext("Label attribute");

const msgDatatypePlaceholder = gettext("Please select");
const msgLookupTableNotUsed = gettext("Not used");

const FieldWidget = observer<{
    item: Field;
}>(function GroupComponentBase({ item }) {
    return (
        <Area pad>
            <LotMV
                label={msgDisplayName}
                value={item.displayName}
                component={InputValue}
            />
            <LotMV
                label={msgKeyname}
                value={item.keyname}
                component={InputValue}
            />
            <LotMV
                label={msgDatatype}
                value={item.datatype}
                component={DatatypeSelect}
                props={{
                    placeholder: msgDatatypePlaceholder,
                    disabled: !!item.id.value,
                    style: { width: "100%" },
                }}
            />
            <LotMV
                label={msgLookupTable}
                visible={item.loookupTableAvailable}
                value={item.lookupTable}
                component={ResourceSelectRef}
                props={{
                    pickerOptions: {
                        requireClass: "lookup_table",
                        initParentId: item.store.composite.parent,
                    },
                    placeholder: msgLookupTableNotUsed,
                    style: { width: "100%" },
                    allowClear: true,
                }}
            />
            <LotMV
                label={false}
                value={item.gridVisibility}
                component={CheckboxValue}
                props={{ children: msgGridVisibility }}
            />
            <LotMV
                label={false}
                value={item.textSearch}
                component={CheckboxValue}
                props={{ children: msgTextSearch }}
            />
            <LotMV
                label={false}
                value={item.labelField}
                component={CheckboxValue}
                props={{ children: msgLabelField }}
            />
        </Area>
    );
});

// prettier-ignore
const [msgDeleteFieldTitle, msgDeleteFieldContent] = [
    gettext("Delete field?"),
    gettext("Deleting this field will permanently erase all its version history from this layer."),
];

export const FieldsWidget: EditorWidget<FieldsStore> = observer(({ store }) => {
    const [modal, contextHolder] = Modal.useModal();

    const createField = useCallback(() => {
        let seqnum = 0;
        let suffix = "";
        while (++seqnum) {
            let exists = false;
            suffix = String(seqnum);
            for (const field of store.fields) {
                if (
                    field.displayName.value.endsWith(suffix) ||
                    field.keyname.value.endsWith(suffix)
                ) {
                    exists = true;
                    break;
                }
            }
            if (!exists) break;
        }
        return new Field(store, {
            id: undefined,
            display_name: gettext("Field") + " " + suffix,
            keyname: "field" + "_" + suffix,
            datatype: undefined,
            grid_visibility: true,
            label_field: false,
            lookup_table: null,
            text_search: true,
        });
    }, [store]);

    // TODO: Use interfaces and capabilities to get available actions
    const isVectorLayer = store.composite.cls === "vector_layer";

    const itemActions = useMemo<FocusTableAction<Field>[]>(() => {
        if (isVectorLayer) {
            const deleteAction = action.deleteItem<Field>();

            const originalCb = deleteAction.callback;
            deleteAction.callback = async (item, env) => {
                const lunkwill = new LunkwillParam();
                const dump = await store.composite.dump(lunkwill);
                const layerNotNew = item.id.value !== undefined;
                const versioningInitially =
                    store.composite.initialValue?.feature_layer?.versioning
                        ?.enabled;
                const versioningNow =
                    dump?.feature_layer?.versioning?.enabled ??
                    versioningInitially;

                if (layerNotNew && versioningNow) {
                    modal.confirm({
                        title: msgDeleteFieldTitle,
                        content: msgDeleteFieldContent,
                        onOk: () => originalCb(item, env),
                    });
                } else {
                    originalCb(item, env);
                }
            };

            return [deleteAction];
        }
        return [];
    }, [isVectorLayer, store.composite, modal]);

    return (
        <>
            {contextHolder}
            <FocusTable<Field>
                store={store}
                title={(item) => item.displayName.value}
                columns={[
                    {
                        render: (item) => item.keyname.value,
                        width: ["20%", "30%"],
                    },
                    { render: (item) => item.datatype.value },
                    {
                        render: (item) => (
                            <>
                                <Toggle
                                    {...item.gridVisibility.cprops()}
                                    icon={<GridVisibilityIcon />}
                                    title={msgGridVisibility}
                                />
                                <Toggle
                                    {...item.textSearch.cprops()}
                                    icon={<TextSearchIcon />}
                                    title={msgTextSearch}
                                />
                                <Toggle
                                    {...item.labelField.cprops()}
                                    icon={<LabelFieldIcon />}
                                    title={msgLabelField}
                                />
                            </>
                        ),
                    },
                ]}
                tableActions={
                    isVectorLayer ? [action.addItem(createField)] : []
                }
                itemActions={itemActions}
                renderDetail={({ item }) => <FieldWidget item={item} />}
            />
        </>
    );
});

FieldsWidget.displayName = "FieldsWidget";
FieldsWidget.title = gettext("Fields");
FieldsWidget.activateOn = { update: true };
FieldsWidget.order = -50;
