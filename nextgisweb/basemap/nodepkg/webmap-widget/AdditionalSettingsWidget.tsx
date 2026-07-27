import { observer } from "mobx-react-lite";

import { CheckboxValue } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ColorInput } from "@nextgisweb/sld/style-editor/field/ColorInput";

import type { WebMapStore } from "./WebMapStore";

const msgDisable = gettext("Disable basemaps");
const msgBackgroundColor = gettext("Background color");

export const AdditionalSettingsWidget = observer<{ store: WebMapStore }>(
  ({ store }) => {
    const backgroundColor = store.backgroundColor;

    return (
      <Area pad>
        <Lot label={msgDisable}>
          <CheckboxValue {...store.disable.cprops()} />
        </Lot>
        <Lot label={msgBackgroundColor}>
          <ColorInput
            disabledAlpha
            value={
              backgroundColor.value ? `#${backgroundColor.value}` : undefined
            }
            onChange={(color) => {
              backgroundColor.value = color ? color.replace(/^#/, "") : null;
            }}
          />
        </Lot>
      </Area>
    );
  }
);

AdditionalSettingsWidget.displayName = "AdditionalSettingsWidget";
