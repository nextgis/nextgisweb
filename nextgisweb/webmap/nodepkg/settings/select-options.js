import { gettext } from "@nextgisweb/pyramid/i18n";

export const UnitsLengthOptions = [
    {
        label: gettext("Meters"),
        value: "m",
    },
    {
        label: gettext("Kilometers"),
        value: "km",
    },
    {
        label: gettext("Meters/kilometers (auto)"),
        value: "metric",
    },
    {
        label: gettext("Feet"),
        value: "ft",
    },
    {
        label: gettext("Miles"),
        value: "mi",
    },
    {
        label: gettext("Feet/miles (auto)"),
        value: "imperial",
    },
];

export const UnitsAreaOptions = [
    {
        label: gettext("Sq. meters"),
        value: "sq_m",
    },
    {
        label: gettext("Sq. kilometers"),
        value: "sq_km",
    },
    {
        label: gettext("Sq. meters/kilometers (auto)"),
        value: "metric",
    },
    {
        label: gettext("Hectares"),
        value: "ha",
    },
    {
        label: gettext("Acres"),
        value: "ac",
    },
    {
        label: gettext("Sq. miles"),
        value: "sq_mi",
    },
    {
        label: gettext("Acres/sq. miles (auto)"),
        value: "imperial",
    },
    {
        label: gettext("Sq. feet"),
        value: "sq_ft",
    },
];

export const DegreeFormatOptions = [
    {
        label: gettext("Decimal degrees"),
        value: "dd",
    },
    {
        label: gettext("Degrees, decimal minutes"),
        value: "ddm",
    },
    {
        label: gettext("Degrees, minutes, seconds"),
        value: "dms",
    },
];

export const AddressGeocoderOptions = [
    {
        label: gettext("Nominatim (OSM)"),
        value: "nominatim",
    },
    {
        label: gettext("Yandex.Maps API Geocoder"),
        value: "yandex",
    },
];

export const LegendEnabledOptions = [
    { value: "default", label: gettext("Default") },
    { value: "expand", label: gettext("Expand") },
    { value: "collapse", label: gettext("Collapse") },
    { value: "disable", label: gettext("Disable") },
];
