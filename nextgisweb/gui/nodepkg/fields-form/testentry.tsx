/** @testentry react */
import dayjs from "dayjs";
import { useState } from "react";

import { FieldsForm } from "./FieldsForm";
import {
    Checkbox,
    DateInput,
    DateTimeInput,
    Input,
    Number,
    Password,
    Select,
    TextArea,
    TimeInput,
} from "./fields";
import type { FieldsFormProps, FormField } from "./type";

const InputField: FormField = {
    name: "InputField",
    label: "InputField",
    widget: "input",
    inputProps: { allowClear: true },
};
const CheckboxField: FormField = {
    name: "CheckboxField",
    label: "CheckboxField",
    widget: Checkbox,
    inputProps: { indeterminate: true },
};

const usageFields: FormField[] = [
    {
        name: "field1",
        label: "Field 1 - default input",
        placeholder: "Fill Fields 1",
    },
    { name: "field2", label: "Field 2 - input widget", widget: Input },
    { name: "field3", label: "Field 3 - disabled", disabled: true },
    {
        name: "field4",
        label: "Field 4 - use min max inputProps",
        widget: "number",
        inputProps: { min: 10, max: 20 },
    },
    {
        name: "field5",
        label: "Field 5",
        widget: Checkbox,
        help: "Need help?",
        inputProps: {},
    },
    CheckboxField,
    InputField,
];

const fields: FormField[] = [
    { name: "Input", widget: Input },
    { name: "Input2", widget: "input" },
    { name: "Number", widget: Number },
    { name: "Number2", widget: "number" },
    { name: "Password", widget: Password },
    { name: "Password2", widget: "password" },
    { name: "Checkbox", widget: Checkbox },
    { name: "Checkbox2", widget: "checkbox" },
    { name: "DateInput", widget: DateInput },
    { name: "DateInput2", widget: "date" },
    { name: "DateTimeInput", widget: DateTimeInput },
    { name: "DateTimeInput2", widget: "datetime" },
    { name: "TimeInput", widget: TimeInput },
    { name: "TimeInput2", widget: "time" },
    { name: "TextArea", widget: TextArea },
    { name: "TextArea2", widget: TextArea },
    {
        name: "Select",
        widget: Select,
        choices: [
            { value: "js", label: "Javascript" },
            { value: "ts", label: "Typescript" },
        ],
    },
    {
        name: "Select2",
        widget: "select",
        choices: [
            { value: "yes", label: "Yes" },
            { value: "No", label: "No" },
        ],
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
                const propsCode = Object.entries(props)
                    .map(([k, v]) =>
                        v === true ? k : k + "={" + JSON.stringify(v) + "}"
                    )
                    .join(" ");
                return (
                    <div key={title} style={{ marginBottom: "1em" }}>
                        <h4>{title}</h4>
                        <code>{`<FieldsForm ${propsCode}/>`}</code>
                        <div style={{ marginTop: "1ex" }}></div>
                        <FormValues {...props}></FormValues>
                    </div>
                );
            })}
        </>
    );
}

export default FieldsFormTest;
