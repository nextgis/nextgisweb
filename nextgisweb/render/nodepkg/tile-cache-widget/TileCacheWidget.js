import { observer } from "mobx-react-lite";

import { Checkbox, InputNumber } from "@nextgisweb/gui/antd";

import i18n from "@nextgisweb/pyramid/i18n";

import "./TileCacheWidget.less";

export const TileCacheWidget = observer(({ store }) => {
    return (
        <div className="ngw-render-tile-cache-widget">
            <Checkbox
                checked={store.enabled}
                onChange={(e) => {
                    const enabled = e.target.checked;
                    const data = { enabled };
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
                {i18n.gettext("Enabled")}
            </Checkbox>

            <Checkbox
                checked={store.imageCompose}
                onChange={(e) =>
                    store.update({ imageCompose: e.target.checked })
                }
            >
                {i18n.gettext("Allow using tiles in non-tile requests")}
            </Checkbox>

            {store.featureTrackChanges && (
                <Checkbox
                    checked={store.trackChanges}
                    onChange={(e) => {
                        store.update({ trackChanges: e.target.checked });
                    }}
                >
                    {i18n.gettext("Track changes")}
                </Checkbox>
            )}

            <label>{i18n.gettext("Max zoom level")}</label>
            <InputNumber
                value={store.maxZ}
                onChange={(v) => store.update({ maxZ: v })}
                min={0}
                max={18}
            />

            {store.featureSeed && (
                <>
                    <label>{i18n.gettext("Seed zoom level")}</label>
                    <InputNumber
                        value={store.seedZ}
                        onChange={(v) => store.update({ seedZ: v })}
                        min={0}
                        max={18}
                    />
                </>
            )}

            <label>{i18n.gettext("TTL, sec.")}</label>
            <InputNumber
                value={store.ttl}
                onChange={(v) => store.update({ ttl: v })}
                min={0}
                max={315360000}
                step={86400}
            />

            <Checkbox>{i18n.gettext("Flush")}</Checkbox>
        </div>
    );
});

TileCacheWidget.title = i18n.gettext("Tile cache");
TileCacheWidget.order = 40;
