import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { pgettext } from "@nextgisweb/pyramid/i18n";

export const msgLegendSymbolsLabel = pgettext("legend_symbols", "Legend");

const msgPlaceholder = pgettext("legend_symbols", "Default");

const options = [
  { value: "expand", label: pgettext("legend_symbols", "Expanded") },
  { value: "collapse", label: pgettext("legend_symbols", "Collapsed") },
  { value: "disable", label: pgettext("legend_symbols", "Disabled") },
];

export function LegendSymbolsSelect(props: SelectProps) {
  return <Select options={options} placeholder={msgPlaceholder} {...props} />;
}
