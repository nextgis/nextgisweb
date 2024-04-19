/** @testentry react */
import dayjs from "dayjs";
import { useState } from "react";

import {
    Checkbox,
    DatePicker,
    DateTimePicker,
    Input,
    InputNumber,
    Select,
    TimePicker,
} from "@nextgisweb/gui/antd";

import { FieldsForm } from "./FieldsForm";
import type { FieldsFormProps, FormField } from "./type";

const InputField: FormField = {
    name: "InputField",
    label: "InputField",
    formItem: <Input allowClear />,
};
const CheckboxField: FormField = {
    name: "CheckboxField",
    label: "CheckboxField",
    formItem: <Checkbox indeterminate />,
    valuePropName: "checked",
};

const usageFields: FormField[] = [
    {
        name: "field1",
        label: "Field 1 - default input",
        formItem: <Input placeholder="Fill Fields 1" />,
    },
    { name: "field2", label: "Field 2 - input widget", formItem: <Input /> },
    {
        name: "field3",
        label: "Field 3 - disabled",
        formItem: <Input disabled />,
    },
    {
        name: "field4",
        label: "Field 4 - use min max inputProps",
        formItem: <InputNumber min={10} max={20} />,
    },
    {
        name: "field5",
        label: "Field 5",
        formItem: <Checkbox />,
        valuePropName: "checked",
        help: "Need help?",
    },
    CheckboxField,
    InputField,
];

const fields: FormField[] = [
    {
        name: "Input",
        label: "formItem",
        formItem: <Input allowClear />,
    },
    { name: "Input2", formItem: <Input allowClear /> },
    { name: "Number", formItem: <InputNumber /> },
    { name: "Password", formItem: <Input.Password /> },
    { name: "Checkbox", formItem: <Checkbox />, valuePropName: "checked" },

    { name: "DateInput", formItem: <DatePicker /> },

    { name: "DateTimeInput", formItem: <DateTimePicker /> },

    { name: "TimeInput", formItem: <TimePicker /> },

    { name: "TextArea", formItem: <Input.TextArea /> },

    {
        name: "Select",
        formItem: (
            <Select
                options={[
                    { value: "js", label: "Javascript" },
                    { value: "ts", label: "Typescript" },
                ]}
            />
        ),
    },
];

const presets: [title: string, props: FieldsFormProps][] = [
    [
        "Simple form (default)",
        { fields: usageFields, initialValues: { field3: "disabled field" } },
    ],
    [
        "Form fields",
        {
            fields,
            initialValues: {
                Input: "test",
                Number: 123,
                Password: "xxxx",
                Checkbox: true,
                DateInput: dayjs("2012/12/12", "DD/MM/YY"),
                DateTimeInput: dayjs(
                    "2015-09-09 10:17:23",
                    "YYYY-MM-DDTHH:mm:ss"
                ),
                TimeInput: dayjs("10:17:24", "HH:mm:ss"),
                TextArea: "Text",
                Select: "ts",
            },
        },
    ],
];

function FormValues(props: FieldsFormProps) {
    const [values, setValues] = useState<Record<string, unknown>>({});
    return (
        <>
            <FieldsForm
                style={{ width: "40em" }}
                {...props}
                labelCol={{ flex: "auto" }}
                layout="vertical"
                onChange={async ({ isValid, value }) => {
                    const valid = await isValid();
                    if (valid) {
                        setValues((old) => ({ ...old, ...value }));
                    }
                }}
            />
            <p>Form output</p>
            <div>{JSON.stringify(values)};</div>
        </>
    );
}

function FieldsFormTest() {
    return (
        <>
            {presets.map(([title, props]) => {
                return (
                    <div key={title} style={{ marginBottom: "1em" }}>
                        <h4>{title}</h4>

                        <div style={{ marginTop: "1ex" }}></div>
                        <FormValues {...props}></FormValues>
                    </div>
                );
            })}
        </>
    );
}

export default FieldsFormTest;
