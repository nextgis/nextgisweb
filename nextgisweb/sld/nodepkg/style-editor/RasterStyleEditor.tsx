import { useCallback, useLayoutEffect, useState } from "react";

import { Form, InputNumber, Select } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceItem } from "@nextgisweb/resource/type";

import type { RasterSymbolizer, Symbolizer } from "./type/Style";
import { getRasterBandRange } from "./util/getRasterBandRange";
import { getRasterSymbolizerValues } from "./util/getRasterSymbolizerValues";

import "./RasterStyleEditor.less";

interface RasterStyleEditorProps {
    initSymbolizer?: RasterSymbolizer;
    onChange?: (val: Symbolizer) => void;
    resourceId?: number;
}

export interface SymbolizerValues {
    redChannelMin: number;
    redChannelMax: number;
    greenChannelMin: number;
    greenChannelMax: number;
    blueChannelMin: number;
    blueChannelMax: number;
    redChannel: number;
    greenChannel: number;
    blueChannel: number;
}

interface BandOptions {
    label: string;
    value: number;
}

export interface BandRange {
    min: number;
    max: number;
}

export function RasterStyleEditor({
    initSymbolizer,
    onChange: onSymbolizerChange,
    resourceId,
}: RasterStyleEditorProps) {
    const [form] = Form.useForm();

    const [bands, setBands] = useState<BandOptions[]>([]);
    const [bandRange, setBandRange] = useState<BandRange>(null);
    const [initialValues, setInitialValues] = useState<SymbolizerValues>(null);
    useLayoutEffect(() => {
        async function getBands() {
            const rasterRes = await route("resource.item", {
                id: resourceId,
            }).get<ResourceItem>({
                cache: true,
            });
            if (rasterRes.raster_layer) {
                const bands_ = rasterRes.raster_layer.color_interpretation;
                setBands(
                    bands_.map((value, index) => ({
                        key: index,
                        value: index,
                        label:
                            gettext("Band {}").replace("{}", `${index + 1}`) +
                            (value ? ` (${value})` : ""),
                    }))
                );
                const dtype = rasterRes.raster_layer.dtype;
                const bandRange_ = getRasterBandRange(dtype);
                setBandRange(bandRange_);
                setInitialValues(
                    getRasterSymbolizerValues(initSymbolizer, bandRange_)
                );
            }
        }
        getBands();
    }, [initSymbolizer]);

    const onChange = useCallback(
        (valueChange, allValues) => {
            const symbolizer = {
                type: "raster",
                channels: {
                    red: {
                        source_channel: allValues.redChannel
                            ? allValues.redChannel + 1
                            : 1,
                        contrast_enhancement: {
                            normalize: {
                                algorithm: "stretch",
                                min_value: allValues.redChannelMin,
                                max_value: allValues.redChannelMax,
                            },
                        },
                    },
                    green: {
                        source_channel: allValues.greenChannel
                            ? allValues.greenChannel + 1
                            : 1,
                        contrast_enhancement: {
                            normalize: {
                                algorithm: "stretch",
                                min_value: allValues.greenChannelMin,
                                max_value: allValues.greenChannelMax,
                            },
                        },
                    },
                    blue: {
                        source_channel: allValues.blueChannel
                            ? allValues.blueChannel + 1
                            : 1,
                        contrast_enhancement: {
                            normalize: {
                                algorithm: "stretch",
                                min_value: allValues.blueChannelMin,
                                max_value: allValues.blueChannelMax,
                            },
                        },
                    },
                },
            } as Symbolizer;
            onSymbolizerChange(symbolizer);
        },
        [onSymbolizerChange]
    );
    if (!(initialValues && bandRange)) {
        return null;
    } else {
        return (
            <Form
                form={form}
                initialValues={initialValues}
                onValuesChange={onChange}
                className="ngw-qgis-raster-editor-widget-sld"
            >
                <label>{gettext("Red channel")}</label>
                <Form.Item noStyle name="redChannel">
                    <Select options={bands} />
                </Form.Item>
                <label className="min">{gettext("Min")}</label>
                <Form.Item noStyle name="redChannelMin">
                    <InputNumber {...bandRange} />
                </Form.Item>
                <label className="max">{gettext("Max")}</label>
                <Form.Item noStyle name="redChannelMax">
                    <InputNumber {...bandRange} />
                </Form.Item>

                <label>{gettext("Green channel")}</label>
                <Form.Item noStyle name="greenChannel">
                    <Select options={bands} />
                </Form.Item>
                <label className="min">{gettext("Min")}</label>
                <Form.Item noStyle name="greenChannelMin">
                    <InputNumber {...bandRange} />
                </Form.Item>
                <label className="max">{gettext("Max")}</label>
                <Form.Item noStyle name="greenChannelMax">
                    <InputNumber {...bandRange} />
                </Form.Item>

                <label>{gettext("Blue channel")}</label>
                <Form.Item noStyle name="blueChannel">
                    <Select options={bands} />
                </Form.Item>
                <label className="min">{gettext("Min")}</label>
                <Form.Item noStyle name="blueChannelMin">
                    <InputNumber {...bandRange} />
                </Form.Item>
                <label className="max">{gettext("Max")}</label>
                <Form.Item noStyle name="blueChannelMax">
                    <InputNumber {...bandRange} />
                </Form.Item>
            </Form>
        );
    }
}
