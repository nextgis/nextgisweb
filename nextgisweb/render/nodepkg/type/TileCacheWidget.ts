import type { ForwardRefRenderFunction, FunctionComponent } from "react";

import type { TileCacheStore } from "../tile-cache-widget/TileCacheStore";

export interface TileCacheWidgetProps<
    S extends TileCacheStore = TileCacheStore,
> {
    store: S;
}

// in analog place in resource/editor-widget there were more, but doesn't seem it is used here
interface TileCacheWidgetOptions {
    title?: string;
    order?: number;
}

export type TileCacheWidgetComponent<P = unknown> = (
    | FunctionComponent<P>
    | ForwardRefRenderFunction<unknown, P>
) &
    TileCacheWidgetOptions;
