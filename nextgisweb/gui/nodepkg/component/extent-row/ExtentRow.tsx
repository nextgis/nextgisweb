import { observer } from "mobx-react-lite";
import { useCallback, useState, useTransition } from "react";
import type React from "react";

import { Button, InputNumber, Space } from "@nextgisweb/gui/antd";
import type { InputNumberProps } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResourcePicker } from "@nextgisweb/resource/component/resource-picker/hook";
import type { ResourcePickerStoreOptions } from "@nextgisweb/resource/component/resource-picker/type";

import { ExtentEditorModal } from "../extent-editor-modal";

import { unionExtents } from "./util";

import ClearIcon from "@nextgisweb/icon/material/close";
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
    extraButton?: React.ReactNode;
}

const labelAliases: Record<LabelType, Record<ExtentKeys, string>> = {
    box: {
        left: gettext("Left"),
        bottom: gettext("Bottom"),
        right: gettext("Right"),
        top: gettext("Top"),
    },
    geo: {
        left: gettext("West"),
        bottom: gettext("South"),
        right: gettext("East"),
        top: gettext("North"),
    },
};

const parts: ({ key: ExtentKeys } & InputNumberProps)[] = [
    { key: "left", min: -180, max: 180 },
    { key: "bottom", min: -90, max: 90 },
    { key: "right", min: -180, max: 180 },
    { key: "top", min: -90, max: 90 },
];

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
                                    }).catch(() => ({}) as ExtentRowValue)
                                )
                            );
                            const combined = unionExtents(extents);
                            onChange?.(combined);
                        } catch {
                            onChange?.({});
                        }
                    });
                },
            });
        }, [makeSignal, onChange, pickerOptions, showResourcePicker]);

        return (
            <div className="ngw-gui-extent-row">
                {!hideResourcePicker && (
                    <Space.Compact style={{ display: "flex" }}>
                        <Button
                            loading={loading}
                            icon={<LayersIconOutlined />}
                            onClick={onSetFromLayerClick}
                        >
                            {gettext("From layers")}
                        </Button>
                        {extraButton}
                    </Space.Compact>
                )}
                <Space.Compact style={{ display: "flex" }}>
                    {parts.map(({ key, min, max }) => (
                        <InputNumber
                            key={key}
                            value={value ? value[key] : undefined}
                            onChange={(val) => {
                                if (onChange) {
                                    onChange({ ...value, [key]: val });
                                }
                            }}
                            addonBefore={labelAliases[labelType][key]}
                            precision={4}
                            min={min}
                            max={max}
                            controls={false}
                        />
                    ))}
                </Space.Compact>
                <Space.Compact style={{ display: "flex" }}>
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
