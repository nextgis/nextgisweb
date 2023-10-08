import { theme } from "antd";
import type { AliasToken } from "antd/es/theme/interface";
import type { CSSProperties } from "react";

const { useToken } = theme;

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
