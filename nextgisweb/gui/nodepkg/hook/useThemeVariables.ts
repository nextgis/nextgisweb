import { useMemo } from "react";
import type { CSSProperties } from "react";

import { useToken } from "../antd";
import type { AliasToken } from "../antd";

/**
 * Generate CSS properties based on theme variables mapping
 *
 * @param mapping - Variable name to theme token mapping
 * @returns CSS properties with theme token values
 */
export function useThemeVariables(
    mapping: Record<string, keyof AliasToken>
): CSSProperties {
    const { token, hashId } = useToken();

    return useMemo(() => {
        void hashId;
        return Object.fromEntries(
            Object.entries(mapping).map(([vname, tkey]) => [
                `--${vname}`,
                `${token[tkey]}${
                    tkey.startsWith("borderRadius") ||
                    tkey.startsWith("fontSize") ||
                    tkey.startsWith("padding")
                        ? "px"
                        : ""
                }`,
            ])
        );
    }, [mapping, token, hashId]);
}
