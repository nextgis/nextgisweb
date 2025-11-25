import { action, observable } from "mobx";

import type { CompositeMembersConfig } from "@nextgisweb/resource/type/api";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";
import type { TreeChildrenItemConfig } from "@nextgisweb/webmap/type/TreeItems";
import type {
    GroupItemConfig,
    LayerIdentification,
    LayerItemConfig,
    LegendInfo,
} from "@nextgisweb/webmap/type/api";
import { restoreSymbols } from "@nextgisweb/webmap/utils/symbolsIntervals";

abstract class BaseTreeItemStore {
    id: number;
    key: number;
    type: TreeChildrenItemConfig["type"];
    @observable.ref accessor parentId: number | null;
    @observable.ref accessor label: string;
    @observable.ref accessor title: string;

    protected constructor(
        init: Pick<
            TreeChildrenItemConfig,
            "id" | "key" | "type" | "label" | "title"
        >,
        parentId: number | null
    ) {
        this.parentId = parentId;

        this.id = init.id;
        this.key = init.key;
        this.type = init.type;
        this.label = init.label ?? "";
        this.title = init.title ?? "";
    }

    abstract dump(): GroupItemConfig | LayerItemConfig;

    isGroup(): this is TreeGroupStore {
        return this.type === "group";
    }
    isLayer(): this is TreeLayerStore {
        return this.type === "layer";
    }

    @action.bound
    update(values: Partial<this>): void {
        for (const [key, value] of Object.entries(values)) {
            const k = key as keyof this;
            const oldValue = this[k];
            if (oldValue !== value) {
                this[k] = value;
            }
        }
    }
}

let order = 0;

export class TreeLayerStore
    extends BaseTreeItemStore
    implements LayerItemConfig
{
    readonly type: LayerItemConfig["type"] = "layer";

    @observable.ref accessor plugin: CompositeMembersConfig;
    @observable.ref accessor adapter: string;
    @observable.ref accessor layerId: number;
    @observable.ref accessor styleId: number;
    @observable.ref accessor symbols: LayerSymbols | null = null;
    @observable.ref accessor editable: boolean | null;
    @observable.ref accessor legendInfo: LegendInfo;
    @observable.ref accessor visibility: boolean;
    @observable.ref accessor identifiable: boolean;
    @observable.ref accessor transparency: number | null;
    @observable.ref accessor minScaleDenom: number | null;
    @observable.ref accessor maxScaleDenom: number | null;
    @observable.ref accessor minResolution: number | null;
    @observable.ref accessor maxResolution: number | null;
    @observable.ref accessor identification: LayerIdentification | null;
    @observable.ref accessor drawOrderPosition: number;

    @observable.ref accessor isOutOfScaleRange = false;

    constructor(init: LayerItemConfig, parentId: number | null) {
        super(init, parentId);

        this.layerId = init.layerId;
        this.styleId = init.styleId;
        this.visibility = !!init.visibility;
        this.identifiable = !!init.identifiable;
        this.transparency = init.transparency ?? null;
        this.minScaleDenom = init.minScaleDenom ?? null;
        this.maxScaleDenom = init.maxScaleDenom ?? null;
        this.drawOrderPosition = init.drawOrderPosition ?? order++;
        this.legendInfo = init.legendInfo;
        this.adapter = init.adapter;
        this.plugin = init.plugin;
        this.minResolution = init.minResolution ?? null;
        this.maxResolution = init.maxResolution ?? null;
        this.editable = init.editable ?? null;
        this.identification = init.identification ?? null;
    }

    dump(): LayerItemConfig {
        const legendInfo = {
            visible: this.legendInfo.visible,
            has_legend: this.legendInfo.has_legend,
            symbols: this.legendInfo.symbols
                ? [...this.legendInfo.symbols]
                : null,
            single: this.legendInfo.single ?? null,
            open: this.legendInfo.open ?? null,
        } satisfies LegendInfo;

        return {
            type: "layer",
            id: this.id,
            key: this.key,
            label: this.label,
            title: this.title,

            layerId: this.layerId,
            styleId: this.styleId,
            visibility: this.visibility,
            identifiable: this.identifiable,
            transparency: this.transparency,
            minScaleDenom: this.minScaleDenom,
            maxScaleDenom: this.maxScaleDenom,
            drawOrderPosition: this.drawOrderPosition,

            legendInfo,

            adapter: this.adapter,
            plugin: this.plugin,
            minResolution: this.minResolution,
            maxResolution: this.maxResolution,
            editable: this.editable,
            identification: this.identification,
        } satisfies LayerItemConfig;
    }

    setLayerLegendSymbol = (symbolIndex: number, status: boolean) => {
        const layerSymbols = this.legendInfo?.symbols;
        if (layerSymbols) {
            const symbols: { [symbolIndex: number]: boolean } = {};

            const itemIntervals = this.symbols;
            if (Array.isArray(itemIntervals)) {
                const restoredSymbols = restoreSymbols(itemIntervals);
                for (const layerSymbol of layerSymbols) {
                    symbols[layerSymbol.index] =
                        restoredSymbols[layerSymbol.index] ?? false;
                }
            } else if (itemIntervals === "-1") {
                for (const layerSymbol of layerSymbols) {
                    symbols[layerSymbol.index] = false;
                }
            }

            symbols[symbolIndex] = status;

            const renderIndexes: number[] = [];
            for (const s of layerSymbols) {
                const render = symbols[s.index] ?? s.render;
                if (render) {
                    renderIndexes.push(s.index);
                }
            }
            // `-1` - hide layer at all, `null` - use default render without symbols
            const intervals: LayerSymbols =
                this._consolidateIntervals(renderIndexes);

            this.setItemSymbols(intervals);
        }
    };

    @action
    setItemSymbols(intervals: string[]) {
        this.symbols = intervals.length ? intervals : "-1";
    }

    private _consolidateIntervals = (symbols: number[]): string[] => {
        const sortedSymbols = symbols.slice().sort((a, b) => a - b);
        const intervals = [];
        let start = sortedSymbols[0];
        let end = start;

        for (let i = 1; i <= sortedSymbols.length; i++) {
            if (sortedSymbols[i] === end + 1) {
                end = sortedSymbols[i];
            } else {
                intervals.push(start === end ? `${start}` : `${start}-${end}`);
                start = sortedSymbols[i];
                end = start;
            }
        }

        return intervals;
    };
}

export class TreeGroupStore
    extends BaseTreeItemStore
    implements Omit<GroupItemConfig, "children">
{
    type: GroupItemConfig["type"] = "group";

    @observable.ref accessor expanded: boolean;
    @observable.ref accessor exclusive: boolean;
    @observable.shallow accessor childrenIds: number[] = [];

    constructor(init: GroupItemConfig, parentId: number | null) {
        super(init, parentId);

        this.expanded = !!init.expanded;
        this.exclusive = !!init.exclusive;
    }

    dump(): GroupItemConfig {
        return {
            type: "group",
            id: this.id,
            key: this.key,
            label: this.label,
            title: this.title,
            expanded: !!this.expanded,
            exclusive: !!this.exclusive,
            children: [],
        } satisfies GroupItemConfig;
    }

    @action.bound
    setChildrenIds(ids: number[]) {
        this.childrenIds = [...ids];
    }
}

export type TreeItemStore = TreeGroupStore | TreeLayerStore;

export function createTreeItemStore(
    init: TreeChildrenItemConfig,
    parentId: number | null
): TreeItemStore {
    if (init.type === "layer") {
        return new TreeLayerStore(init, parentId);
    }

    return new TreeGroupStore(init, parentId);
}
