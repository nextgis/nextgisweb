import { observer } from "mobx-react-lite";

import { CheckboxValue, InputNumber } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { TileCacheStore } from "./TileCacheStore";

export const TileCacheWidget: EditorWidgetComponent<
    EditorWidgetProps<TileCacheStore>
> = observer(({ store }) => {
    return (
        <Area pad>
            <Lot label={false}>
                <CheckboxValue
                    value={!!store.enabled}
                    onChange={(v) => {
                        const data: Partial<TileCacheStore> = { enabled: v };
                        if (
                            v &&
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
                </CheckboxValue>
            </Lot>

            <Lot label={false}>
                <CheckboxValue
                    value={!!store.imageCompose}
                    onChange={(v) => store.update({ imageCompose: v })}
                >
                    {gettext("Allow using tiles in non-tile requests")}
                </CheckboxValue>
            </Lot>

            {store.featureTrackChanges && (
                <Lot label={false}>
                    <CheckboxValue
                        value={!!store.trackChanges}
                        onChange={(v) => store.update({ trackChanges: v })}
                    >
                        {gettext("Track changes")}
                    </CheckboxValue>
                </Lot>
            )}

            <Lot label={gettext("Max zoom level")}>
                <InputNumber
                    value={store.maxZ}
                    onChange={(v) => store.update({ maxZ: v })}
                    min={0}
                    max={18}
                />
            </Lot>

            {store.featureSeed && (
                <Lot label={gettext("Seed zoom level")}>
                    <InputNumber
                        value={store.seedZ}
                        onChange={(v) => store.update({ seedZ: v })}
                        min={0}
                        max={18}
                    />
                </Lot>
            )}

            <Lot label={gettext("TTL, sec.")}>
                <InputNumber
                    value={store.ttl}
                    onChange={(v) => store.update({ ttl: v })}
                    min={0}
                    max={315360000}
                    step={86400}
                />
            </Lot>

            <Lot label={false}>
                <CheckboxValue
                    value={!!store.flush}
                    onChange={(v) => store.update({ flush: v })}
                >
                    {gettext("Flush")}
                </CheckboxValue>
            </Lot>
        </Area>
    );
});

TileCacheWidget.title = gettext("Tile cache");
TileCacheWidget.order = 40;
