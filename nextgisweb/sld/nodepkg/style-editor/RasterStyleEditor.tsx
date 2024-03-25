import { useCallback, useEffect, useState } from "react";

import { Form, InputNumber, Select } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { RasterlayerResource } from "@nextgisweb/raster-layer/type/RasterlayerResource";

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
    const [bandRange, setBandRange] = useState<BandRange>();
    const [initialValues, setInitialValues] = useState<SymbolizerValues>();
    useEffect(() => {
        async function getBands() {
            if (resourceId === undefined) {
                return;
            }
            const rasterRes = await route("resource.item", {
                id: resourceId,
            }).get({
                cache: true,
            });
            if (rasterRes.raster_layer) {
                const bands_ = (rasterRes.raster_layer as RasterlayerResource)
                    .color_interpretation;
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
                    getRasterSymbolizerValues({
                        symbolizer: initSymbolizer,
                        bandRange: bandRange_,
                    })
                );
            }
        }
        getBands();
    }, [initSymbolizer, resourceId]);

    const onChange = useCallback(
        (_: unknown, values: SymbolizerValues) => {
            const symbolizer = {
                type: "raster",
                channels: {
                    red: {
                        source_channel: values.redChannel
                            ? values.redChannel + 1
                            : 1,
                        contrast_enhancement: {
                            normalize: {
                                algorithm: "stretch",
                                min_value: values.redChannelMin,
                                max_value: values.redChannelMax,
                            },
                        },
                    },
                    green: {
                        source_channel: values.greenChannel
                            ? values.greenChannel + 1
                            : 1,
                        contrast_enhancement: {
                            normalize: {
                                algorithm: "stretch",
                                min_value: values.greenChannelMin,
                                max_value: values.greenChannelMax,
                            },
                        },
                    },
                    blue: {
                        source_channel: values.blueChannel
                            ? values.blueChannel + 1
                            : 1,
                        contrast_enhancement: {
                            normalize: {
                                algorithm: "stretch",
                                min_value: values.blueChannelMin,
                                max_value: values.blueChannelMax,
                            },
                        },
                    },
                },
            } as Symbolizer;
            if (onSymbolizerChange) {
                onSymbolizerChange(symbolizer);
            }
        },
        [onSymbolizerChange]
    );

    if (!(initialValues && bandRange)) {
        return null;
    } else {
        return (
            <Form
                form={form}
                onValuesChange={onChange}
                initialValues={initialValues}
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
