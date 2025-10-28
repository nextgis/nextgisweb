import { useCallback, useTransition } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { getExtentFromLayer } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import type { ExtentRowValue } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import { unionExtents } from "@nextgisweb/gui/component/extent-row/util";
import { getChildrenDeep } from "@nextgisweb/gui/util/tree";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    WebMapItemGroupWrite,
    WebMapItemLayerWrite,
    WebMapItemRootWrite,
} from "@nextgisweb/webmap/type/api";

import type { SettingStore } from "../SettingStore";

import ExtentFromAllIcon from "@nextgisweb/icon/material/zoom_out_map";

const msgCompute = gettext("Compute extent from all added layers");

interface ComputeWebmapExtentProps {
    store: SettingStore;
    onDone?: (extent: ExtentRowValue) => void;
}

export function ComputeWebmapExtent({
    store,
    onDone,
}: ComputeWebmapExtentProps) {
    const [isPending, startTransition] = useTransition();
    const { makeSignal } = useAbortController();

    const handleClick = useCallback(() => {
        startTransition(async () => {
            try {
                const value = await store.composite.getValue();
                if (!value?.webmap?.root_item) return;

                const items = getChildrenDeep<
                    | WebMapItemGroupWrite
                    | WebMapItemLayerWrite
                    | WebMapItemRootWrite
                >(value.webmap.root_item);

                if (!items.length) return;

                const signal = makeSignal();

                const layers = items.filter((i) => i.item_type === "layer");

                if (!layers.length) return;

                const extents = await Promise.all(
                    layers.map((item) =>
                        getExtentFromLayer({
                            resourceId: item.layer_style_id,
                            signal,
                        })
                    )
                );

                const combined = unionExtents(extents);
                if (combined) {
                    onDone?.(combined);
                }
            } catch {
                // ignore
            }
        });
    }, [store.composite, makeSignal, onDone]);

    return (
        <Button
            onClick={handleClick}
            loading={isPending}
            title={msgCompute}
            icon={!isPending && <ExtentFromAllIcon />}
        ></Button>
    );
}
