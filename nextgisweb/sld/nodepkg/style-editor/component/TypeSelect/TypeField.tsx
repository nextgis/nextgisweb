import { Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { SymbolizerType } from "../../type/Style";

const Option = Select.Option;

export interface KindFieldProps {
    kind?: SymbolizerType;
    symbolizerKinds?: SymbolizerType[];
    onChange?: (kind: SymbolizerType) => void;
}

const symbolizerKindsLabel: Record<SymbolizerType, string> = {
    point: gettext("Mark"),
    polygon: gettext("Fill"),
    line: gettext("Line"),
};

export function TypeField({
    onChange,
    kind = "point",
    symbolizerKinds = ["point", "polygon", "line"],
}: KindFieldProps) {
    const kindSelectOptions = symbolizerKinds.map((kind_) => (
        <Option key={kind_} value={kind_}>
            {symbolizerKindsLabel?.[kind_] || kind}
        </Option>
    ));

    return (
        <Select
            className="editor-field kind-field"
            value={kind}
            onChange={onChange}
        >
            {kindSelectOptions}
        </Select>
    );
}
