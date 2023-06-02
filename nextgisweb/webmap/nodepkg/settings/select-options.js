import i18n from "@nextgisweb/pyramid/i18n!";

export const UnitsLengthOptions = [
    {
        label: i18n.gettext("Meters"),
        value: "m",
    },
    {
        label: i18n.gettext("Kilometers"),
        value: "km",
    },
    {
        label: i18n.gettext("Meters/kilometers (auto)"),
        value: "metric",
    },
    {
        label: i18n.gettext("Feet"),
        value: "ft",
    },
    {
        label: i18n.gettext("Miles"),
        value: "mi",
    },
    {
        label: i18n.gettext("Feet/miles (auto)"),
        value: "imperial",
    },
];

export const UnitsAreaOptions = [
    {
        label: i18n.gettext("Sq. meters"),
        value: "sq_m",
    },
    {
        label: i18n.gettext("Sq. kilometers"),
        value: "sq_km",
    },
    {
        label: i18n.gettext("Sq. meters/kilometers (auto)"),
        value: "metric",
    },
    {
        label: i18n.gettext("Hectares"),
        value: "ha",
    },
    {
        label: i18n.gettext("Acres"),
        value: "ac",
    },
    {
        label: i18n.gettext("Sq. miles"),
        value: "sq_mi",
    },
    {
        label: i18n.gettext("Acres/sq. miles (auto)"),
        value: "imperial",
    },
    {
        label: i18n.gettext("Sq. feet"),
        value: "sq_ft",
    },
];

export const DegreeFormatOptions = [
    {
        label: i18n.gettext("Decimal degrees"),
        value: "dd",
    },
    {
        label: i18n.gettext("Degrees, decimal minutes"),
        value: "ddm",
    },
    {
        label: i18n.gettext("Degrees, minutes, seconds"),
        value: "dms",
    },
];

export const AddressGeocoderOptions = [
    {
        label: i18n.gettext("Nominatim (OSM)"),
        value: "nominatim",
    },
    {
        label: i18n.gettext("Yandex.Maps API Geocoder"),
        value: "yandex",
    },
];

export const LegendEnabledOptions = [
    {
        label: i18n.gettext("Show"),
        value: "on"
    },
    {
        label: i18n.gettext("Hide"),
        value: "off"
    },
    {
        label: i18n.gettext("Disable"),
        value: "disable"
    },
    {
        label: i18n.gettext("Default"),
        value: "default"
    },
];
