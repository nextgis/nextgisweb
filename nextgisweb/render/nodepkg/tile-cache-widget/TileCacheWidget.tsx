import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { CheckboxValue, InputNumber } from "@nextgisweb/gui/antd";
import type { CheckboxValueProps } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { Area } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { TileCacheStore } from "./TileCacheStore";

export const TileCacheWidget: EditorWidget<TileCacheStore> = observer(
    ({ store }) => {
        const CheckboxEnabled = useCallback(
            ({ onChange, ...props }: CheckboxValueProps) => {
                return (
                    <CheckboxValue
                        {...props}
                        onChange={(v) => {
                            if (
                                v &&
                                !store.imageCompose.value &&
                                store.maxZ.value === null &&
                                store.ttl.value === null
                            ) {
                                store.imageCompose.value = true;
                                store.maxZ.value = 6;
                                store.ttl.value = 2630000;
                            }
                            onChange?.(v);
                        }}
                    />
                );
            },
            [store]
        );

        return (
            <Area pad>
                <LotMV
                    label={false}
                    value={store.enabled}
                    component={CheckboxEnabled}
                    props={{
                        children: gettext("Enabled"),
                    }}
                />
                <LotMV
                    label={false}
                    value={store.imageCompose}
                    component={CheckboxValue}
                    props={{
                        children: gettext(
                            "Allow using tiles in non-tile requests"
                        ),
                    }}
                />
                <LotMV
                    label={gettext("Max zoom level")}
                    value={store.maxZ}
                    component={InputNumber}
                    props={{
                        min: 0,
                        max: 18,
                    }}
                />
                <LotMV
                    label={gettext("TTL, sec.")}
                    value={store.ttl}
                    component={InputNumber}
                    props={{
                        min: 0,
                        max: 315360000,
                        step: 86400,
                    }}
                />
                <LotMV
                    label={false}
                    value={store.flush}
                    component={CheckboxValue}
                    props={{
                        children: gettext("Flush"),
                    }}
                />
            </Area>
        );
    }
);

TileCacheWidget.displayName = "TileCacheWidget";
TileCacheWidget.title = gettext("Tile cache");
TileCacheWidget.order = 40;
