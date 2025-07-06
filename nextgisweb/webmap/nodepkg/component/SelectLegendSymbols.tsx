import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgPlaceholder = gettext("Default");

const options = [
    { value: "expand", label: gettext("Expand") },
    { value: "collapse", label: gettext("Collapse") },
    { value: "disable", label: gettext("Disable") },
];

export function SelectLegendSymbols(props: SelectProps) {
    return <Select options={options} placeholder={msgPlaceholder} {...props} />;
}
