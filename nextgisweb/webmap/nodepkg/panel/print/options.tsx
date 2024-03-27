import { gettext } from "@nextgisweb/pyramid/i18n";

import type { PrintMapSettings } from "../../print-map/PrintMap";

import {
    FileImageOutlined,
    FileJpgOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";

const msgPortrait = gettext("Portrait");
const msgLandscape = gettext("Landscape");

interface PageFormat {
    label: string;
    value: string;
}
export interface Scale {
    label: string;
    value: number;
}

export const pageFormats: PageFormat[] = [];

function addPageFormat(label: string, width: number, height: number) {
    pageFormats.push({
        value: `${width}_${height}`,
        label: `${label} - ${msgPortrait}`,
    });
    pageFormats.push({
        value: `${height}_${width}`,
        label: `${label} - ${msgLandscape}`,
    });
}

addPageFormat("A4", 210, 297);
addPageFormat("A3", 297, 420);
pageFormats.push({ value: "custom", label: gettext("Custom size") });

const scalesValues = [
    5000, 10000, 20000, 25000, 50000, 100000, 200000, 500000, 1000000, 2000000,
    5000000, 10000000,
];

const numberFormat = new Intl.NumberFormat("ru-RU");

export const scaleToLabel = (scale: number) => {
    return `1 : ${numberFormat.format(scale)}`;
};

export const scalesList: Scale[] = [];
scalesValues.forEach((value) => {
    const label = scaleToLabel(value);
    scalesList.push({
        value,
        label,
    });
});

export const exportFormats = [
    { label: gettext("JPEG"), key: "jpeg", icon: <FileJpgOutlined /> },
    { label: gettext("PNG"), key: "png", icon: <FileImageOutlined /> },
    { label: gettext("TIFF"), key: "tiff", icon: <FileImageOutlined /> },
    { label: gettext("PDF"), key: "pdf", icon: <FilePdfOutlined /> },
];

const parseNumber = (v: string) => {
    const parsed = parseInt(v, 10);
    return isNaN(parsed) ? undefined : parsed;
};

type SettingKey = keyof PrintMapSettings;

interface PrintParam<T> {
    fromParam: (val: string) => T | undefined;
    setting: SettingKey;
    toParam?: (val: T) => string | undefined;
}

type StringKeyOf<T> = Extract<keyof T, string>;

export type UrlPrintParams<T> = {
    [K in StringKeyOf<T> as `print_${K}`]: PrintParam<T[K]>;
};

export const urlPrintParams: UrlPrintParams<PrintMapSettings> = {
    print_height: {
        fromParam: parseNumber,
        setting: "height",
    },
    print_width: { fromParam: parseNumber, setting: "width" },
    print_margin: { fromParam: parseNumber, setting: "margin" },
    print_scale: { fromParam: parseNumber, setting: "scale" },
    print_scaleLine: { fromParam: (v) => v === "true", setting: "scaleLine" },
    print_scaleValue: { fromParam: (v) => v === "true", setting: "scaleValue" },
    print_center: {
        fromParam: (centerParam) => {
            if (!centerParam) return null;
            const coordStr = decodeURIComponent(centerParam).split(",");
            return coordStr.map((i) => parseFloat(i));
        },
        toParam: (center) => {
            if (!center) {
                return;
            }
            return center.map((i) => i.toFixed(4)).join(",");
        },
        setting: "center",
    },
};
