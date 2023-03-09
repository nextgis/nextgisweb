import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useMemo, useCallback } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import { Button } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!";

import {
    DateInput,
    DateTimeInput,
    FieldsForm,
    Input,
    Integer,
    Number,
    TimeInput,
    useForm,
} from "@nextgisweb/gui/fields-form";

const ngwTypeAliases = {
    DATETIME: DateTimeInput,
    INTEGER: Integer,
    STRING: Input,
    REAL: Number,
    TIME: TimeInput,
    DATE: DateInput,
    BIGINT: Integer,
};

const setNullMsg = i18n.gettext("Set NULL");

export const AttributesForm = observer(({ store }) => {
    const { fields, values, setValues, initLoading } = store;
    const form = useForm()[0];

    const setNullForField = useCallback(
        (field) => {
            form.setFieldValue(field, null);
            setValues({ [field]: null });
        },
        [form, setValues]
    );

    const formFiealds = useMemo(
        () =>
            fields.map((field) => {
                const props = {
                    name: field.keyname,
                    label: field.display_name,
                    widget: ngwTypeAliases[field.datatype],
                    append: (
                        <Button
                            onClick={() => {
                                setNullForField(field.keyname);
                            }}
                        >
                            {setNullMsg}
                        </Button>
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
            size="small"
            fields={formFiealds}
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
