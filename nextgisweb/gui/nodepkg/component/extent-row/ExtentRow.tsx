import { observer } from "mobx-react-lite";
import { useCallback, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { Button, Flex, InputNumber, Space } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext, pgettext } from "@nextgisweb/pyramid/i18n";
import { useResourcePicker } from "@nextgisweb/resource/component/resource-picker/hook";
import type { ResourcePickerStoreOptions } from "@nextgisweb/resource/component/resource-picker/type";

import { useContainerWidth } from "../../hook/useContainerWidth";
import { ExtentEditorModal } from "../extent-editor-modal";

import { unionExtents } from "./util";

import ClearIcon from "@nextgisweb/icon/material/close";
import EditIcon from "@nextgisweb/icon/material/edit";
import LayersIconOutlined from "@nextgisweb/icon/material/layers";
import MapIcon from "@nextgisweb/icon/material/map";

import "./ExtentRow.less";

export async function getExtentFromLayer({
  resourceId,
  signal,
}: {
  resourceId: number;
  signal?: AbortSignal;
}) {
  const { extent } = await route("layer.extent", resourceId).get({
    cache: true,
    signal,
  });
  if (!extent) return;

  const result = {
    left: extent.minLon,
    right: extent.maxLon,
    bottom: extent.minLat,
    top: extent.maxLat,
  } as ExtentRowValue;

  return result;
}
/**
 * geo - West South East North
 * box - Left Bottom Right Top
 */
type LabelType = "geo" | "box";
type ExtentKeys = "top" | "left" | "right" | "bottom";
export type ExtentRowValue = Partial<Record<ExtentKeys, number | null>>;

export interface ExtentRowProps {
  value?: ExtentRowValue;
  onChange?: (val: ExtentRowValue) => void;
  hideResourcePicker?: boolean;
  pickerOptions?: ResourcePickerStoreOptions;
  labelType?: LabelType;
  extraButton?: ReactNode;
}

const labelAliases: Record<
  LabelType,
  Record<ExtentKeys, [full: string, short: string]>
> = {
  box: {
    left: [gettext("Left"), pgettext("extent_box", "L")],
    bottom: [gettext("Bottom"), pgettext("extent_box", "B")],
    right: [gettext("Right"), pgettext("extent_box", "R")],
    top: [gettext("Top"), pgettext("extent_box", "T")],
  },
  geo: {
    left: [gettext("West"), pgettext("extent_geo", "W")],
    bottom: [gettext("South"), pgettext("extent_geo", "S")],
    right: [gettext("East"), pgettext("extent_geo", "E")],
    top: [gettext("North"), pgettext("extent_geo", "N")],
  },
};

type ExtentPart = { key: ExtentKeys; min: number; max: number };

const pairs: [ExtentPart, ExtentPart][] = [
  [
    { key: "left", min: -180, max: 180 },
    { key: "bottom", min: -90, max: 90 },
  ],
  [
    { key: "right", min: -180, max: 180 },
    { key: "top", min: -90, max: 90 },
  ],
];

const fillWidth = { flex: 1, minWidth: 0 };

export const ExtentRow = observer(
  ({
    value,
    onChange,
    extraButton,
    pickerOptions,
    hideResourcePicker,
    labelType = "geo",
  }: ExtentRowProps) => {
    const [loading, startTransition] = useTransition();

    const [editOpen, setEditOpen] = useState(false);
    const [coordinatesOpen, setCoordinatesOpen] = useState(false);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const width = useContainerWidth(container);
    const compact = width <= 550;
    const shortLabels = !compact && width <= 720;
    const showCoordinatesText = width > 380;
    const showFromLayersText = width > 280;
    const fromLayersLabel = gettext("From layers");
    const coordinatesLabel = gettext("Coordinates");

    const { makeSignal } = useAbortController();

    const { showResourcePicker } = useResourcePicker();

    const onSetFromLayerClick = useCallback(() => {
      showResourcePicker({
        pickerOptions: {
          requireInterface: "IBboxLayer",
          multiple: true,
          ...pickerOptions,
        },
        onSelect: (resourceIds: number[]) => {
          startTransition(async () => {
            try {
              const signal = makeSignal();
              const extents = await Promise.all(
                resourceIds.map((id) =>
                  getExtentFromLayer({
                    resourceId: id,
                    signal,
                  }).catch(() => undefined)
                )
              );
              const valid = extents.filter((e) => e !== undefined);
              onChange?.(valid.length ? unionExtents(valid) : {});
            } catch {
              onChange?.({});
            }
          });
        },
      });
    }, [makeSignal, onChange, pickerOptions, showResourcePicker]);

    return (
      <div ref={setContainer} style={{ minWidth: 0 }}>
        <Flex wrap gap="small">
          {!hideResourcePicker && (
            <Space.Compact>
              <Button
                loading={loading}
                icon={<LayersIconOutlined />}
                aria-label={fromLayersLabel}
                title={showFromLayersText ? undefined : fromLayersLabel}
                onClick={onSetFromLayerClick}
              >
                {showFromLayersText && fromLayersLabel}
              </Button>
              {extraButton}
            </Space.Compact>
          )}
          {compact && (
            <Button
              icon={<EditIcon />}
              aria-label={coordinatesLabel}
              title={showCoordinatesText ? undefined : coordinatesLabel}
              onClick={() => setCoordinatesOpen((open) => !open)}
            >
              {showCoordinatesText && coordinatesLabel}
            </Button>
          )}
          {(!compact || coordinatesOpen) && (
            <Flex
              gap="small"
              vertical={compact}
              style={
                compact
                  ? { minWidth: 0, flexBasis: "100%", order: 1 }
                  : fillWidth
              }
            >
              {pairs.map(([first, second]) => (
                <Space.Compact key={first.key} style={fillWidth}>
                  {[first, second].map(({ key, min, max }) => (
                    <Space.Compact key={key} style={fillWidth}>
                      <Space.Addon
                        style={{ paddingInline: 6 }}
                        title={
                          shortLabels
                            ? labelAliases[labelType][key][0]
                            : undefined
                        }
                      >
                        {labelAliases[labelType][key][shortLabels ? 1 : 0]}
                      </Space.Addon>
                      <InputNumber
                        value={value ? value[key] : undefined}
                        onChange={(val) => {
                          if (onChange) {
                            onChange({ ...value, [key]: val });
                          }
                        }}
                        precision={4}
                        className="ngw-gui-extent-coordinate-input"
                        style={fillWidth}
                        min={min}
                        max={max}
                        controls={false}
                      />
                    </Space.Compact>
                  ))}
                </Space.Compact>
              ))}
            </Flex>
          )}
          <Space.Compact>
            <Button
              title={gettext("Edit on map")}
              icon={<MapIcon />}
              onClick={() => setEditOpen(true)}
            />
            <Button
              title={gettext("Clean")}
              loading={loading}
              icon={<ClearIcon />}
              onClick={() => {
                if (onChange) {
                  onChange({});
                }
              }}
            />
          </Space.Compact>
        </Flex>
        {editOpen && (
          <ExtentEditorModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            value={value}
            onChange={(ext) => {
              onChange?.(ext);
              setEditOpen(false);
            }}
          />
        )}
      </div>
    );
  }
);

ExtentRow.displayName = "ExtentRow";
