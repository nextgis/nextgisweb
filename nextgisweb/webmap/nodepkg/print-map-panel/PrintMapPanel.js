import { useState, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import { PropTypes } from "prop-types";
import {
    Switch,
    Select,
    InputNumber,
    Button,
    Dropdown,
    Space,
} from "@nextgisweb/gui/antd";
import { DownOutlined } from "@ant-design/icons";

import { FloatingLabel } from "@nextgisweb/gui/floating-label";
import i18n from "@nextgisweb/pyramid/i18n";

import { pageFormats, scalesList, exportFormats } from "./options.js";

import "./PrintMapPanel.less";

export const PrintMapPanel = ({ display, onAction, scaleMap }) => {
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
        onChangeMapSize();
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

    const exportFormatsProps = {
        items: exportFormats,
        onClick: (item) => {
            onAction("export", item.key);
        },
    };

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

    return (
        <div className="print-map-panel">
            <h5 className="heading">{i18n.gettext("Page")}</h5>

            <FloatingLabel
                label={i18n.gettext("Paper format")}
                value={paperFormat}
            >
                <Select
                    style={{ width: "100%" }}
                    onChange={(v) => changePaperFormat(v)}
                    value={paperFormat}
                    options={pageFormats}
                ></Select>
            </FloatingLabel>

            <FloatingLabel label={i18n.gettext("Height, mm")} value={height}>
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

            <FloatingLabel label={i18n.gettext("Width, mm")} value={width}>
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

            <FloatingLabel label={i18n.gettext("Margin, mm")} value={margin}>
                <InputNumber
                    style={{ width: "100%" }}
                    onChange={(v) => onChangeSizes(v, "margin")}
                    value={margin}
                    min={0}
                    max={20000}
                    step={1}
                ></InputNumber>
            </FloatingLabel>

            <h5 className="heading">{i18n.gettext("Scale")}</h5>

            <div className="input-group">
                <Switch
                    checked={isDisplayScale}
                    onChange={(v) => changeScaleControls(v, "value")}
                />
                <span className="checkbox__label">
                    {i18n.gettext("Scale value")}
                </span>
            </div>

            <div className="input-group">
                <Switch
                    checked={isScaleBar}
                    onChange={(v) => changeScaleControls(v, "line")}
                />
                <span className="checkbox__label">
                    {i18n.gettext("Scale bar")}
                </span>
            </div>

            <FloatingLabel label={i18n.gettext("Scale")} value={scale}>
                <Select
                    style={{ width: "100%" }}
                    onChange={(value) => changeScale(value)}
                    value={scale}
                    options={scales}
                ></Select>
            </FloatingLabel>

            <div className="actions">
                <Button
                    type="primary"
                    onClick={() => {
                        window.print();
                    }}
                >
                    {i18n.gettext("Print")}
                </Button>

                <Dropdown menu={exportFormatsProps}>
                    <Button>
                        <Space>
                            {i18n.gettext("Save as")}
                            <DownOutlined />
                        </Space>
                    </Button>
                </Dropdown>
            </div>
        </div>
    );
};

PrintMapPanel.propTypes = {
    display: PropTypes.object,
    onAction: PropTypes.func,
    scaleMap: PropTypes.number,
};
