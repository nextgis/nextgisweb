import { RequestQueue } from "./queue";

export { tileLoadFunction, transparentImage } from "./tileLoadFunction";
export { getUniqueName } from "./getUniqName";
export * from "./loader";
export * from "./abort";

const imageQueue = new RequestQueue({ debounce: 150, limit: 100 });

export const makeUid = () => Math.random().toString(36).slice(2);

export { RequestQueue, imageQueue };
