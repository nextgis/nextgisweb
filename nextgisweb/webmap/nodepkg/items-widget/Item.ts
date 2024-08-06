import { computed, observable } from "mobx";

import { firstError, mapper } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import { observableChildren } from "@nextgisweb/gui/focus-table";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    WebMapItemGroupWrite,
    WebMapItemLayerWrite,
} from "@nextgisweb/webmap/type/api";

import type { ItemsStore } from "./ItemsStore";

type ItemPayload = {
    [P in keyof WebMapItemGroupWrite & keyof WebMapItemLayerWrite]:
        | WebMapItemGroupWrite[P]
        | WebMapItemLayerWrite[P];
};
type ItemType = ItemPayload["item_type"];
type ItemData<D> = Partial<Omit<D, "item_type">>;
type ItemDump<T, D> = Omit<D, "item_type"> & { item_type: T };

const mapperOpts = {
    validateIf: (o: BaseItem) => o.store.validate,
    onChange: (o: BaseItem) => o.store.markDirty(),
};

const {
    display_name: displayName,
    $load: baseLoad,
    $error: baseError,
} = mapper<BaseItem, Omit<ItemPayload, "item_type">>({
    ...mapperOpts,
    properties: { display_name: { required: true } },
});

abstract class BaseItem<
    T extends ItemType = ItemType,
    D extends ItemPayload = ItemPayload,
> {
    abstract readonly itemType: ItemType;
    readonly store: ItemsStore;

    @observable.ref accessor parent: Group | null = null;
    displayName = displayName.init("", this);

    constructor(store: ItemsStore, data: ItemData<D>) {
        this.store = store;
        baseLoad(this, data);
    }

    dump(): ItemDump<T, ItemPayload> {
        return {
            item_type: this.itemType as T,
            ...this.displayName.jsonPart(),
        };
    }
}

const {
    group_expanded: groupExpanded,
    group_exclusive: groupExclusive,
    $load: groupLoad,
    $error: groupError,
} = mapper<Group, WebMapItemGroupWrite>(mapperOpts);

export class Group extends BaseItem<"group", WebMapItemGroupWrite> {
    readonly itemType = "group" as const;

    readonly groupExpanded = groupExpanded.init(false, this);
    readonly groupExclusive = groupExclusive.init(false, this);
    readonly children = observableChildren<ItemObject>(this, "parent", () => {
        this.store.markDirty();
    });

    constructor(store: ItemsStore, data: ItemData<WebMapItemGroupWrite>) {
        super(store, data);
        groupLoad(this, data);
        this.children.replace(
            (data.children || []).map((item) =>
                item.item_type === "group"
                    ? new Group(this.store, item)
                    : // eslint-disable-next-line @typescript-eslint/no-use-before-define
                      new Layer(this.store, item)
            )
        );
    }

    dump(): ItemDump<"group", WebMapItemGroupWrite> {
        return {
            ...super.dump(),
            ...this.groupExpanded.jsonPart(),
            ...this.groupExclusive.jsonPart(),
            children: this.children.map((item) => item.dump()),
        };
    }

    @computed get error(): ErrorResult {
        return firstError(
            () => baseError(this),
            () => groupError(this),
            () => {
                for (const c of this.children) {
                    const r = c.error;
                    if (r === true || typeof r === "string")
                        return gettext("Group members have errors");
                }
                return false;
            }
        );
    }
}

const {
    layer_enabled: layerEnabled,
    layer_identifiable: layerIdentifiable,
    layer_transparency: layerTransparency,
    layer_min_scale_denom: layerMinScaleDenom,
    layer_max_scale_denom: layerMaxScaleDenom,
    layer_adapter: layerAdapter,
    legend_symbols: layerLegendSymbols,
    layer_style_id: layerStyleId,
    draw_order_position: layerDrawOrderPosition,
    $load: layerLoad,
    $error: layerError,
} = mapper<Layer, WebMapItemLayerWrite>(mapperOpts);

export class Layer extends BaseItem<"layer", WebMapItemLayerWrite> {
    readonly itemType = "layer" as const;

    readonly layerEnabled = layerEnabled.init(true, this);
    readonly layerIdentifiable = layerIdentifiable.init(true, this);
    readonly layerTransparency = layerTransparency.init(null, this);
    readonly layerMinScaleDenom = layerMinScaleDenom.init(null, this);
    readonly layerMaxScaleDenom = layerMaxScaleDenom.init(null, this);
    readonly layerAdapter = layerAdapter.init("image", this);
    readonly layerLegendSymbols = layerLegendSymbols.init(null, this);
    readonly layerStyleId = layerStyleId.init(-1, this);
    readonly layerDrawOrderPosition = layerDrawOrderPosition.init(null, this);

    constructor(store: ItemsStore, data: ItemData<WebMapItemLayerWrite>) {
        super(store, data);
        layerLoad(this, data);
    }

    dump(): ItemDump<"layer", WebMapItemLayerWrite> {
        return {
            ...super.dump(),
            ...this.layerEnabled.jsonPart(),
            ...this.layerIdentifiable.jsonPart(),
            ...this.layerTransparency.jsonPart(),
            ...this.layerMinScaleDenom.jsonPart(),
            ...this.layerMaxScaleDenom.jsonPart(),
            ...this.layerAdapter.jsonPart(),
            ...this.layerLegendSymbols.jsonPart(),
            ...this.layerStyleId.jsonPart(),
            ...this.layerDrawOrderPosition.jsonPart(),
        };
    }

    @computed get error(): ErrorResult {
        return firstError(
            () => baseError(this),
            () => layerError(this)
        );
    }
}

export type ItemObject = Group | Layer;
