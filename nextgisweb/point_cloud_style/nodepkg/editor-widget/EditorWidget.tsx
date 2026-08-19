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
import { ColorInput } from "@nextgisweb/sld/style-editor/field/ColorInput";

import { MAX_POINT_BUDGET, MIN_POINT_BUDGET } from "./EditorStore";
import type { EditorStore } from "./EditorStore";

const [
  msgMode,
  msgPointSize,
  msgOpacity,
  msgPointBudget,
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
  gettext("Point budget"),
  gettext("Use percentile clipping"),
  gettext("Elevation min percentile"),
  gettext("Elevation max percentile"),
  gettext("Ramp start color"),
  gettext("Ramp end color"),
  gettext("Modulate by intensity"),
  gettext("Classification colors"),
];

const [
  msgModeHelp,
  msgPointSizeHelp,
  msgOpacityHelp,
  msgPointBudgetHelp,
  msgPercentileClipHelp,
  msgElevationMinHelp,
  msgElevationMaxHelp,
  msgRampStartHelp,
  msgRampEndHelp,
  msgIntensityModulationHelp,
  msgClassificationColorsHelp,
] = [
  gettext("Choose how point cloud colors are calculated."),
  gettext("Sets the rendered size of each point."),
  gettext("Controls overall transparency of the point cloud."),
  gettext("Maximum number of points rendered in the current view."),
  gettext("Ignore extreme elevation outliers when coloring points."),
  gettext("Lower elevation percentile used for color ramp scaling."),
  gettext("Upper elevation percentile used for color ramp scaling."),
  gettext("Color assigned to the lowest elevations in range."),
  gettext("Color assigned to the highest elevations in range."),
  gettext("Adjust colors using point intensity values."),
  gettext("Map classification codes to colors, one per line."),
];

export const EditorWidget: IEditorWidget<EditorStore> = observer(
  ({ store }) => {
    const showIntensityModulation =
      store.capabilities.hasIntensity &&
      (store.mode === "rgb" || store.mode === "classification");

    return (
      <Area pad>
        <Lot label={msgMode} help={msgModeHelp}>
          <Select
            value={store.mode}
            options={store.supportedModes}
            onChange={(mode) => store.update({ mode })}
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={msgPointSize} help={msgPointSizeHelp}>
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

        <Lot label={msgOpacity} help={msgOpacityHelp}>
          <InputNumber
            value={store.opacity}
            min={0}
            max={100}
            onChange={(opacity) => store.update({ opacity: opacity ?? 100 })}
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={msgPointBudget} help={msgPointBudgetHelp}>
          <InputNumber
            value={store.pointBudget}
            min={MIN_POINT_BUDGET}
            max={MAX_POINT_BUDGET}
            step={10000}
            onChange={(pointBudget) =>
              store.update({ pointBudget: pointBudget ?? MIN_POINT_BUDGET })
            }
            style={{ width: "100%" }}
          />
        </Lot>

        <Lot label={msgPercentileClip} help={msgPercentileClipHelp}>
          <CheckboxValue
            value={store.usePercentileClip}
            onChange={(usePercentileClip) =>
              store.update({ usePercentileClip })
            }
          />
        </Lot>

        {store.mode === "elevation" && (
          <>
            <Lot label={msgElevationMin} help={msgElevationMinHelp}>
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
            <Lot label={msgElevationMax} help={msgElevationMaxHelp}>
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
            <Lot label={msgRampStart} help={msgRampStartHelp}>
              <ColorInput
                disabledAlpha
                value={store.rampStartColor}
                onChange={(rampStartColor) =>
                  store.update({ rampStartColor: rampStartColor ?? "#2b83ba" })
                }
              />
            </Lot>
            <Lot label={msgRampEnd} help={msgRampEndHelp}>
              <ColorInput
                disabledAlpha
                value={store.rampEndColor}
                onChange={(rampEndColor) =>
                  store.update({ rampEndColor: rampEndColor ?? "#fdae61" })
                }
              />
            </Lot>
          </>
        )}

        {store.mode === "classification" && (
          <>
            <Lot
              label={msgClassificationColors}
              help={msgClassificationColorsHelp}
            >
              <Input.TextArea
                value={store.classificationColors}
                onChange={(e) =>
                  store.update({ classificationColors: e.target.value })
                }
                rows={6}
                placeholder={"2=#8c510a\n5=#4daf4a\n6=#bdbdbd"}
              />
            </Lot>
          </>
        )}

        {showIntensityModulation && (
          <Lot label={msgIntensityModulation} help={msgIntensityModulationHelp}>
            <CheckboxValue
              value={store.intensityModulation}
              onChange={(intensityModulation) =>
                store.update({ intensityModulation })
              }
            />
          </Lot>
        )}
      </Area>
    );
  }
);

EditorWidget.displayName = "EditorWidget";
EditorWidget.title = gettext("Point cloud style");
EditorWidget.activateOn = { create: true };
EditorWidget.order = -40;
