import { observer } from "mobx-react-lite";

import {
  CheckboxValue,
  Input,
  InputNumber,
  Select,
} from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget as IEditorWidget } from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";

// prettier-ignore
const [
  msgMode,
  msgPointSize,
  msgOpacity,
  msgPercentileClip,
  msgElevationMin,
  msgElevationMax,
  msgRampStart,
  msgRampEnd,
  msgIntensityModulation,
  msgClassificationColors,
] = [
  gettext("Mode"),
  gettext("Point size"),
  gettext("Opacity"),
  gettext("Use percentile clipping"),
  gettext("Elevation min percentile"),
  gettext("Elevation max percentile"),
  gettext("Ramp start color"),
  gettext("Ramp end color"),
  gettext("Modulate by intensity"),
  gettext("Classification colors"),
];

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    return (
      <Area pad>
        <Lot label={msgMode}>
          <Select
            value={store.mode}
            options={store.supportedModes}
            onChange={(mode) => store.update({ mode })}
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={msgPointSize}>
          <InputNumber
            value={store.pointSize}
            min={0.1}
            step={0.1}
            onChange={(pointSize) =>
              store.update({ pointSize: pointSize ?? 2 })
            }
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={msgOpacity}>
          <InputNumber
            value={store.opacity}
            min={0}
            max={100}
            onChange={(opacity) => store.update({ opacity: opacity ?? 100 })}
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={false}>
          <CheckboxValue
            value={store.usePercentileClip}
            onChange={(usePercentileClip) =>
              store.update({ usePercentileClip })
            }
          >
            {msgPercentileClip}
          </CheckboxValue>
        </Lot>

        {store.mode === "elevation" && (
          <>
            <Lot label={msgElevationMin}>
              <InputNumber
                value={store.elevationMinPercent}
                min={0}
                max={100}
                onChange={(elevationMinPercent) =>
                  store.update({
                    elevationMinPercent: elevationMinPercent ?? 2,
                  })
                }
                style={{ width: "100%" }}
              />
            </Lot>
            <Lot label={msgElevationMax}>
              <InputNumber
                value={store.elevationMaxPercent}
                min={0}
                max={100}
                onChange={(elevationMaxPercent) =>
                  store.update({
                    elevationMaxPercent: elevationMaxPercent ?? 98,
                  })
                }
                style={{ width: "100%" }}
              />
            </Lot>
            <Lot label={msgRampStart}>
              <Input
                value={store.rampStartColor}
                onChange={(e) =>
                  store.update({ rampStartColor: e.target.value })
                }
              />
            </Lot>
            <Lot label={msgRampEnd}>
              <Input
                value={store.rampEndColor}
                onChange={(e) => store.update({ rampEndColor: e.target.value })}
              />
            </Lot>
          </>
        )}

        {store.mode === "classification" && (
          <>
            <Lot label={msgClassificationColors}>
              <Input.TextArea
                value={store.classificationColors}
                onChange={(e) =>
                  store.update({ classificationColors: e.target.value })
                }
                rows={6}
                placeholder={"2=#8c510a\n5=#4daf4a\n6=#bdbdbd"}
              />
            </Lot>
            <Lot label={false}>
              <CheckboxValue
                value={store.intensityModulation}
                onChange={(intensityModulation) =>
                  store.update({ intensityModulation })
                }
              >
                {msgIntensityModulation}
              </CheckboxValue>
            </Lot>
          </>
        )}
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Point cloud style");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -40;
