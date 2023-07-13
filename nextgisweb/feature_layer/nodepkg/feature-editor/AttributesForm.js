import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useMemo, useCallback, useState } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import { Button, Tooltip } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";

import {
    BigInteger,
    DateInput,
    DateTimeInput,
    FieldsForm,
    Input,
    Integer,
    Number,
    TimeInput,
    Form,
} from "@nextgisweb/gui/fields-form";

import BackspaceIcon from "@material-icons/svg/backspace";

const style = { width: "100%" };

const ngwTypeAliases = {
    STRING: [Input],
    REAL: [Number, { style }],
    INTEGER: [Integer, { style }],
    BIGINT: [BigInteger, { style }],
    DATETIME: [DateTimeInput, { style, allowClear: false }],
    DATE: [DateInput, { style, allowClear: false }],
    TIME: [TimeInput, { style, allowClear: false }],
};

const setNullTitle = i18n.gettext("Set field value to NULL (No data)");

export const AttributesForm = observer(({ store }) => {
    const { fields, values, setValues, initLoading } = store;
    const [size] = useState("small");
    const form = Form.useForm()[0];

    const setNullForField = useCallback(
        (field) => {
            form.setFieldValue(field, null);
            setValues({ [field]: null });
        },
        [form, setValues]
    );

    const formFields = useMemo(
        () =>
            fields.map((field) => {
                const widgetAlias = ngwTypeAliases[field.datatype];
                const [widget, inputProps] = widgetAlias;

                const props = {
                    name: field.keyname,
                    label: field.display_name,
                    widget,
                    inputProps,
                    append: (
                        <Tooltip title={setNullTitle} placement="right">
                            <Button
                                onClick={() => {
                                    setNullForField(field.keyname);
                                }}
                            >
                                <BackspaceIcon
                                    style={{ verticalAlign: "middle" }}
                                />
                            </Button>
                        </Tooltip>
                    ),
                };
                const val = values[field.keyname];
                if (val === null) {
                    props.placeholder = "NULL";
                }

                return props;
            }),
        [fields, values, setNullForField]
    );

    if (initLoading) {
        return <LoadingWrapper />;
    }

    return (
        <FieldsForm
            form={form}
            size={size}
            fields={formFields}
            initialValues={values}
            onChange={async (v) => {
                if (await v.isValid()) {
                    setValues(v.value);
                }
            }}
        ></FieldsForm>
    );
});

AttributesForm.propTypes = {
    store: PropTypes.object,
};
