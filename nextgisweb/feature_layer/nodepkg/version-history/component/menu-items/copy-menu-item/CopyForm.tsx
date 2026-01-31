import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";

import { Input, Space } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { useShowModal } from "@nextgisweb/gui/index";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRoute, useRouteGet } from "@nextgisweb/pyramid/hook";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import { getUniqueName } from "@nextgisweb/pyramid/util";
import { ResourceSelect } from "@nextgisweb/resource/component";
import type { ResourceRefWithParent } from "@nextgisweb/resource/type/api";

type CopyProps = {
    name: string;
    parent: number;
};

export interface AfterCopyOptions {
    item: ResourceRefWithParent;
}

export function CopyForm({
    style,
    versionId,
    resourceId,
    onCreate,
}: {
    style?: React.CSSProperties;
    versionId: number | [number, number];
    resourceId: number;
    onCreate?: () => void;
}) {
    const form = Form.useForm<CopyProps>()[0];

    const { modalHolder, modalStore } = useShowModal();

    const { data, isLoading } = useRouteGet("resource.item", {
        id: resourceId,
    });
    const { makeSignal } = useAbortController();
    const { route } = useRoute("resource.collection");

    const [parentId, setParentId] = useState<number>();
    const [saving, setSaving] = useState(false);
    const [nameLoading, setNameLoading] = useState(false);

    const defaultCopyName = useMemo(() => {
        const dn = data?.resource?.display_name ?? `#${resourceId}`;
        return gettextf("{dn} copy")({ dn });
    }, [data, resourceId]);

    const fields = useMemo<FormField<keyof CopyProps>[]>(
        () => [
            {
                name: "parent",
                label: gettext("Create copy in"),
                formItem: (
                    <ResourceSelect
                        value={parentId}
                        pickerOptions={{
                            traverseClasses: ["resource_group"],
                            hideUnavailable: true,
                        }}
                    />
                ),
                required: true,
            },
            {
                name: "name",
                label: gettext("Display name"),
                formItem: <Input />,
                required: true,
                disabled: nameLoading,
            },
        ],
        [nameLoading, parentId]
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
        if (!open) return;
        if (!data?.resource) return;

        const pId =
            ngwConfig.resourceHome && "id" in ngwConfig.resourceHome
                ? ngwConfig.resourceHome.id
                : data.resource.parent?.id;

        if (typeof pId === "number") {
            form.setFieldsValue({ parent: pId, name: defaultCopyName });
            setParentId(pId);
            setUniqName(defaultCopyName, pId);
        } else {
            form.setFieldsValue({ name: defaultCopyName });
        }
    }, [data, form, defaultCopyName, setUniqName]);

    const createCopy = useCallback(async () => {
        try {
            setSaving(true);

            await form.validateFields();
            const { parent, name } = form.getFieldsValue();

            const created = await route.post({
                json: {
                    resource: {
                        cls: "vector_layer",
                        parent: { id: parent },
                        display_name: name,
                    },
                    vector_layer: {
                        srs: { id: 3857 },
                        feature_layer: {
                            resource: { id: resourceId },
                            version: Array.isArray(versionId)
                                ? versionId[1]
                                : versionId,
                        },
                    },
                },
            });

            if (created) {
                form.resetFields();
                onCreate?.();
                const url = routeURL("resource.show", created.id);
                window.open(url, "_blank");
            }
        } catch (er) {
            errorModal(er, { modalStore });
        } finally {
            setSaving(false);
        }
    }, [versionId, onCreate, form, route, modalStore, resourceId]);

    if (isLoading) return null;

    return (
        <Space orientation="vertical" style={{ width: "100%", ...style }}>
            {modalHolder}
            <FieldsForm<CopyProps> form={form} fields={fields} />
            <SaveButton loading={saving} onClick={createCopy}>
                {gettext("Create copy")}
            </SaveButton>
        </Space>
    );
}
