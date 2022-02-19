import { PropTypes } from "prop-types";
import { Fragment } from "react";
import { Checkbox, Form, Input, InputNumber } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!gui";

export function FieldsForm(props) {
    const { fields, initialValues, onChange, form, ...formProps } = props;
    const form_ = form || Form.useForm()[0];

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

    return (
        <Form {...formProps_}>
            {fields &&
                fields.map((f) => (
                    <Fragment key={f.name}>{FormItem(f)}</Fragment>
                ))}
            {props.children}
        </Form>
    );
}

function FormItem(props) {
    const { required, requiredMessage, widget, ...formProps } = props;
    formProps.rules = formProps.rules || [];

    if (required) {
        formProps.rules.push({
            required: true,
            message: requiredMessage ?? i18n.gettext("This value is required"),
        });
    }

    const FormWidget = widget;
    if (typeof widget === "function") {
        return <FormWidget {...formProps}></FormWidget>;
    }
    if (widget === "checkbox") {
        return (
            <Form.Item {...formProps} valuePropName="checked">
                <Checkbox></Checkbox>
            </Form.Item>
        );
    }

    return (
        <Form.Item {...formProps}>{getInputType(widget, formProps)}</Form.Item>
    );
}

function getInputType(widget, props) {
    if (typeof widget === "string") {
        widget = widget.toLowerCase();
        if (widget === "password") {
            return <Input.Password {...props} />;
        } else if (widget === "textarea") {
            return <Input.TextArea {...props} />;
        } else if (widget === "number") {
            return <InputNumber type="number" {...props} />;
        }
    }
    return <Input {...props} />;
}

FieldsForm.propTypes = {
    fields: PropTypes.array,
    initialValues: PropTypes.object,
    children: PropTypes.node,
    onChange: PropTypes.func,
    form: PropTypes.any,
};
FormItem.propTypes = {
    name: PropTypes.string,
    label: PropTypes.string,
    widget: PropTypes.string,
    disabled: PropTypes.boolean,
    required: PropTypes.boolean,
    choices: PropTypes.array,
    requiredMessage: PropTypes.string,
};
