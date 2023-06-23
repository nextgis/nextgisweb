import { observer } from "mobx-react-lite";
import { InputNumber, Checkbox } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!render";

import "./TileCacheWidget.less";

export const TileCacheWidget = observer(({ store }) => {
    return (
        <div className="ngw-render-tile-cache-widget">
            <Checkbox
                checked={store.enabled}
                onChange={(e) => {
                    const checked = e.target.checked;
                    store.enabled = checked;
                    if (
                        checked &&
                        !store.imageCompose &&
                        store.maxZ === null &&
                        store.ttl === null
                    ) {
                        store.imageCompose = true;
                        store.maxZ = 6;
                        store.ttl = 2630000;
                    }
                }}
            >
                {i18n.gettext("Enabled")}
            </Checkbox>

            <Checkbox
                checked={store.imageCompose}
                onChange={(e) => {
                    store.imageCompose = e.target.checked;
                }}
            >
                {i18n.gettext("Allow using tiles in non-tile requests")}
            </Checkbox>

            {store.featureTrackChanges && (
                <Checkbox
                    checked={store.trackChanges}
                    onChange={(e) => {
                        store.trackChanges = e.target.checked;
                    }}
                >
                    {i18n.gettext("Track changes")}
                </Checkbox>
            )}

            <label>{i18n.gettext("Max zoom level") + ":"}</label>
            <InputNumber
                value={store.maxZ}
                onChange={(v) => {
                    store.maxZ = v;
                }}
                min={0}
                max={18}
                size="small"
            />

            {store.featureSeed && (
                <>
                    <label>{i18n.gettext("Seed zoom level") + ":"}</label>
                    <InputNumber
                        value={store.seedZ}
                        onChange={(v) => {
                            store.seedZ = v;
                        }}
                        min={0}
                        max={18}
                        size="small"
                    />
                </>
            )}

            <label>{i18n.gettext("TTL, sec.") + ":"}</label>
            <InputNumber
                value={store.ttl}
                onChange={(v) => {
                    store.ttl = v;
                }}
                min={0}
                max={315360000}
                step={86400}
                size="small"
            />

            <Checkbox>{i18n.gettext("Flush")}</Checkbox>
        </div>
    );
});

TileCacheWidget.title = i18n.gettext("Tile cache");
TileCacheWidget.order = 40;
