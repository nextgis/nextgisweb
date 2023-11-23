import { useCallback, useEffect, useMemo, useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/field/ResourceSelect";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import { cloneResource } from "./util/cloneResource";
import { getUniqueName } from "./util/getUniqName";

export function CloneWebmap({ id }: { id: number }) {
    const form = Form.useForm()[0];

    const { data, isLoading } = useRouteGet<ResourceItem>(
        "resource.item",
        { id },
        { cache: true }
    );

    const { makeSignal } = useAbortController();

    const [nameLoading, setNameLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fields = useMemo<FormField[]>(
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

    const setUniqName = useCallback(
        async (resname: string, parentId_: number) => {
            setNameLoading(true);
            try {
                const newName = await getUniqueName({
                    signal: makeSignal(),
                    parentId: parentId_,
                    defaultName: resname,
                });
                form.setFieldsValue({ name: newName });
            } finally {
                setNameLoading(false);
            }
        },
        [form, makeSignal]
    );

    useEffect(() => {
        if (data && data.resource) {
            form.setFieldsValue({ parent: data.resource.parent.id });
            setUniqName(data.resource.display_name, data.resource.parent.id);
        }
    }, [data, form, setUniqName]);

    const clone = useCallback(async () => {
        try {
            if (data) {
                setSaving(true);
                const { name, parent } = form.getFieldsValue();
                await cloneResource({
                    displayName: name,
                    parentId: parent,
                    resourceItem: data,
                    signal: makeSignal(),
                });
            }
        } finally {
            setSaving(false);
        }
    }, [data, form, makeSignal]);

    if (isLoading) {
        return <LoadingWrapper></LoadingWrapper>;
    }

    return (
        <>
            <Space direction="vertical" style={{ width: "100%" }}>
                <FieldsForm form={form} fields={fields}></FieldsForm>
                <SaveButton loading={saving} onClick={clone}>
                    {gettext("Clone")}
                </SaveButton>
            </Space>
        </>
    );
}
