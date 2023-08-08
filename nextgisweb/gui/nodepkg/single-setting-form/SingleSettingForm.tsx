import { useEffect, useState } from "react";

import { Col, Input, message, Row } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n";

import type { UndefinedRoutes } from "@nextgisweb/pyramid/api/type";
import type { ParamsOf } from "../type";
import type { ApiError } from "../error/type";

type InputParams = ParamsOf<typeof Input>;

interface SingleSettingFormParams {
    model: UndefinedRoutes;
    settingName?: string;
    saveSuccessText?: string;
    saveSuccessReloadText?: string;
    inputProps?: InputParams;
}

const saveSuccesText_ = i18n.gettext("The setting is saved.");
const saveSuccesReloadText_ = i18n.gettext(
    "Reload the page to get them applied."
);

export function SingleSettingForm({
    model,
    settingName,
    saveSuccessText: saveSuccesText = saveSuccesText_,
    saveSuccessReloadText: saveSuccesReloadText = saveSuccesReloadText_,
    inputProps = {},
}: SingleSettingFormParams) {
    const [status, setStatus] = useState<"loading" | "saving" | null>(
        "loading"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [value, setValue] = useState<any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = useRouteGet<any>({
        name: model,
    });

    useEffect(() => {
        if (data !== undefined) {
            const val = settingName ? data[settingName] : data;
            setValue(val);
            setStatus(null);
        }
    }, [data, settingName]);

    const save = async () => {
        setStatus("saving");
        try {
            const json = settingName
                ? { [settingName]: value || null }
                : value || null;
            await route(model).put({
                json,
            });
            if (saveSuccesText) {
                message.success(
                    [saveSuccesText, saveSuccesReloadText]
                        .filter(Boolean)
                        .join(" ")
                );
            }
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setStatus(null);
        }
    };

    if (status === "loading") {
        return <LoadingWrapper rows={1} />;
    }

    return (
        <Row>
            <Col flex="auto">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    allowClear
                    {...inputProps}
                />
            </Col>
            <Col flex="none">
                <SaveButton loading={status === "saving"} onClick={save} />
            </Col>
        </Row>
    );
}
