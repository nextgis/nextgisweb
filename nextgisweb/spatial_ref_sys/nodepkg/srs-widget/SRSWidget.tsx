import { useMemo, useState } from "react";

import { Button, Form, Modal } from "@nextgisweb/gui/antd";
import type { ApiError } from "@nextgisweb/gui/error/type";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import getMessages from "../srsMessages";
import { modelObj } from "../srsModel";
import type { RefSysConvertPostResp, SRSItem } from "../type";

import { SRSImportFrom } from "./SRSImportForm";

const DEFAULT_DATA = { projStr: "", format: "proj4" };

export function SRSWidget({ id, readonly }: { id: number, readonly: boolean }) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isProtected, setIsProtected] = useState(false);
    const [isSystem, setIsSystem] = useState(false);
    const [form] = Form.useForm();
    const [modalForm] = Form.useForm();
    const fields = useMemo<FormField[]>(() => {
        return [
            {
                name: "display_name",
                label: gettext("Display name"),
                required: true,
            },
            {
                name: "auth_name_srid",
                label: gettext("Authority and code"),
                value: (record: SRSItem) =>
                    `${record.auth_name}:${record.auth_srid}`,
                disabled: true,
                included: id !== undefined && isProtected,
            },
            {
                name: "wkt",
                label: gettext("OGC WKT definition"),
                widget: "text",
                rows: 4,
                required: true,
                disabled: isProtected,
            },
        ];
    }, [isProtected, id]);

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleOk = async () => {
        try {
            const json = await modalForm.validateFields();
            const resp = await route(
                "spatial_ref_sys.convert"
            ).post<RefSysConvertPostResp>({
                json,
            });
            if (resp.wkt) {
                const fields = form.getFieldsValue();
                form.setFieldsValue({ ...fields, wkt: resp.wkt });
                setIsModalVisible(false);
            } else if (resp.error) {
                console.log(resp.error);
            }
        } catch (error) {
            const err = error as ApiError;
            if ("message" in err) {
                modalForm.setFields([
                    {
                        name: "projStr",
                        errors: [err.message],
                    },
                ]);
            }
        }
    };

    const handleCancel = () => {
        modalForm.setFieldsValue(DEFAULT_DATA);
        setIsModalVisible(false);
    };

    // to not exec gettext on closed modal
    const Title = () => <>{gettext("Import definition")}</>;

    return (
        <>
            <ModelForm
                id={id}
                fields={fields}
                readonly={readonly}
                allowDelete={!isSystem}
                form={form}
                model={modelObj}
                labelCol={{ span: 5 }}
                messages={getMessages()}
                onChange={(obj) => {
                    const v = obj.value as SRSItem;
                    if (v) {
                        if (v.system !== undefined) {
                            setIsSystem(v.system);
                        }
                        if (v.protected !== undefined) {
                            setIsProtected(v.protected);
                        }
                    }
                }}
            >
                {!isProtected && (
                    <Form.Item wrapperCol={{ offset: 5 }}>
                        <Button size="small" onClick={showModal}>
                            {gettext("Import definition")}
                        </Button>
                    </Form.Item>
                )}
            </ModelForm>
            <Modal
                title={<Title />}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <SRSImportFrom {...DEFAULT_DATA} form={modalForm} />
            </Modal>
        </>
    );
}
