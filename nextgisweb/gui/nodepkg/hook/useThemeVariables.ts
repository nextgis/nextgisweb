import type { CSSProperties } from "react";

import { useToken } from "../antd";
import type { AliasToken } from "../antd";

export function useThemeVariables(
    mapping: Record<string, keyof AliasToken>
): CSSProperties {
    const { token } = useToken();
    return Object.fromEntries(
        Object.entries(mapping).map(([vname, tkey]) => [
            `--${vname}`,
            `${token[tkey]}${
                tkey.startsWith("borderRadius") || tkey.startsWith("fontSize")
                    ? "px"
                    : ""
            }`,
        ])
    );
}
