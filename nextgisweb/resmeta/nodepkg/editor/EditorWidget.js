import { observer } from "mobx-react-lite";

import { Input, InputNumber, Select } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgTypeToAdd = gettext("Type here to add a new key...");

const { Option } = Select;

const InputKey = observer(({ row, placeholder }) => {
    return (
        <Input
            value={row.key}
            onChange={(e) => {
                const props = { key: e.target.value };
                if (row.value === undefined) props.value = "";
                row.update(props);
            }}
            bordered={false}
            placeholder={placeholder ? msgTypeToAdd : undefined}
        />
    );
});

const InputValue = observer(({ row }) => {
    if (row.type === "string") {
        return (
            <Input
                value={row.value}
                onChange={(e) => {
                    row.update({ value: e.target.value });
                }}
                bordered={false}
            />
        );
    } else if (row.type === "number") {
        return (
            <InputNumber
                value={row.value}
                controls={false}
                onChange={(newValue) => {
                    row.update({ value: newValue });
                }}
                bordered={false}
            />
        );
    } else if (row.type === "boolean") {
        return (
            <Select
                value={row.value}
                onChange={(value) => {
                    row.update({ value: value });
                }}
                bordered={false}
                popupMatchSelectWidth={false}
            >
                <Option value={false}>{gettext("False")}</Option>
                <Option value={true}>{gettext("True")}</Option>
            </Select>
        );
    }

    return <></>;
});

const SelectType = observer(({ row }) => {
    return (
        <Select
            value={row.type}
            onChange={(value) => {
                row.update({ type: value });
            }}
            bordered={false}
            popupMatchSelectWidth={false}
        >
            <Option value="string">{gettext("String")}</Option>
            <Option value="number">{gettext("Number")}</Option>
            <Option value="boolean">{gettext("Boolean")}</Option>
            <Option value="null">{gettext("Empty")}</Option>
        </Select>
    );
});

const columns = [
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

export const EditorWidget = observer(({ store }) => {
    return <EdiTable {...{ store, columns }} rowKey="id" parentHeight />;
});

EditorWidget.title = gettext("Metadata");
EditorWidget.order = 100;
