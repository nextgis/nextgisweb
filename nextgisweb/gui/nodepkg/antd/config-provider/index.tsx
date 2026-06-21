import Base from "antd/es/config-provider";
import color from "color";
import type { ComponentProps } from "react";

import { antd } from "@nextgisweb/jsrealm/i18n/lang";

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

type Theme = NonNullable<ComponentProps<typeof Base>["theme"]>;

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
  lineWidthFocus: 1,
};

const components: Theme["components"] = {
  Modal: { titleFontSize: 20 },
};

const defaults: ComponentProps<typeof Base> = {
  locale: antd,
  theme: { token, components },
  wave: { disabled: true },
  modal: {
    mask: {
      blur: false,
    },
  },
  drawer: {
    mask: {
      blur: false,
    },
  },
};

export default function ConfigProvider(props: ComponentProps<typeof Base>) {
  return <Base {...defaults} {...props} />;
}
