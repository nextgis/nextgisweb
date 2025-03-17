import { action, computed, observable, runInAction } from "mobx";
import type { IObservableArray } from "mobx";

import { mapper } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import { observableChildren } from "@nextgisweb/gui/focus-table";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table";
import type { CompositeStore } from "@nextgisweb/resource/composite";
import type {
    EditorStore,
    EditorStoreOptions,
} from "@nextgisweb/resource/type";
import type { WebMapRead, WebMapUpdate } from "@nextgisweb/webmap/type/api";

import { Group, Layer } from "./Item";
import type { ItemObject } from "./Item";

type MyProps = "root_item" | "draw_order_enabled";
type PickMy<T extends Record<string, unknown>> = Pick<T, MyProps>;

const { draw_order_enabled: drawOrderEnabled, $load: mapperLoad } = mapper<
    ItemsStore,
    Omit<PickMy<WebMapUpdate>, "root_item">
>({
    validateIf: (o) => o.validate,
    onChange: (o) => o.markDirty(),
});

export class ItemsStore
    implements
        EditorStore<PickMy<WebMapRead>, PickMy<WebMapUpdate>>,
        FocusTableStore<ItemObject>
{
    readonly identity = "webmap";
    @observable.ref accessor dirty = false;
    @observable.ref accessor validate = false;

    readonly drawOrderEnabled = drawOrderEnabled.init(false, this);
    readonly items = observableChildren<ItemObject>(null, "parent", () => {
        this.markDirty();
    });

    composite: CompositeStore;

    private _loaded = false;

    constructor({ composite }: EditorStoreOptions) {
        this.composite = composite;
    }

    @action
    load(value: PickMy<WebMapRead>) {
        mapperLoad(this, value);
        this.items.replace(
            value.root_item.children.map((item) =>
                item.item_type === "group"
                    ? new Group(this, item)
                    : new Layer(this, item)
            )
        );
        this._loaded = true;
    }

    dump(): PickMy<WebMapUpdate> | undefined {
        if (!this.dirty) return;
        return {
            ...this.drawOrderEnabled.jsonPart(),
            root_item: {
                item_type: "root",
                children: this.items.map((i) => i.dump()),
            },
        };
    }

    @action
    markDirty() {
        if (this._loaded) {
            this.dirty = true;
        }
    }

    @computed
    get isValid(): boolean {
        runInAction(() => {
            this.validate = true;
        });
        return this.items.every((i) => {
            return i.error === false;
        });
    }

    // FocusTableStore implementation

    getItemChildren(
        item: ItemObject | null
    ): IObservableArray<ItemObject> | undefined {
        return item === null
            ? this.items
            : item instanceof Group
              ? item.children
              : undefined;
    }

    getItemContainer(item: ItemObject): IObservableArray<ItemObject> {
        return item.parent === null ? this.items : item.parent.children;
    }

    getItemParent(item: ItemObject): Group | null {
        return item.parent;
    }

    getItemError(item: ItemObject): ErrorResult {
        return item.error;
    }
}
