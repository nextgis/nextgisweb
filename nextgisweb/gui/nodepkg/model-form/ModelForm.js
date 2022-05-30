import { Button, Form, message, Popconfirm, Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!gui";
import { errorModal } from "@nextgisweb/gui/error";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

const btnTitleAliases = {
    create: i18n.gettext("Create"),
    edit: i18n.gettext("Save"),
    delete: i18n.gettext("Delete"),
};

export function ModelForm(props) {
    const {
        id,
        model: m,
        fields,
        children,
        messages: msg,
        allowDelete: allowDelete_,
        ...formProps
    } = props;

    const allowDelete = allowDelete_ ?? true;
    const operation = id !== undefined ? "edit" : "create";

    const messages = msg ?? {};
    const deleteConfirm =
        messages.deleteConfirm || i18n.gettext("Confirmation");

    const model =
        typeof m === "string"
            ? {
                  item: m + ".item",
                  collection: m + ".collection",
                  edit: m + ".edit",
                  browse: m + ".browse",
              }
            : m;

    const form = props.form || Form.useForm()[0];

    const [status, setStatus] = useState("loading");
    const [value, setValue] = useState({});

    const submit = async () => {
        setStatus("saving");
        try {
            const json = await form.validateFields();
            const req =
                id !== undefined
                    ? route(model.item, id).put
                    : route(model.collection).post;
            try {
                await req({ json });
                const url = routeURL(model.browse);
                window.open(url, "_self");
            } catch (err) {
                errorModal(err);
            }
        } catch (err) {
            message.error(i18n.gettext("Fix the form errors first"));
        } finally {
            setStatus(null);
        }
    };

    const deleteModelItem = async () => {
        setStatus("deleting");

        try {
            await route(model.item, id).delete();
            const url = routeURL(model.browse);
            window.open(url, "_self");
        } catch (err) {
            errorModal(err);
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
        const initialValues = {};
        if (id) {
            try {
                const resp = await route(model.item, id).get();
                Object.assign(initialValues, resp);
                if (formProps.onChange) {
                    formProps.onChange({ value: initialValues });
                }
            } catch (er) {
                // model item is not exist handler
            }
        }
        for (const f of fields) {
            if (f.value !== undefined && initialValues[f.name] === undefined) {
                if (typeof f.value === "function") {
                    initialValues[f.name] = f.value(initialValues);
                } else {
                    initialValues[f.name] = f.value;
                }
            }
        }
        setValue(initialValues);

        setStatus(null);
    }

    useEffect(async () => {
        setInitialValues();
        window.addEventListener("keydown", onKeyDown, false);
        return () => {
            window.removeEventListener("keydown", onKeyDown, false);
        };
    }, []);

    if (status === "loading") {
        return <LoadingWrapper />;
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <FieldsForm
                initialValues={value}
                fields={fields}
                form={form}
                {...formProps}
            >
                {children}
                <Form.Item>
                    <Space>
                        <SaveButton
                            onClick={submit}
                            loading={status === "saving"}
                        >
                            {btnTitleAliases[operation]}
                        </SaveButton>
                        {operation === "edit" && allowDelete ? (
                            <Popconfirm
                                title={deleteConfirm}
                                onConfirm={deleteModelItem}
                            >
                                <Button danger>
                                    {btnTitleAliases["delete"]}
                                </Button>
                            </Popconfirm>
                        ) : (
                            ""
                        )}
                    </Space>
                </Form.Item>
            </FieldsForm>
        </Space>
    );
}

ModelForm.propTypes = {
    id: PropTypes.number,
    children: PropTypes.node,
    model: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    value: PropTypes.object,
    fields: PropTypes.array.isRequired,
    form: PropTypes.any,
    onChange: PropTypes.func,
    allowDelete: PropTypes.bool,
};
