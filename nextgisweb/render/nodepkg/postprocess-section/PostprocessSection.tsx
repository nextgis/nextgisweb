import type { ReactNode } from "react";

import {
  Button,
  Col,
  ColorPicker,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { DEFAULT_POSTPROCESS_VALUE, withPostprocessDefaults } from "./value";
import type { SharedPostprocessValue } from "./value";
import "./PostprocessSection.less";

const msgBasic = gettext("Basic");
const msgArtistic = gettext("Artistic");
const msgPreset = gettext("Preset");
const msgBrightness = gettext("Brightness");
const msgContrast = gettext("Contrast");
const msgGamma = gettext("Gamma");
const msgSaturation = gettext("Saturation");
const msgSharpen = gettext("Sharpen");
const msgBlurRadius = gettext("Blur radius");
const msgGrayscale = gettext("Grayscale");
const msgInvert = gettext("Invert colors");
const msgEnable = gettext("Enable");
const msgDisable = gettext("Disable");
const msgTintColor = gettext("Tint color");
const msgTintStrength = gettext("Tint strength");
const msgClear = gettext("Clear");
const msgPaperTexture = gettext("Paper texture");
const msgWetWash = gettext("Wet wash");
const msgRoughEdges = gettext("Rough edges");
const msgPigmentOverlay = gettext("Pigment overlay");
const msgPencilSketch = gettext("Pencil sketch");
const msgWetEdge = gettext("Wet edge");
const msgGrain = gettext("Grain");
const msgPastelSoftness = gettext("Pastel softness");
const msgHatching = gettext("Hatching");
const msgSeed = gettext("Seed");

const presetOptions = [
  { value: "watercolor", label: gettext("Watercolor") },
  { value: "ink_sketch", label: gettext("Ink sketch") },
  { value: "blueprint", label: gettext("Blueprint") },
  { value: "vintage_map", label: gettext("Vintage map") },
];
const toggleOptions = [
  { value: true, label: msgEnable },
  { value: false, label: msgDisable },
];
const numberStyle = { width: "100%" };
const SECTION_GUTTER: [number, number] = [10, 5];
const CONTROL_COL_PROPS = { xs: 24, sm: 12, md: 8, xl: 6 } as const;

const { Title } = Typography;

function toOpaqueHex(value: string) {
  return value.slice(0, 7).toUpperCase();
}

interface PostprocessSectionProps {
  value: SharedPostprocessValue | null;
  onChange: (
    key: keyof SharedPostprocessValue,
    value: SharedPostprocessValue[keyof SharedPostprocessValue]
  ) => void;
}

function onNumberChange(
  onChange: PostprocessSectionProps["onChange"],
  key: keyof SharedPostprocessValue
) {
  return (next: number | null) => {
    const fallback = DEFAULT_POSTPROCESS_VALUE[key];
    const value = (next ?? fallback) as SharedPostprocessValue[typeof key];
    onChange(key, value);
  };
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="field-control">{children}</div>
    </div>
  );
}

export function PostprocessSection({
  value,
  onChange,
}: PostprocessSectionProps) {
  const resolvedValue = withPostprocessDefaults(value);

  return (
    <div className="ngw-render-postprocess-section">
      <div className="section">
        <Title level={4} className="title">
          {msgBasic}
        </Title>
        <Row gutter={SECTION_GUTTER} className="grid">
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgBrightness}>
              <InputNumber
                min={0}
                max={4}
                step={0.05}
                value={resolvedValue.brightness}
                onChange={onNumberChange(onChange, "brightness")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgContrast}>
              <InputNumber
                min={0}
                max={4}
                step={0.05}
                value={resolvedValue.contrast}
                onChange={onNumberChange(onChange, "contrast")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgGamma}>
              <InputNumber
                min={0.1}
                max={4}
                step={0.05}
                value={resolvedValue.gamma}
                onChange={onNumberChange(onChange, "gamma")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgSaturation}>
              <InputNumber
                min={0}
                max={4}
                step={0.05}
                value={resolvedValue.saturation}
                onChange={onNumberChange(onChange, "saturation")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgSharpen}>
              <InputNumber
                min={0}
                max={4}
                step={0.05}
                value={resolvedValue.sharpen}
                onChange={onNumberChange(onChange, "sharpen")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgBlurRadius}>
              <InputNumber
                min={0}
                max={16}
                step={0.1}
                value={resolvedValue.blur_radius}
                onChange={onNumberChange(onChange, "blur_radius")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgGrayscale}>
              <Select
                options={toggleOptions}
                value={resolvedValue.grayscale}
                onChange={(next: boolean) => onChange("grayscale", next)}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgInvert}>
              <Select
                options={toggleOptions}
                value={resolvedValue.invert}
                onChange={(next: boolean) => onChange("invert", next)}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgTintStrength}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.tint_strength}
                onChange={onNumberChange(onChange, "tint_strength")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgTintColor}>
              <Space.Compact className="compact">
                <ColorPicker
                  className="color-picker"
                  format="hex"
                  showText={(color) => toOpaqueHex(color.toHexString())}
                  value={resolvedValue.tint_color}
                  onChange={(color) =>
                    onChange("tint_color", toOpaqueHex(color.toHexString()))
                  }
                />
                <Button
                  onClick={() =>
                    onChange("tint_color", DEFAULT_POSTPROCESS_VALUE.tint_color)
                  }
                >
                  {msgClear}
                </Button>
              </Space.Compact>
            </Field>
          </Col>
        </Row>
      </div>
      <div className="section">
        <Title level={4} className="title">
          {msgArtistic}
        </Title>
        <Row gutter={SECTION_GUTTER} className="grid">
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgPreset}>
              <Select
                allowClear
                options={presetOptions}
                value={resolvedValue.preset ?? undefined}
                onChange={(next: SharedPostprocessValue["preset"]) =>
                  onChange("preset", next ?? null)
                }
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgPaperTexture}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.paper_texture}
                onChange={onNumberChange(onChange, "paper_texture")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgWetWash}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.wet_wash}
                onChange={onNumberChange(onChange, "wet_wash")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgRoughEdges}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.rough_edges}
                onChange={onNumberChange(onChange, "rough_edges")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgPigmentOverlay}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.pigment_overlay}
                onChange={onNumberChange(onChange, "pigment_overlay")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgPencilSketch}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.pencil_sketch}
                onChange={onNumberChange(onChange, "pencil_sketch")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgWetEdge}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.wet_edge}
                onChange={onNumberChange(onChange, "wet_edge")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgGrain}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.grain}
                onChange={onNumberChange(onChange, "grain")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgPastelSoftness}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.pastel_softness}
                onChange={onNumberChange(onChange, "pastel_softness")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgHatching}>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={resolvedValue.hatching}
                onChange={onNumberChange(onChange, "hatching")}
                style={numberStyle}
              />
            </Field>
          </Col>
          <Col {...CONTROL_COL_PROPS}>
            <Field label={msgSeed}>
              <InputNumber
                min={0}
                max={2147483647}
                precision={0}
                value={resolvedValue.seed}
                onChange={onNumberChange(onChange, "seed")}
                style={numberStyle}
              />
            </Field>
          </Col>
        </Row>
      </div>
    </div>
  );
}
