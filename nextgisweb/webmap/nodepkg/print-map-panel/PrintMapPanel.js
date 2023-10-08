import debounce from "lodash-es/debounce";
import { useEffect, useState } from "react";

import {
    Button,
    Dropdown,
    InputNumber,
    Select,
    Space,
    Switch,
} from "@nextgisweb/gui/antd";

import { FloatingLabel } from "@nextgisweb/gui/floating-label";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { exportFormats, pageFormats, scalesList } from "./options";

import { DownOutlined } from "@ant-design/icons";

import "./PrintMapPanel.less";

export const PrintMapPanel = ({ display, onAction, getImage, scaleMap }) => {
    const [paperFormat, setPaperFormat] = useState("210_297");
    const [height, setHeight] = useState(297);
    const [width, setWidth] = useState(210);
    const [disableChangeSize, setDisableChangeSize] = useState(true);
    const [margin, setMargin] = useState(10);
    const [isDisplayScale, setIsDisplayScale] = useState(false);
    const [isScaleBar, setIsScaleBar] = useState(false);
    const [scale, setScale] = useState(undefined);
    const [scales, setScales] = useState(scalesList);

    const onChangeMapSize = (sizes) => {
        onAction("change-map-size", sizes || { width, height, margin });
    };

    useEffect(() => {
        display._mapExtentDeferred.then(() => {
            onChangeMapSize();
        });
    }, []);

    useEffect(() => {
        const scaleInList = scales.some((s) => s.value === scaleMap);
        if (scaleInList) {
            setScales(scalesList);
            setScale(scaleMap);
            return;
        }
        const customScale = {
            value: scaleMap,
            label: `1 : ${scaleMap}`,
            disabled: true,
        };
        const newScales = [customScale, ...scalesList];
        setScales(newScales);
        setScale(scaleMap);
    }, [scaleMap]);

    const changePaperFormat = (newPaperFormat) => {
        setPaperFormat(newPaperFormat);
        setDisableChangeSize(newPaperFormat !== "custom");
        if (newPaperFormat !== "custom") {
            const widthHeight = newPaperFormat.split("_");
            setWidth(widthHeight[0]);
            setHeight(widthHeight[1]);
            onChangeMapSize({
                width: widthHeight[0],
                height: widthHeight[1],
                margin,
            });
        }
    };

    const onChangeSizes = debounce((v, param) => {
        let sizes = { width, height, margin };
        if (param === "height") {
            setHeight(v);
            sizes.height = v;
        }
        if (param === "width") {
            setWidth(v);
            sizes.width = v;
        }
        if (param === "margin") {
            setMargin(v);
            sizes.margin = v;
        }
        onChangeMapSize(sizes);
    }, 500);

    const changeScale = (scale) => {
        onAction("change-scale", scale);
        setScale(scale);
    };

    const changeScaleControls = (value, type) => {
        if (type === "value") {
            setIsDisplayScale(value);
        }
        if (type === "line") {
            setIsScaleBar(value);
        }
        onAction("change-scale-controls", {
            value,
            type,
        });
    };

    const makePdf = () => {
        getImage().then((dataUrl) => {
            const body = {
                width: parseInt(width),
                height: parseInt(height),
                margin: parseInt(margin),
                map_image: dataUrl.substring("data:image/png;base64,".length),
            };

            route("webmap.print")
                .post({ json: body })
                .then((blob) => {
                    const file = window.URL.createObjectURL(blob);
                    let tab = window.open();
                    tab.location.href = file;
                });
        });
    };

    const exportFormatsProps = {
        items: exportFormats,
        onClick: (item) => {
            if (item.key === "pdf") {
                makePdf();
            } else {
                onAction("export", item.key);
            }
        },
    };

    return (
        <div className="print-map-panel">
            <h5 className="heading">{gettext("Page")}</h5>

            <FloatingLabel label={gettext("Paper format")} value={paperFormat}>
                <Select
                    style={{ width: "100%" }}
                    onChange={(v) => changePaperFormat(v)}
                    value={paperFormat}
                    options={pageFormats}
                ></Select>
            </FloatingLabel>

            <FloatingLabel label={gettext("Height, mm")} value={height}>
                <InputNumber
                    style={{ width: "100%" }}
                    onChange={(v) => onChangeSizes(v, "height")}
                    value={height}
                    min={0}
                    max={20000}
                    step={1}
                    disabled={disableChangeSize}
                ></InputNumber>
            </FloatingLabel>

            <FloatingLabel label={gettext("Width, mm")} value={width}>
                <InputNumber
                    style={{ width: "100%" }}
                    onChange={(v) => onChangeSizes(v, "width")}
                    value={width}
                    min={0}
                    max={20000}
                    step={1}
                    disabled={disableChangeSize}
                ></InputNumber>
            </FloatingLabel>

            <FloatingLabel label={gettext("Margin, mm")} value={margin}>
                <InputNumber
                    style={{ width: "100%" }}
                    onChange={(v) => onChangeSizes(v, "margin")}
                    value={margin}
                    min={0}
                    max={20000}
                    step={1}
                ></InputNumber>
            </FloatingLabel>

            <h5 className="heading">{gettext("Scale")}</h5>

            <div className="input-group">
                <Switch
                    checked={isDisplayScale}
                    onChange={(v) => changeScaleControls(v, "value")}
                />
                <span className="checkbox__label">
                    {gettext("Scale value")}
                </span>
            </div>

            <div className="input-group">
                <Switch
                    checked={isScaleBar}
                    onChange={(v) => changeScaleControls(v, "line")}
                />
                <span className="checkbox__label">{gettext("Scale bar")}</span>
            </div>

            <FloatingLabel label={gettext("Scale")} value={scale}>
                <Select
                    style={{ width: "100%" }}
                    onChange={(value) => changeScale(value)}
                    value={scale}
                    options={scales}
                ></Select>
            </FloatingLabel>

            <Space.Compact>
                <Button
                    type="primary"
                    onClick={() => {
                        window.print();
                    }}
                >
                    {gettext("Print")}
                </Button>
                <Dropdown menu={exportFormatsProps}>
                    <Button>
                        <Space>
                            {gettext("Save as")}
                            <DownOutlined />
                        </Space>
                    </Button>
                </Dropdown>
            </Space.Compact>
        </div>
    );
};
