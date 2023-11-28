import { WKT } from "ol/format";
import type { Circle, Geometry } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import Draw, { createBox } from "ol/interaction/Draw";
import type { DrawEvent } from "ol/interaction/Draw";
import { Vector as VectorLayer } from "ol/layer";
import type { Vector as OlVectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import type { Vector as OlVectorSource } from "ol/source";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Dropdown, Space } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { DojoDisplay, MapStateControl } from "../type";

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

interface FilterExtentBtnProps {
    id: number;
    display: DojoDisplay;
    size?: SizeType;
    onGeomChange?: (geom: Geometry, geomWKT: string) => void;
}

enum FilterExtentBtnMode {
    "default",
    "draw",
    "geometry",
}

const formatWKT = new WKT();

const geomTypesInfo = [
    {
        label: gettext("Circle"),
        key: "circle",
        geomType: "Circle",
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

const geomActionOptions = (visible) => [
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
    interaction: Draw;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layer: OlVectorLayer<any>;
    source: OlVectorSource;
    mapStateKey: string;
    control: MapStateControl;
}

const buildInteraction = (
    display: DojoDisplay,
    layerId: number,
    geomType: string,
    onDrawEnd: (event: DrawEvent) => void,
    onTerminate: () => void
): InteractionInfo => {
    if (!display || !geomType) return;

    const geomTypeInfo = geomTypesMap.get(geomType);
    if (!geomTypeInfo) return;

    const source = new VectorSource();
    const vectorLayer = new VectorLayer({
        source,
    });

    const olMap = display.map.olMap;
    olMap.addLayer(vectorLayer);
    vectorLayer.setZIndex(1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawOptions: any = {
        source,
        type: geomTypeInfo.geomType,
        stopClick: true,
    };
    if (geomTypeInfo.geomFunc) {
        drawOptions.geometryFunction = geomTypeInfo.geomFunc;
    }
    const drawInteraction = new Draw(drawOptions);
    olMap.addInteraction(drawInteraction);
    drawInteraction.on("drawend", (e) => {
        if (onDrawEnd) {
            setTimeout(() => {
                onDrawEnd(e);
            });
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
): InteractionInfo => {
    if (!display || !interactionInfo) return;

    const olMap = display.map.olMap;
    olMap.removeInteraction(interactionInfo.interaction);

    const { mapStates } = display;
    const { mapStateKey } = interactionInfo;
    if (mapStates.getActiveState() === mapStateKey) {
        display.mapStates.deactivateState(mapStateKey);
    }
    display.mapStates.removeState(mapStateKey);

    const newInteractionInfo = {
        ...interactionInfo,
        ...{
            interaction: undefined,
            mapStateKey: undefined,
        },
    };
    return newInteractionInfo;
};

const clearInteraction = (
    display: DojoDisplay,
    interactionInfo: InteractionInfo
): void => {
    if (!display || !interactionInfo) return;

    const olMap = display.map.olMap;
    clearDrawInteraction(display, interactionInfo);
    olMap.removeLayer(interactionInfo.layer);
};

const useIsMounted = () => {
    const isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);
    return () => isMounted.current;
};

export const FilterExtentBtn = ({
    id,
    display,
    size = "middle",
    onGeomChange,
}: FilterExtentBtnProps) => {
    const mounted = useIsMounted();
    const [mode, setMode] = useState<FilterExtentBtnMode>(
        FilterExtentBtnMode.default
    );
    const [geomType, setGeomType] = useState<string>(undefined);
    const [interactionInfo, setInteractionInfo] =
        useState<InteractionInfo>(undefined);
    const [visibleGeom, setVisibleGeom] = useState<boolean>(true);
    const [drawEnd, setDrawEnd] = useState<DrawEvent>(undefined);
    const [externalTerminate, setExternalTerminate] = useState<boolean>(false);

    const clearGeometry = () => {
        if (!interactionInfo) return;
        clearInteraction(display, interactionInfo);
        setInteractionInfo(undefined);
        setDrawEnd(undefined);
        setGeomType(undefined);
        setMode(FilterExtentBtnMode.default);
        onGeomChange(undefined, undefined);
    };

    useEffect(() => {
        return () => {
            if (!mounted()) {
                if (!interactionInfo) return;
                clearInteraction(display, interactionInfo);
            }
        };
    }, [mounted]);

    useEffect(() => {
        if (!drawEnd) return;

        const { feature } = drawEnd;
        let geometry = feature.getGeometry();
        if (geometry.getType() === "Circle") {
            geometry = fromCircle(geometry as Circle);
        }
        const geometryWKT = formatWKT.writeGeometry(geometry);
        onGeomChange(geometry, geometryWKT);
        const newInteractionInfo = clearDrawInteraction(
            display,
            interactionInfo
        );
        setInteractionInfo(newInteractionInfo);
        setMode(FilterExtentBtnMode.geometry);
        setDrawEnd(undefined);
    }, [drawEnd]);

    useEffect(() => {
        if (!interactionInfo || mode !== FilterExtentBtnMode.draw) {
            return;
        }
        setMode(FilterExtentBtnMode.default);
        setTimeout(() => {
            clearGeometry();
        });
    }, [externalTerminate]);

    const geomTypesMenuItems: MenuProps = {
        items: geomTypesOptions,
        onClick: (item) => {
            setGeomType(item.key);
            setMode(FilterExtentBtnMode.draw);
            const info = buildInteraction(
                display,
                id,
                item.key,
                (e) => setDrawEnd(e),
                () => setExternalTerminate(!externalTerminate)
            );
            setInteractionInfo(info);
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
        const { layer } = interactionInfo;
        layer.setVisible(v);
        setVisibleGeom(v);
    };

    const zoomToGeom = () => {
        const { source } = interactionInfo;
        const map = display.map.olMap;
        map.getView().fit(source.getExtent());
    };

    const handleGeomAction = (key: string) => {
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
    };

    const geomActionProps = (visible) => ({
        items: geomActionOptions(visible),
        onClick: (item) => {
            handleGeomAction(item.key);
        },
    });

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
    }, [size, geomType, visibleGeom]);

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
    if (mode === FilterExtentBtnMode.default) {
        result = buildDropdown();
    } else if (mode === FilterExtentBtnMode.draw) {
        result = buildDrawSection();
    } else if (mode === FilterExtentBtnMode.geometry) {
        result = buildGeomSection();
    }

    return <>{result}</>;
};
