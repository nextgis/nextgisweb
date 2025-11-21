import { useMemo } from "react";

import { registry } from "./registry";
import type { CBlockSlot, CBlocks } from "./registry";

export type CBlockProps = {
    [K in keyof CBlocks]: CBlocks[K] extends NonNullable<unknown>
        ? { slot: K; payload: CBlocks[K] }
        : CBlocks[K] extends undefined
          ? { slot: K; payload?: undefined }
          : never;
}[CBlockSlot];

export function CBlock({ slot, payload }: CBlockProps) {
    const Component = useMemo(() => {
        for (const i of registry.query({ slot })) {
            const candidate = i.func(payload as any);
            if (candidate) return candidate;
        }
    }, [slot, payload]);

    return Component ? <Component {...(payload as any)} /> : undefined;
}
