import type Feature from "ol/Feature";
import { WKT } from "ol/format";
import type { Circle, Geometry } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import Draw, { createBox } from "ol/interaction/Draw";
import type { Options as DrawOptions } from "ol/interaction/Draw";
import type { DrawEvent } from "ol/interaction/Draw";
import { Vector as VectorLayer } from "ol/layer";
import type { Vector as OlVectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import type { Vector as OlVectorSource } from "ol/source";
import { Text } from "ol/style";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Dropdown, Space } from "@nextgisweb/gui/antd";
import type { MenuProps, SizeType } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { DojoDisplay } from "../type";
import type { MapStateControl } from "../type/MapState";

import CloseIcon from "@nextgisweb/icon/material/close/outline";
import CropFreeIcon from "@nextgisweb/icon/material/crop_free/outline";
import DrawIcon from "@nextgisweb/icon/material/draw/outline";
import PolyIcon from "@nextgisweb/icon/material/hexagon/outline";
import CircleIcon from "@nextgisweb/icon/material/radio_button_unchecked/outline";
import RectIcon from "@nextgisweb/icon/material/rectangle/outline";
import LineIcon from "@nextgisweb/icon/material/show_chart/outline";
import VisibilityIcon from "@nextgisweb/icon/material/visibility/outline";
import VisibilityOffIcon from "@nextgisweb/icon/material/visibility_off/outline";
import ZoomInIcon from "@nextgisweb/icon/material/zoom_in/outline";

export interface FilterExtentBtnProps {
    id: number;
    display: DojoDisplay;
    size?: SizeType;
    onGeomChange?: (geom?: Geometry, geomWKT?: string) => void;
}

type FilterExtentBtnMode = "default" | "draw" | "geometry";

const formatWKT = new WKT();

const defaultStyleFunction = new VectorLayer().getStyleFunction();
const circleStyleFunc = (feature: Feature, resolution: number) => {
    const geometry = feature.getGeometry();
    if (defaultStyleFunction) {
        const styles = defaultStyleFunction(feature, resolution);
        const style = (Array.isArray(styles) ? styles : [styles])[0];

        if (style) {
            const newStyle = style.clone();

            if (geometry && geometry.getType() === "Circle") {
                const radius = (geometry as Circle).getRadius();
                const radiusStr = radius.toLocaleString("ru-RU", {
                    maximumFractionDigits: 0,
                });
                const radiusText = gettext("Radius:");
                const unitText = gettext("m");
                const text = `${radiusText}\n${radiusStr} ${unitText}`;
                newStyle.setText(
                    new Text({
                        textAlign: "left",
                        textBaseline: "middle",
                        text,
                    })
                );
            } else {
                newStyle.setText(new Text());
            }

            return newStyle;
        }
    }
};

const geomTypesInfo = [
    {
        label: gettext("Circle"),
        key: "circle",
        geomType: "Circle",
        styleFunc: circleStyleFunc,
        icon: <CircleIcon />,
    },
    {
        label: gettext("Line"),
        key: "line",
        geomType: "LineString",
        icon: <LineIcon />,
    },
    {
        label: gettext("Rectangle"),
        key: "rect",
        geomType: "Circle",
        geomFunc: createBox(),
        icon: <RectIcon />,
    },
    {
        label: gettext("Polygon"),
        key: "poly",
        geomType: "Polygon",
        icon: <PolyIcon />,
    },
];

const geomTypesMap = new Map();
geomTypesInfo.forEach((i) => {
    geomTypesMap.set(i.key, i);
});

const geomTypesOptions = geomTypesInfo.map(({ icon, key, label }) => {
    return { icon, key, label };
});

const geomActionOptions = (visible: boolean) => [
    {
        label: visible ? gettext("Hide") : gettext("Show"),
        key: "visible",
        icon: visible ? <VisibilityOffIcon /> : <VisibilityIcon />,
    },
    {
        label: gettext("Zoom to filtering geometry"),
        key: "zoom",
        icon: <ZoomInIcon />,
    },
    {
        label: gettext("Clear filtering geometry"),
        key: "clear",
        icon: <CloseIcon />,
    },
];

const msgZoomToFiltered = gettext("Draw filtering geometry");
const msgChangeGeom = gettext("Change filtering geometry");
const msgStopDrawing = gettext("Stop drawing...");

interface InteractionInfo {
    interaction?: Draw;
    layer: OlVectorLayer<OlVectorSource>;
    source: OlVectorSource;
    mapStateKey?: string;
    control: MapStateControl;
}

const buildInteraction = (
    display: DojoDisplay,
    layerId: number,
    geomType: string,
    onDrawEnd?: (event: DrawEvent) => void,
    onTerminate?: () => void
): InteractionInfo | undefined => {
    if (!display || !geomType) return;

    const geomTypeInfo = geomTypesMap.get(geomType);
    if (!geomTypeInfo) return;

    const source = new VectorSource();

    const vectorLayer = new VectorLayer({
        source,
    });

    if (geomTypeInfo.styleFunc) {
        vectorLayer.setStyle(geomTypeInfo.styleFunc);
    }

    const olMap = display.map.olMap;
    olMap.addLayer(vectorLayer);
    vectorLayer.setZIndex(1000);

    const drawOptions: DrawOptions = {
        source,
        type: geomTypeInfo.geomType,
        stopClick: true,
    };
    if (geomTypeInfo.geomFunc) {
        drawOptions.geometryFunction = geomTypeInfo.geomFunc;
    }
    if (geomTypeInfo.styleFunc) {
        drawOptions.style = geomTypeInfo.styleFunc;
    }

    const drawInteraction = new Draw(drawOptions);
    olMap.addInteraction(drawInteraction);
    drawInteraction.on("drawend", (e) => {
        if (onDrawEnd) {
            onDrawEnd(e);
        }
    });

    const mapStateKey = `filterExtent-${layerId}`;
    const control: MapStateControl = {
        activate: () => {},
        deactivate: () => {
            if (onTerminate) onTerminate();
        },
    };
    display.mapStates.addState(mapStateKey, control, true);

    const interactionInfo: InteractionInfo = {
        interaction: drawInteraction,
        layer: vectorLayer,
        source,
        mapStateKey,
        control,
    };

    return interactionInfo;
};

const clearDrawInteraction = (
    display: DojoDisplay,
    interactionInfo: InteractionInfo
): InteractionInfo | undefined => {
    if (!display || !interactionInfo) return;

    if (interactionInfo.interaction) {
        const olMap = display.map.olMap;
        olMap.removeInteraction(interactionInfo.interaction);
    }

    const { mapStates } = display;
    const { mapStateKey } = interactionInfo;
    if (mapStateKey) {
        if (mapStates.getActiveState() === mapStateKey) {
            display.mapStates.deactivateState(mapStateKey);
        }
        display.mapStates.removeState(mapStateKey);
    }

    const newInteractionInfo: InteractionInfo = {
        ...interactionInfo,
        ...{
            interaction: undefined,
            mapStateKey: undefined,
        },
    };
    return newInteractionInfo;
};

export const FilterExtentBtn = ({
    id,
    display,
    size = "middle",
    onGeomChange,
}: FilterExtentBtnProps) => {
    const interactionInfo = useRef<InteractionInfo>();
    const [geomType, setGeomType] = useState<string>();
    const [visibleGeom, setVisibleGeom] = useState<boolean>(true);
    const [drawEnd, setDrawEnd] = useState<DrawEvent>();

    const mode = useMemo<FilterExtentBtnMode>(() => {
        if (drawEnd) {
            return "geometry";
        }
        return geomType ? "draw" : "default";
    }, [drawEnd, geomType]);

    const clearInteraction = useCallback(() => {
        const info = interactionInfo.current;
        interactionInfo.current = undefined;
        if (!display || !info) return;

        const olMap = display.map.olMap;
        clearDrawInteraction(display, info);
        olMap.removeLayer(info.layer);
    }, [display]);

    const clearGeometry = useCallback(() => {
        if (!interactionInfo.current) return;
        clearInteraction();
        setDrawEnd(undefined);
        setGeomType(undefined);
        if (onGeomChange) {
            onGeomChange(undefined, undefined);
        }
    }, [clearInteraction, onGeomChange]);

    useEffect(() => {
        return () => {
            clearInteraction();
        };
    }, [clearInteraction]);

    const prevGeometryWKT = useRef<string>();
    useEffect(() => {
        if (!drawEnd) return;

        const { feature } = drawEnd;
        let geometry = feature.getGeometry();
        if (geometry) {
            if (geometry.getType() === "Circle") {
                geometry = fromCircle(geometry as Circle);
            }
            const geometryWKT = formatWKT.writeGeometry(geometry);
            if (onGeomChange && prevGeometryWKT.current !== geometryWKT) {
                prevGeometryWKT.current = geometryWKT;
                onGeomChange(geometry, geometryWKT);
            }
        }
        if (interactionInfo.current) {
            interactionInfo.current = clearDrawInteraction(
                display,
                interactionInfo.current
            );
        }
    }, [display, drawEnd, onGeomChange]);

    const geomTypesMenuItems: MenuProps = {
        items: geomTypesOptions,
        onClick: (item) => {
            setGeomType(item.key);
            const info = buildInteraction(display, id, item.key, setDrawEnd);
            interactionInfo.current = info;
        },
    };

    const buildDropdown = () => (
        <Dropdown menu={geomTypesMenuItems}>
            <Button title={msgZoomToFiltered} size={size}>
                <Space>
                    <CropFreeIcon />
                </Space>
            </Button>
        </Dropdown>
    );

    const changeVisibleGeom = (v: boolean) => {
        const layer = interactionInfo.current?.layer;
        if (layer) {
            layer.setVisible(v);
            setVisibleGeom(v);
        }
    };

    const zoomToGeom = useCallback(() => {
        const source = interactionInfo.current?.source;
        if (source) {
            const map = display.map.olMap;
            map.getView().fit(source.getExtent());
        }
    }, [display]);

    const handleGeomAction = useCallback(
        (key: string) => {
            switch (key) {
                case "visible":
                    changeVisibleGeom(!visibleGeom);
                    break;
                case "zoom":
                    zoomToGeom();
                    break;
                case "clear":
                    clearGeometry();
                    break;
            }
        },
        [clearGeometry, visibleGeom, zoomToGeom]
    );

    const geomActionProps = useCallback(
        (visible: boolean): MenuProps => ({
            items: geomActionOptions(visible),
            onClick: (item) => {
                handleGeomAction(item.key);
            },
        }),
        [handleGeomAction]
    );

    const buildGeomSection = useCallback(() => {
        if (!geomType) return undefined;
        const geomInfo = geomTypesMap.get(geomType);
        const menuItems = geomActionProps(visibleGeom);

        return (
            <Dropdown menu={menuItems}>
                <Button title={msgChangeGeom} size={size}>
                    <Space>{geomInfo.icon}</Space>
                </Button>
            </Dropdown>
        );
    }, [geomType, geomActionProps, visibleGeom, size]);

    const buildDrawSection = () => {
        return (
            <Button
                type="primary"
                title={msgStopDrawing}
                size={size}
                danger
                onClick={clearGeometry}
            >
                <Space>
                    <DrawIcon />
                </Space>
            </Button>
        );
    };

    let result;
    if (mode === "default") {
        result = buildDropdown();
    } else if (mode === "draw") {
        result = buildDrawSection();
    } else if (mode === "geometry") {
        result = buildGeomSection();
    }

    return <>{result}</>;
};
