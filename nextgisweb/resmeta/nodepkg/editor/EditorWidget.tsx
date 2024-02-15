import { observer } from "mobx-react-lite";

import { Input, InputNumber, Select } from "@nextgisweb/gui/antd";
import type { InputNumberProps, InputProps } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import type {
    RecordItem,
    RecordOption,
} from "@nextgisweb/gui/edi-table/store/RecordItem";
import type {
    ComponentProps,
    EdiTableColumn,
} from "@nextgisweb/gui/edi-table/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";

const msgTypeToAdd = gettext("Type here to add a new key...");

const { Option } = Select;

const InputKey = observer(
    ({ row, placeholder }: ComponentProps<RecordItem>) => {
        return (
            <Input
                value={row.key}
                onChange={(e) => {
                    const props: Partial<RecordOption> = {
                        key: e.target.value,
                    };
                    if (row.value === undefined) {
                        props.value = "";
                    }
                    row.update(props);
                }}
                variant="borderless"
                placeholder={placeholder ? msgTypeToAdd : undefined}
            />
        );
    }
);

const InputValue = observer(({ row }: ComponentProps<RecordItem>) => {
    if (row.type === "string") {
        return (
            <Input
                value={row.value as InputProps["value"]}
                onChange={(e) => {
                    row.update({ value: e.target.value });
                }}
                variant="borderless"
            />
        );
    } else if (row.type === "number") {
        return (
            <InputNumber
                value={row.value as InputNumberProps["value"]}
                controls={false}
                onChange={(newValue) => {
                    row.update({ value: newValue });
                }}
                variant="borderless"
            />
        );
    } else if (row.type === "boolean") {
        return (
            <Select
                value={row.value}
                onChange={(value) => {
                    row.update({ value: value });
                }}
                variant="borderless"
                popupMatchSelectWidth={false}
            >
                <Option value={false}>{gettext("False")}</Option>
                <Option value={true}>{gettext("True")}</Option>
            </Select>
        );
    }

    return <></>;
});

const SelectType = observer(({ row }: ComponentProps<RecordItem>) => {
    return (
        <Select
            value={row.type}
            onChange={(value) => {
                row.update({ type: value });
            }}
            variant="borderless"
            popupMatchSelectWidth={false}
        >
            <Option value="string">{gettext("String")}</Option>
            <Option value="number">{gettext("Number")}</Option>
            <Option value="boolean">{gettext("Boolean")}</Option>
            <Option value="null">{gettext("Empty")}</Option>
        </Select>
    );
});

const columns: EdiTableColumn<RecordItem>[] = [
    {
        key: "key",
        title: gettext("Key"),
        width: "50%",
        component: InputKey,
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
        component: InputValue,
    },
];

export const EditorWidget: EditorWidgetComponent<
    EditorWidgetProps<EditorStore>
> = observer(({ store }) => {
    return (
        <EdiTable store={store} columns={columns} rowKey="id" parentHeight />
    );
});

EditorWidget.title = gettext("Metadata");
EditorWidget.order = 100;
