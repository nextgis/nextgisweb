import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";

const VALUES = [
    "INTEGER",
    "BIGINT",
    "REAL",
    "STRING",
    "DATE",
    "TIME",
    "DATETIME",
];

const OPTIONS = VALUES.map((i) => ({ value: i, label: i }));

type DatatypeSelectProps = Omit<SelectProps<string | undefined>, "options">;

export function DatatypeSelect({
    value,
    status,
    ...restProps
}: DatatypeSelectProps) {
    if (status === undefined && value === undefined) status = "warning";
    return <Select options={OPTIONS} {...{ value, status }} {...restProps} />;
}
