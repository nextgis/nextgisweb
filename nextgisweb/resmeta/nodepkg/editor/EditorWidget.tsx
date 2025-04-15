import { observer } from "mobx-react-lite";

import { InputNumber, InputValue, Select } from "@nextgisweb/gui/antd";
import { EdiTable, EdiTableKeyInput } from "@nextgisweb/gui/edi-table";
import type {
    EdiTableColumn,
    EdiTableColumnComponentProps,
} from "@nextgisweb/gui/edi-table";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";

const { Option } = Select;

type RowType = EditorStore["items"][number];

const ValueInput = observer<EdiTableColumnComponentProps<RowType>>(
    ({ row }) => {
        if (row.type === "string") {
            return (
                <InputValue
                    variant="borderless"
                    value={row.value as string}
                    onChange={row.setValue}
                />
            );
        } else if (row.type === "number") {
            return (
                <InputNumber
                    variant="borderless"
                    controls={false}
                    value={row.value as number}
                    onChange={row.setValue}
                />
            );
        } else if (row.type === "boolean") {
            return (
                <Select
                    variant="borderless"
                    popupMatchSelectWidth={false}
                    value={row.value as boolean}
                    onChange={row.setValue}
                >
                    <Option value={false}>{gettext("False")}</Option>
                    <Option value={true}>{gettext("True")}</Option>
                </Select>
            );
        }

        return <></>;
    }
);

ValueInput.displayName = "ValueInput";

const SelectType = observer<EdiTableColumnComponentProps<RowType>>(
    ({ row }) => {
        return (
            <Select
                variant="borderless"
                popupMatchSelectWidth={false}
                value={row.type}
                onChange={(value) => {
                    row.update({ type: value });
                }}
            >
                <Option value="string">{gettext("String")}</Option>
                <Option value="number">{gettext("Number")}</Option>
                <Option value="boolean">{gettext("Boolean")}</Option>
                <Option value="null">{gettext("Empty")}</Option>
            </Select>
        );
    }
);

SelectType.displayName = "SelectType";

const columns: EdiTableColumn<RowType>[] = [
    {
        key: "key",
        title: gettext("Key"),
        width: "50%",
        component: EdiTableKeyInput,
    },
    {
        key: "type",
        title: gettext("Type"),
        shrink: "10ch",
        component: SelectType,
    },
    {
        key: "value",
        title: gettext("Value"),
        width: "50%",
        component: ValueInput,
    },
];

export const EditorWidget: IEditorWidget<EditorStore> = observer(
    ({ store }) => {
        return (
            <EdiTable
                store={store}
                columns={columns}
                rowKey="id"
                parentHeight
            />
        );
    }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Metadata");
EditorWidget.order = 100;
