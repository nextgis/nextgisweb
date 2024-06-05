import { observer } from "mobx-react-lite";

import { Checkbox, InputNumber } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./TileCacheWidget.less";

import type { TileCacheWidgetComponent, TileCacheWidgetProps } from "../type";

import type { TileCacheStore } from "./TileCacheStore";

export const TileCacheWidget: TileCacheWidgetComponent<
    TileCacheWidgetProps<TileCacheStore>
> = observer(({ store }) => {
    return (
        <div className="ngw-render-tile-cache-widget">
            <Checkbox
                checked={store.enabled || undefined}
                onChange={(e) => {
                    const enabled = e.target.checked;
                    const data: Partial<TileCacheStore> = { enabled };
                    if (
                        enabled &&
                        !store.imageCompose &&
                        store.maxZ === null &&
                        store.ttl === null
                    ) {
                        data.imageCompose = true;
                        data.maxZ = 6;
                        data.ttl = 2630000;
                    }
                    store.update(data);
                }}
            >
                {gettext("Enabled")}
            </Checkbox>

            <Checkbox
                checked={store.imageCompose || undefined}
                onChange={(e) =>
                    store.update({ image_compose: e.target.checked })
                }
            >
                {gettext("Allow using tiles in non-tile requests")}
            </Checkbox>

            {store.featureTrackChanges && (
                <Checkbox
                    checked={store.trackChanges || undefined}
                    onChange={(e) => {
                        store.update({ track_changes: e.target.checked });
                    }}
                >
                    {gettext("Track changes")}
                </Checkbox>
            )}

            <label>{gettext("Max zoom level")}</label>
            <InputNumber
                value={store.maxZ}
                onChange={(v) => store.update({ max_z: v })}
                min={0}
                max={18}
            />

            {store.featureSeed && (
                <>
                    <label>{gettext("Seed zoom level")}</label>
                    <InputNumber
                        value={store.seedZ}
                        onChange={(v) => store.update({ seed_z: v })}
                        min={0}
                        max={18}
                    />
                </>
            )}

            <label>{gettext("TTL, sec.")}</label>
            <InputNumber
                value={store.ttl}
                onChange={(v) => store.update({ ttl: v })}
                min={0}
                max={315360000}
                step={86400}
            />

            <Checkbox>{gettext("Flush")}</Checkbox>
        </div>
    );
});

TileCacheWidget.title = gettext("Tile cache");
TileCacheWidget.order = 40;
