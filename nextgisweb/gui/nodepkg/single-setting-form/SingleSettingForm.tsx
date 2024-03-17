import { useEffect, useState } from "react";

import { Input, Space, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import type { KeysWithMethods } from "@nextgisweb/pyramid/api/type";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ApiError } from "../error/type";
import type { ParamsOf } from "../type";

type InputParams = ParamsOf<typeof Input>;

interface SingleSettingFormParams {
    model: KeysWithMethods<["get", "put"]>;
    component: string;
    settingName: string;
    saveSuccessText?: string;
    saveSuccessReloadText?: string;
    inputProps?: InputParams;
}

const msgSaved = gettext("The setting is saved.");
const msgReload = gettext("Reload the page to get them applied.");

export function SingleSettingForm({
    model,
    component,
    settingName,
    saveSuccessText: saveSuccesText = msgSaved,
    saveSuccessReloadText: saveSuccesReloadText = msgReload,
    inputProps = {},
}: SingleSettingFormParams) {
    const [status, setStatus] = useState<"loading" | "saving" | null>(
        "loading"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [value, setValue] = useState<any>();

    const { data } = useRouteGet<Record<string, Record<string, unknown>>>({
        name: model,
        options: {
            query: {
                [component]: settingName,
            },
        },
    });

    useEffect(() => {
        if (data !== undefined) {
            const val = settingName
                ? data[component][settingName]
                : data[component];
            setValue(val);
            setStatus(null);
        }
    }, [data, component, settingName]);

    const save = async () => {
        setStatus("saving");
        try {
            const json = settingName
                ? { [settingName]: value || null }
                : value || null;
            await route(model).put({
                json: { [component]: json },
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
        <Space.Compact style={{ "width": "100%" }}>
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                allowClear
                {...inputProps}
            />
            <SaveButton loading={status === "saving"} onClick={save} />
        </Space.Compact>
    );
}
