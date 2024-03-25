import { useCallback, useEffect, useMemo, useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FieldsFormProps, FormField } from "@nextgisweb/gui/fields-form";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelect } from "@nextgisweb/resource/field/ResourceSelect";
import type {
    CompositeCreate,
    CompositeRead,
    ResourceRefWithParent,
} from "@nextgisweb/resource/type/api";

import { cloneResource } from "./util/cloneResource";
import { getUniqueName } from "./util/getUniqName";

const msgSaveButtonTitle = gettext("Clone");

export interface AfterCloneOptions {
    item: ResourceRefWithParent;
}
interface CloneWebmapProps {
    id: number;
    fieldsFormProps?: Omit<FieldsFormProps, "fields" | "form">;
    saveButtonTitle?: string;
    afterClone?: (opt: AfterCloneOptions) => void;
    beforeClone?: (
        resourceItem: CompositeRead,
        options?: { signal?: AbortSignal }
    ) => Promise<CompositeCreate>;
}

export function CloneWebmap({
    id,
    afterClone,
    beforeClone,
    saveButtonTitle = msgSaveButtonTitle,
    fieldsFormProps,
}: CloneWebmapProps) {
    const form = Form.useForm()[0];

    const { data, isLoading } = useRouteGet(
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
            const parent = data.resource.parent;
            if (parent) {
                form.setFieldsValue({ parent: parent.id });
                setUniqName(data.resource.display_name, parent.id);
            }
        }
    }, [data, form, setUniqName]);

    const clone = useCallback(async () => {
        try {
            if (data) {
                setSaving(true);

                const resourceItem = beforeClone
                    ? await beforeClone(data)
                    : (data as CompositeCreate);

                const { name, parent } = form.getFieldsValue();
                const cloneItem = await cloneResource({
                    displayName: name,
                    parentId: parent,
                    resourceItem,
                    signal: makeSignal(),
                });
                if (cloneItem) {
                    if (afterClone) {
                        afterClone({ item: cloneItem });
                    } else {
                        const newItemDetailUrl = routeURL(
                            "resource.update",
                            cloneItem.id
                        );
                        window.open(newItemDetailUrl, "_self");
                    }
                }
            }
        } finally {
            setSaving(false);
        }
    }, [data, beforeClone, form, makeSignal, afterClone]);

    if (isLoading) {
        return <LoadingWrapper></LoadingWrapper>;
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <FieldsForm
                {...fieldsFormProps}
                form={form}
                fields={fields}
            ></FieldsForm>
            <SaveButton loading={saving} onClick={clone}>
                {saveButtonTitle}
            </SaveButton>
        </Space>
    );
}
