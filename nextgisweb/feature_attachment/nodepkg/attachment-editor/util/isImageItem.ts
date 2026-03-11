import type { DataSource } from "../type";

import { isFileImage } from "./isFileImage";

export const isImageItem = (item: DataSource): boolean =>
  ("is_image" in item && item.is_image) ||
  ("_file" in item && item._file instanceof File && isFileImage(item._file));
