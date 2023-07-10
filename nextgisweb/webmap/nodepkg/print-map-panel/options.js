import { FileJpgOutlined, FileImageOutlined } from "@ant-design/icons";

import i18n from "@nextgisweb/pyramid/i18n";

export const pageFormats = [
    { value: "210_297", label: i18n.gettext("A4 - Portrait") },
    { value: "297_210", label: i18n.gettext("A4 - Landscape") },
    { value: "297_420", label: i18n.gettext("A3 - Portrait") },
    { value: "420_297", label: i18n.gettext("A3 - Landscape") },
    { value: "420_594", label: i18n.gettext("A2 - Portrait") },
    { value: "594_420", label: i18n.gettext("A2 - Landscape") },
    { value: "594_841", label: i18n.gettext("A1 - Portrait") },
    { value: "841_594", label: i18n.gettext("A1 - Landscape") },
    { value: "841_1189", label: i18n.gettext("A0 - Portrait") },
    { value: "1189_841", label: i18n.gettext("A0 - Landscape") },
    { value: "custom", label: i18n.gettext("Custom size") },
];

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
    { label: i18n.gettext("JPEG"), key: "jpeg", icon: <FileJpgOutlined /> },
    { label: i18n.gettext("PNG"), key: "png", icon: <FileImageOutlined /> },
];
