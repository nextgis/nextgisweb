import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { Button, Tooltip } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import i18n from "@nextgisweb/pyramid/i18n";

import {
    BigInteger,
    DateInput,
    DateTimeInput,
    FieldsForm,
    Form,
    Input,
    Integer,
    Number,
    TimeInput,
} from "@nextgisweb/gui/fields-form";

import BackspaceIcon from "@material-icons/svg/backspace";

import type {
    SizeType,
    FormField,
    FormWidget,
} from "@nextgisweb/gui/fields-form";
import type { AttributesFormProps } from "./type";
import type { FeatureLayerDataType } from "../type";

const style = { width: "100%" };

const ngwTypeAliases: Record<
    FeatureLayerDataType,
    [widget: FormWidget, props?: Record<string, unknown>]
> = {
    STRING: [Input],
    REAL: [Number, { style }],
    INTEGER: [Integer, { style }],
    BIGINT: [BigInteger, { style }],
    DATETIME: [DateTimeInput, { style, allowClear: false }],
    DATE: [DateInput, { style, allowClear: false }],
    TIME: [TimeInput, { style, allowClear: false }],
};

const setNullTitle = i18n.gettext("Set field value to NULL (No data)");

const AttributesForm = observer(({ store }: AttributesFormProps) => {
    const { fields, values, setValues, initLoading } = store;
    const [size] = useState<SizeType>("small");
    const form = Form.useForm()[0];

    const setNullForField = useCallback(
        (field) => {
            form.setFieldValue(field, null);
            setValues({ [field]: null });
        },
        [form, setValues]
    );

    const formFields = useMemo(() => {
        return fields.map((field) => {
            const widgetAlias = ngwTypeAliases[field.datatype];
            const [widget, inputProps] = widgetAlias;

            const props: FormField = {
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
        });
    }, [fields, values, setNullForField]);

    if (initLoading) {
        return <LoadingWrapper />;
    }

    return (
        <div className="ngw-gui-antd-tab-padding">
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
            />
        </div>
    );
});

export default AttributesForm;
