import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { CheckboxValue, Modal } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { SettingStore } from "./SettingStore";

/* prettier-ignore */ const
msgFeatureVersioning = gettext("Feature versioning"),
msgConfirmTile = gettext("Disable feature versioning?"),
msgConfirmContent = gettext("Turning off feature versioning will truncate the history and keep only the latest state.");

export const SettingsWidget: EditorWidget<SettingStore> = observer(
  ({ store }) => {
    const [modal, modalContextHolder] = Modal.useModal();

    const versioningEnabledOnChange = useCallback(
      (v: boolean) => {
        const onOk = () => store.update({ versioningEnabled: v });
        if (v || !store.versioningExisting) return onOk();

        modal.confirm({
          title: msgConfirmTile,
          content: msgConfirmContent,
          onOk,
        });
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
            {msgFeatureVersioning}
          </CheckboxValue>
        </Lot>
      </Area>
    );
  }
);

SettingsWidget.displayName = "SettingsWidget";
SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
