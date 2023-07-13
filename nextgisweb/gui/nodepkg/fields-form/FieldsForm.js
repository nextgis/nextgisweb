import { PropTypes } from "prop-types";

import { Fragment, useEffect, useMemo, useRef } from "react";

import i18n from "@nextgisweb/pyramid/i18n";

import { Checkbox } from "./field/Checkbox";
import { DateInput } from "./field/DateInput";
import { DateTimeInput } from "./field/DateTimeInput";
import { Input } from "./field/Input";
import { Number } from "./field/Number";
import { Password } from "./field/Password";
import { Select } from "./field/Select";
import { TextArea } from "./field/TextArea";
import { TimeInput } from "./field/TimeInput";

import {
    // Checkbox,
    // DateInput,
    // DateTimeInput,
    // Input,
    // Number,
    // Password,
    // Select,
    // TextArea,
    // TimeInput,
    Form,
} from "./";

const widgetsByName = {
    checkbox: Checkbox,
    date: DateInput,
    datetime: DateTimeInput,
    input: Input,
    number: Number,
    password: Password,
    select: Select,
    text: TextArea,
    time: TimeInput,
};

export function FieldsForm(props) {
    const { fields, initialValues, onChange, whenReady, form, ...formProps } =
        props;
    const form_ = Form.useForm(form)[0];
    const whenReady_ = useRef(whenReady);

    const isValid = async () => {
        return form_.getFieldsError().every((e) => {
            return e.errors.length === 0;
        });
    };
    const onFieldsChange = (changedFields) => {
        const value = {};
        for (const c of changedFields) {
            value[c.name[0]] = c.value;
        }
        onChange({ isValid, value });
    };

    const formProps_ = {
        form: form_,
        initialValues,
        autoComplete: "off",
        labelCol: { span: 5 },
        labelAlign: "left",
        ...formProps,
    };

    if (onChange) {
        formProps_.onFieldsChange = onFieldsChange;
    }

    const includedFormItems = useMemo(
        () =>
            fields
                ? fields.filter((f) => {
                    const included = f.included;
                    if (included !== undefined) {
                        if (typeof included === "function") {
                            return included(f, initialValues);
                        }
                        return !!included;
                    }
                    return true;
                })
                : [],
        [fields, initialValues]
    );

    useEffect(() => {
        if (whenReady_.current) {
            whenReady_.current();
        }
    }, []);

    return (
        <Form labelWrap colon={false} {...formProps_} className="fields-form">
            {includedFormItems.map((f) => (
                <Fragment key={f.name}>{<FormItem {...f} />}</Fragment>
            ))}
            {props.children}
        </Form>
    );
}

function FormItem(props) {
    const { required, requiredMessage, widget, ...formProps } = props;

    delete formProps.included;
    delete formProps.value;
    formProps.rules = formProps.rules || [];

    if (required) {
        formProps.rules.push({
            required: true,
            message: requiredMessage ?? i18n.gettext("This value is required"),
        });
    }

    let FormWidget;
    if (typeof widget === "string") {
        FormWidget = widgetsByName[widget.toLowerCase()];
    } else if (typeof widget === "function") {
        FormWidget = widget;
    }
    FormWidget = FormWidget || Input;

    return <FormWidget {...formProps}></FormWidget>;
}

const FormItemType = {
    name: PropTypes.string,
    label: PropTypes.string,
    widget: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    disabled: PropTypes.bool,
    required: PropTypes.bool,
    choices: PropTypes.array,
    requiredMessage: PropTypes.string,
    included: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
    inputProps: PropTypes.object,
};

const FieldPropTypes = PropTypes.shape({
    name: PropTypes.string.isRequired,
    label: PropTypes.string,
    widget: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    mode: PropTypes.string,
    included: PropTypes.bool,
    choices: PropTypes.arrayOf(
        PropTypes.shape({ name: PropTypes.string, value: PropTypes.any })
    ),
    disabled: PropTypes.bool,
});

FieldsForm.propTypes = {
    initialValues: PropTypes.object,
    whenReady: PropTypes.func,
    onChange: PropTypes.func,
    children: PropTypes.node,
    fields: PropTypes.arrayOf(FieldPropTypes),
    form: PropTypes.any,
};

FormItem.propTypes = FormItemType;

FieldsForm.propTypes = {
    initialValues: PropTypes.object,
    whenReady: PropTypes.func,
    onChange: PropTypes.func,
    children: PropTypes.node,
    fields: PropTypes.arrayOf(PropTypes.shape(FormItemType)),
    form: PropTypes.any,
};
