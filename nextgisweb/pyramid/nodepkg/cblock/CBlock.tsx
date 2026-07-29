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
  for (const i of registry.query({ slot })) {
    const candidate = i.func(payload as any);
    if (candidate) return candidate;
  }

  return null;
}
