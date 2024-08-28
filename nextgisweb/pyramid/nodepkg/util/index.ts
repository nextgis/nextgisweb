/** @entrypoint */
import { RequestQueue } from "./queue";

export * from "./loader";
export * from "./abort";

const imageQueue = new RequestQueue({ debounce: 100, limit: 4 });

export { RequestQueue, imageQueue };
