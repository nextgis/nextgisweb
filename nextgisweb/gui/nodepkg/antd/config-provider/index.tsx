import Base from "antd/es/config-provider";
import { antd } from "@nextgisweb/jsrealm/locale-loader!";

import type { ParamsOf } from "../../type";

type Props = ParamsOf<typeof Base>;

const defaults: Props = {
    locale: antd,
};

export default function ConfigProvider(props: Props) {
    return <Base {...defaults} {...props} />;
}
