import Base from "antd/es/config-provider";
import color from "color";

import { antd } from "@nextgisweb/jsrealm/i18n/lang";

import type { ParamsOf } from "../../type";

type Props = ParamsOf<typeof Base>;

const computed = window.getComputedStyle(document.body);

const cvar = (name: string): string => {
    const val = computed.getPropertyValue("--" + name);

    try {
        const parsedColor = color(val);
        return parsedColor.hex();
    } catch {
        return val;
    }
};

type Theme = NonNullable<Props["theme"]>;

const token: Theme["token"] = {
    borderRadius: 4,
    colorError: cvar("error"),
    colorInfo: cvar("primary"),
    colorPrimary: cvar("primary"),
    colorSuccess: cvar("success"),
    colorWarning: cvar("warning"),
    fontFamily: cvar("ngw-text-font-family"),
    fontWeightStrong: Number(cvar("ngw-text-font-weight-bold")),
    motion: false,
};

const components: Theme["components"] = {
    Modal: { titleFontSize: 20 },
};

const defaults: Props = {
    locale: antd,
    theme: { token, components },
    wave: { disabled: true },
};

export default function ConfigProvider(props: Props) {
    return <Base {...defaults} {...props} />;
}
