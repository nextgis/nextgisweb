import { observer } from "mobx-react-lite";

import { Input, InputNumber, Select } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";

import i18n from "@nextgisweb/pyramid/i18n";

const mTypeToAdd = i18n.gettext("Type here to add a new key...");

const { Option } = Select;

const InputKey = observer(({ row, placeholder }) => {
    return (
        <Input
            value={row.key}
            onChange={(e) => {
                const props = { key: e.target.value };
                if (row.value == undefined) {
                    props.value = "";
                }
                row.update(props);
            }}
            bordered={false}
            placeholder={placeholder ? mTypeToAdd : undefined}
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
                dropdownMatchSelectWidth={false}
            >
                <Option value={false}>{i18n.gettext("False")}</Option>
                <Option value={true}>{i18n.gettext("True")}</Option>
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
            dropdownMatchSelectWidth={false}
        >
            <Option value="string">{i18n.gettext("String")}</Option>
            <Option value="number">{i18n.gettext("Number")}</Option>
            <Option value="boolean">{i18n.gettext("Boolean")}</Option>
            <Option value="null">{i18n.gettext("Empty")}</Option>
        </Select>
    );
});

const columns = [
    {
        key: "key",
        title: i18n.gettext("Key"),
        width: "50%",
        component: InputKey,
    },
    {
        key: "type",
        title: i18n.gettext("Type"),
        shrink: "10ch",
        component: SelectType,
    },
    {
        key: "value",
        title: i18n.gettext("Value"),
        width: "50%",
        component: InputValue,
    },
];

export const EditorWidget = observer(({ store }) => {
    return <EdiTable {...{ store, columns }} rowKey="id" parentHeight />;
});

EditorWidget.title = i18n.gettext("Metadata");
EditorWidget.order = 100;
