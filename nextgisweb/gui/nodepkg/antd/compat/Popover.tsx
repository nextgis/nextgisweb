import { Popover as Base } from "antd";

import { ParamsOf } from "../../type";

interface ArrowProps {
    pointAtCenter?: boolean;
}

interface Props extends ParamsOf<typeof Base> {
    arrow?: ArrowProps;
}

export default function Popover({ arrow, ...props }: Props) {
    if (arrow !== undefined) {
        if (arrow.pointAtCenter) {
            props["arrowPointAtCenter"] = true;
        }
    }
    return <Base {...props} />;
}
