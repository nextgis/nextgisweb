import type { DataSource } from "../type";

import { getAttachmentKey } from "./getAttachmentKey";

export const findAttachmentIndex = (
  meta: DataSource,
  data: DataSource[]
): number => {
  const key = getAttachmentKey(meta);
  return data.findIndex((a) => getAttachmentKey(a) === key);
};
