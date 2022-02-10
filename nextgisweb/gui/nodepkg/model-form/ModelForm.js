import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import { Alert, Form, Space } from "@nextgisweb/gui/antd";
import { SaveButton, LoadingWrapper } from "@nextgisweb/gui/component";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";

const btnTitleAliases = {
    create: i18n.gettext("Create"),
    edit: i18n.gettext("Save"),
    delete: i18n.gettext("Delete"),
};

export function ModelForm(props) {
    const { fields, model, id } = props;
    const operation = id !== undefined ? "edit" : "create";

    const [form] = Form.useForm();

    const [status, setStatus] = useState("loading");
    const [valid, setValid] = useState();
    const [value, setValue] = useState({});

    const onFieldsChange = ({ isValid }) => {
        setValid(isValid());
    };

    const submit = async () => {
        setStatus("saving");
        try {
            const json = await form.validateFields();
            const req =
                id !== undefined
                    ? route(model + ".item", id).put
                    : route(model + ".collection").post;
            const resp = await req({ json });
            const url = routeURL(model + ".edit", resp.id);
            window.open(url, "_self");
        } catch (err) {
            new ErrorDialog(err).show();
        } finally {
            setStatus(null);
        }
    };

    const onKeyDown = (event) => {
        if (event.key === "Enter") {
            submit();
        }
    };

    async function setInitialValues() {
        setStatus("loading");
        if (id) {
            try {
                const resp = await route(model + ".item", id).get();
                setValue(resp);
            } catch (er) {
                // model item is not exist handler
            }
        } else {
            const initialValues = {};
            for (const f of fields) {
                if (f.value !== undefined) {
                    initialValues[f.name] = f.value;
                }
            }
            setValue(initialValues);
        }
        setStatus(null);
    }

    useEffect(async () => {
        setInitialValues();

        window.addEventListener("keydown", onKeyDown, false);
        return () => {
            window.removeEventListener("keydown", onKeyDown, false);
        };
    }, []);

    return (
        <LoadingWrapper
            loading={status === "loading"}
            content={() => (
                <Space direction="vertical" style={{ width: "100%" }}>
                    <FieldsForm
                        initialValues={value}
                        fields={fields}
                        form={form}
                        onChange={onFieldsChange}
                    >
                        <Form.Item>
                            <SaveButton
                                disabled={!valid}
                                onClick={submit}
                                loading={status === "saving"}
                            >
                                {btnTitleAliases[operation]}
                            </SaveButton>
                        </Form.Item>
                    </FieldsForm>
                </Space>
            )}
        ></LoadingWrapper>
    );
}

ModelForm.propTypes = {
    id: PropTypes.number,
    model: PropTypes.string.isRequired,
    value: PropTypes.object,
    fields: PropTypes.array.isRequired,
};
