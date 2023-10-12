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

export const scalesList = [
    { value: 5000, label: "1 : 5 000" },
    { value: 10000, label: "1 : 10 000" },
    { value: 20000, label: "1 : 20 000" },
    { value: 25000, label: "1 : 25 000" },
    { value: 50000, label: "1 : 50 000" },
    { value: 100000, label: "1 : 100 000" },
    { value: 200000, label: "1 : 200 000" },
    { value: 500000, label: "1 : 500 000" },
    { value: 1000000, label: "1 : 1 000 000" },
    { value: 2000000, label: "1 : 2 000 000" },
    { value: 5000000, label: "1 : 5 000 000" },
    { value: 10000000, label: "1 : 10 000 000" },
];

export const exportFormats = [
    { label: gettext("JPEG"), key: "jpeg", icon: <FileJpgOutlined /> },
    { label: gettext("PNG"), key: "png", icon: <FileImageOutlined /> },
    { label: gettext("TIFF"), key: "tiff", icon: <FileImageOutlined /> },
    { label: gettext("PDF"), key: "pdf", icon: <FilePdfOutlined /> },
];
