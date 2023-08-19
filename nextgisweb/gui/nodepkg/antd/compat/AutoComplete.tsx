import { AutoComplete as Base } from "antd";

import { ParamsOf } from "../../type";

type PType = ParamsOf<typeof Base>;
type PopupMatchSelectWidth = PType["dropdownMatchSelectWidth"];

interface Props extends PType {
    popupMatchSelectWidth?: PopupMatchSelectWidth;
}

export default function AutoComplete({
    popupMatchSelectWidth,
    ...props
}: Props) {
    if (popupMatchSelectWidth !== undefined) {
        props["dropdownMatchSelectWidth"] = popupMatchSelectWidth;
    }
    return <Base {...props} />;
}

AutoComplete.Option = Base.Option;
