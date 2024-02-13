import { gettext } from "@nextgisweb/pyramid/i18n";

import {
    FileImageOutlined,
    FileJpgOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";

const msgPortrait = gettext("Portrait");
const msgLandscape = gettext("Landscape");

export const pageFormats = [];

function addPageFormat(label, width, height) {
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

export const scaleToLabel = (scale) => {
    return `1 : ${numberFormat.format(scale)}`;
};

export const scalesList = [];
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

const parseNumber = (v) => {
    const parsed = parseInt(v, 10);
    return isNaN(parsed) ? undefined : parsed;
};

export const urlPrintParams = {
    print_height: { fromParam: (v) => parseNumber(v), setting: "height" },
    print_width: { fromParam: (v) => parseNumber(v), setting: "width" },
    print_margin: { fromParam: (v) => parseNumber(v), setting: "margin" },
    print_scale: { fromParam: (v) => parseNumber(v), setting: "scale" },
    print_scaleLine: { fromParam: (v) => v === "true", setting: "scaleLine" },
    print_scaleValue: { fromParam: (v) => v === "true", setting: "scaleValue" },
    print_center: {
        fromParam: (centerParam) => {
            if (!centerParam) return null;
            const coordStr = decodeURIComponent(centerParam).split(",");
            return coordStr.map((i) => parseFloat(i));
        },
        toParam: (center) => {
            return center.map((i) => i.toFixed(4)).join(",");
        },
        setting: "center",
    },
};
