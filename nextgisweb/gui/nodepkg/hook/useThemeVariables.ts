import { isEqual } from "lodash-es";
import { useRef } from "react";
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

    type MemoKey = { hashId: string; mapping: typeof mapping };
    const memo = useRef<[MemoKey, CSSProperties] | undefined>();

    if (!memo.current || !isEqual(memo.current[0], { hashId, mapping })) {
        memo.current = [
            { hashId, mapping },
            Object.fromEntries(
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
            ),
        ];
    }

    return memo.current[1];
}
