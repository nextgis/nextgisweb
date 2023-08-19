import { Select as Base } from "antd";

import { ParamsOf } from "../../type";

type PType = ParamsOf<typeof Base>;
type PopupMatchSelectWidth = PType["dropdownMatchSelectWidth"];

interface Props extends PType {
    popupMatchSelectWidth?: PopupMatchSelectWidth;
}

export default function Select({ popupMatchSelectWidth, ...props }: Props) {
    if (popupMatchSelectWidth !== undefined) {
        props["dropdownMatchSelectWidth"] = popupMatchSelectWidth;
    }
    return <Base {...props} />;
}

Select.Option = Base.Option;
Select.OptGroup = Base.OptGroup;
