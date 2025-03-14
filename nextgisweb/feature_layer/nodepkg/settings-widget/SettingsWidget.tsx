import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { CheckboxValue, Modal, Tooltip } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { SettingStore } from "./SettingStore";

import ExperimentalIcon from "@nextgisweb/icon/material/science";

// prettier-ignore
const [msgVersioningEnabled, msgVersioningExperimental] = [
    gettext("Feature versioning"),
    gettext("Experimental feature. Some operations may not work if feature versioning is enabled."),
];

const versioningExperimental = (
    <Tooltip title={msgVersioningExperimental}>
        <ExperimentalIcon />
    </Tooltip>
);

export const SettingsWidget: EditorWidget<SettingStore> = observer(
    ({ store }) => {
        const [modal, modalContextHolder] = Modal.useModal();

        const versioningEnabledOnChange = useCallback(
            (v: boolean) => {
                const onOk = () => store.update({ versioningEnabled: v });
                if (v || !store.versioningExisting) return onOk();

                // prettier-ignore
                const [title, content] = [
                gettext("Disable feature versioning?"),
                gettext("Turning off feature versioning will truncate the history and keep only the latest state.")
            ]

                modal.confirm({ title, content, onOk });
            },
            [modal, store]
        );

        return (
            <Area pad>
                {modalContextHolder}
                <Lot label={false}>
                    <CheckboxValue
                        value={store.versioningEnabled}
                        onChange={versioningEnabledOnChange}
                    >
                        {msgVersioningEnabled} {versioningExperimental}
                    </CheckboxValue>
                </Lot>
            </Area>
        );
    }
);

SettingsWidget.displayName = "SettingsWidget";
SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
