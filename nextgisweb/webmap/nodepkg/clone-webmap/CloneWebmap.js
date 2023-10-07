import { useEffect, useMemo, useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/field/ResourceSelect";

export function CloneWebmap({ id }) {
    const form = Form.useForm()[0];

    const { data, isLoading } = useRouteGet(
        "resource.item",
        { id },
        { cache: true }
    );

    const { makeSignal } = useAbortController();

    const [nameLoading, setNameLoading] = useState(false);
    const [parentId, setParentId] = useState(null);
    const [saving, setSaving] = useState(false);

    const fields = useMemo(
        () => [
            {
                name: "parent",
                label: gettext("Resource group"),
                widget: ResourceSelect,
                inputProps: {
                    pickerOptions: {
                        traverseClasses: ["resource_group"],
                        hideUnavailable: true,
                    },
                },
                required: true,
            },
            {
                name: "name",
                disabled: nameLoading,
                label: gettext("Display name"),
                required: true,
            },
        ],
        [nameLoading]
    );

    const parseName = (existName) => {
        const m = existName.match(/^(.*)\((.*?)\)$/);
        if (m) {
            const [, onlyName, multiply] = m;
            return [onlyName, multiply];
        }
        return [existName];
    };

    const setUniqName = async (resname, parentId_) => {
        setNameLoading(true);
        try {
            const siblings = await route("resource.collection").get({
                signal: makeSignal(),
                query: { parent: parentId_ },
            });
            let lastMultipy = 0;
            let newName = resname;
            const [onlyname] = parseName(resname);
            for (const s of siblings) {
                const [onlyname_, multiply] = parseName(
                    s.resource.display_name
                );
                if (
                    onlyname &&
                    onlyname_ &&
                    onlyname.trim() === onlyname_.trim()
                ) {
                    const multiplyInt = parseInt(multiply, 10);
                    if (multiplyInt > lastMultipy) {
                        lastMultipy = multiplyInt;
                    }
                }
            }
            for (const s of siblings) {
                const existName = s.resource.display_name;
                if (resname === existName) {
                    if (lastMultipy) {
                        newName = `${onlyname.trim()} (${
                            Number(lastMultipy) + 1
                        })`;
                    } else {
                        newName = `${resname} (1)`;
                    }
                }
            }
            form.setFieldsValue({ name: newName });
        } finally {
            setNameLoading(false);
        }
    };

    const onChange = (val) => {
        setParentId(val.parent);
    };

    useEffect(() => {
        if (data && data.resource) {
            setParentId(data.resource.parent.id);
            setUniqName(data.resource.display_name, data.resource.parent.id);
        }
    }, [data]);

    const props = {
        form,
        fields,
        onChange,
        initialValues: { parent: parentId },
    };

    const clone = async () => {
        const val = form.getFieldValue();
        const { resource, resmeta, webmap, ...rest } = JSON.parse(
            JSON.stringify(data)
        );
        delete rest.social;
        delete resource.id;
        delete resource.scopes;
        delete resource.children;
        delete resource.interfaces;
        delete resource.creation_date;
        resource.keyname = null;
        resource.display_name = val.name;
        resource.parent = { id: val.parent };

        const clone_ = async () => {
            setSaving(true);
            try {
                const newResPayload = { resource, resmeta, webmap, ...rest };
                const cloneItem = await route("resource.collection").post({
                    json: newResPayload,
                    signal: makeSignal(),
                });
                const newItemDetailUrl = routeURL(
                    "resource.update",
                    cloneItem.id
                );
                window.open(newItemDetailUrl, "_self");
            } catch (er) {
                const cantChangePermissions =
                    er.data &&
                    er.data.exception &&
                    er.data.exception ===
                        "nextgisweb.core.exception.ForbiddenError";
                if (cantChangePermissions && resource.permissions) {
                    // Workaround to make a copy without permission to change permissions
                    delete resource.permissions;
                    delete resource.owner_user;
                    await clone_();
                } else {
                    errorModal(er);
                }
            } finally {
                setSaving(false);
            }
        };
        clone_();
    };

    if (isLoading) {
        return <LoadingWrapper></LoadingWrapper>;
    }

    return (
        <>
            <Space direction="vertical" style={{ width: "100%" }}>
                <FieldsForm {...props}></FieldsForm>
                <SaveButton loading={saving} onClick={clone}>
                    {gettext("Clone")}
                </SaveButton>
            </Space>
        </>
    );
}
