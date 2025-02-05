/** @entrypoint */
import { RequestQueue } from "./queue";

export { tileLoadFunction } from "./tileLoadFunction";
export * from "./loader";
export * from "./abort";

const imageQueue = new RequestQueue({ debounce: 150, limit: 6 });

export { RequestQueue, imageQueue };
