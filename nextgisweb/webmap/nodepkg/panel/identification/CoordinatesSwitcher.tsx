import type { Coordinate } from "ol/coordinate";
import WKT from "ol/format/WKT";
import OlGeomPoint from "ol/geom/Point";
import { useEffect, useState } from "react";

import { Button, Select, Tooltip } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

import { DDtoDM, DDtoDMS } from "./format";
import type { IdentifyInfo, IdentifyResultProps } from "./identification";

import { UpOutlined } from "@ant-design/icons";
import PinIcon from "@nextgisweb/icon/material/pin_drop";

import "./CoordinatesSwitcher.less";

const localStorageKey = "ng.coordinates.srs";
const defaultSrs = 4326;
const degreeFormatSetting = webmapSettings.degree_format;
const wkt = new WKT();

const formatGeographicCoords = (coordinates: Coordinate) => {
    const [x, y] = coordinates;
    let fx, fy;
    if (degreeFormatSetting === "dd") {
        fx = x.toFixed(6);
        fy = y.toFixed(6);
    } else if (degreeFormatSetting === "ddm") {
        fx = DDtoDM(x, {
            lon: true,
            needString: true,
        });
        fy = DDtoDM(y, {
            lon: false,
            needString: true,
        });
    } else if (degreeFormatSetting === "dms") {
        fx = DDtoDMS(x, {
            lon: true,
            needString: true,
        });
        fy = DDtoDMS(y, {
            lon: false,
            needString: true,
        });
    }
    return `${fx}, ${fy}`;
};

const formatNotGeographicCoords = (coordinates: Coordinate) => {
    const [x, y] = coordinates;
    return `${Math.round(x)}, ${Math.round(y)}`;
};

type SrsInfoMap = Map<number, SRSRead>;
type TransfCoords = Map<number, Coordinate>;

interface CoordinateOption extends OptionType {
    fmtCoordinates: string;
}

const transformCoordinates = async (
    identifyInfo: IdentifyInfo,
    srsMap: SrsInfoMap
): Promise<TransfCoords> => {
    const transformed = await route(
        "spatial_ref_sys.geom_transform.batch"
    ).post({
        json: {
            srs_from: 3857,
            srs_to: Array.from(srsMap.keys()),
            geom: wkt.writeGeometry(new OlGeomPoint(identifyInfo.point)),
        },
    });
    const transfCoords: TransfCoords = new Map<number, Coordinate>();
    transformed.forEach((t) => {
        const wktPoint: OlGeomPoint = wkt.readGeometry(t.geom) as OlGeomPoint;
        const coordinates = wktPoint.getCoordinates();
        transfCoords.set(parseInt(t.srs_id, 10), coordinates);
    });
    return transfCoords;
};

const getDefaultSrs = (transfCoords: TransfCoords): number => {
    let defaultSrsId: number | undefined = undefined;
    const storageSrsId = localStorage.getItem(localStorageKey);
    if (storageSrsId) {
        const num = parseInt(storageSrsId, 10);
        const isNumber = !isNaN(num) && num.toString() === storageSrsId;
        if (isNumber && transfCoords.has(num)) {
            defaultSrsId = num;
        }
    }
    if (!defaultSrsId) {
        localStorage.setItem(localStorageKey, defaultSrs.toString());
        defaultSrsId = defaultSrs;
    }

    return defaultSrsId;
};

export const CoordinatesSwitcher = ({
    display,
    identifyInfo,
}: IdentifyResultProps) => {
    const [transfCoords, setTransfCoords] = useState<TransfCoords>();
    const [options, setOptions] = useState<CoordinateOption[]>();
    const [srsMap, setSrsMap] = useState<SrsInfoMap>();
    const [selectedSrsId, setSelectedSrsId] = useState<number>();

    const zoomTo = () => {
        const point = new OlGeomPoint(identifyInfo.point);
        display.map.zoomToExtent(point.getExtent());
    };

    useEffect(() => {
        const loadSrs = async () => {
            const srsInfo = await route("spatial_ref_sys.collection").get();
            setSrsMap(new Map(srsInfo.map((s) => [s.id, s])));
        };
        loadSrs();
    }, []);

    useEffect(() => {
        const _transformCoordinates = async (srsMap?: SrsInfoMap) => {
            if (!srsMap) return;
            const newSrsMap = await transformCoordinates(identifyInfo, srsMap);
            setTransfCoords(newSrsMap);
        };

        if (!identifyInfo || !identifyInfo.point) {
            setTransfCoords(undefined);
        }

        _transformCoordinates(srsMap);
    }, [identifyInfo, srsMap]);

    useEffect(() => {
        if (!transfCoords || !srsMap) return;

        const newOptions: CoordinateOption[] = [];

        transfCoords.forEach((coordinates, srsId) => {
            const srsInfo = srsMap.get(srsId);
            if (!srsInfo) return;

            const fmtCoordinates = srsInfo.geographic
                ? formatGeographicCoords(coordinates)
                : formatNotGeographicCoords(coordinates);
            const label = `${fmtCoordinates} ${srsInfo.display_name}`;

            const option: CoordinateOption = {
                value: srsId,
                label,
                title: srsInfo.display_name,
                fmtCoordinates,
            };
            newOptions.push(option);
        });

        setOptions(newOptions);
        setSelectedSrsId(getDefaultSrs(transfCoords));
    }, [transfCoords]);

    const changeCoordinate = (value: number) => {
        localStorage.setItem(localStorageKey, value.toString());
        setSelectedSrsId(value);
    };

    const getFmtCoordinates = () => {
        if (!options) return "";

        const selectedOption = options.find(
            (option) => option.value === selectedSrsId
        );
        return selectedOption ? selectedOption.fmtCoordinates : "";
    };

    return (
        <div className="coordinates-switcher">
            <Tooltip title={gettext("Zoom to identification point")}>
                <Button
                    type="text"
                    size="small"
                    onClick={zoomTo}
                    icon={<PinIcon />}
                />
            </Tooltip>
            <Select
                variant="borderless"
                options={options}
                value={selectedSrsId}
                onChange={changeCoordinate}
                popupMatchSelectWidth={false}
                suffixIcon={<UpOutlined style={{ pointerEvents: "none" }} />}
            />
            <Tooltip title={gettext("Copy identification point coordinates")}>
                <CopyToClipboardButton
                    type="text"
                    size="small"
                    getTextToCopy={getFmtCoordinates}
                    iconOnly
                />
            </Tooltip>
        </div>
    );
};
