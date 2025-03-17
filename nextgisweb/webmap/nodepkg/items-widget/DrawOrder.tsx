import { sortBy } from "lodash-es";
import { action, computed, observable, reaction } from "mobx";
import type { IObservableArray } from "mobx";
import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";

import { ComplexTree } from "@nextgisweb/gui/focus-table";
import type {
    FocusTableAction,
    FocusTableStore,
} from "@nextgisweb/gui/focus-table";
import type { ComplexTreeEnvironment } from "@nextgisweb/gui/focus-table/ComplexTree";
import { FocusToolbar } from "@nextgisweb/gui/focus-table/FocusToolbar";
import { ClearIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { Group } from "./Item";
import type { ItemObject, Layer } from "./Item";
import type { ItemsStore } from "./ItemsStore";

import ArrowBackIcon from "@nextgisweb/icon/material/arrow_back";

import "./DrawOrder.less";

const msgBack = gettext("Back to layers and groups");
const msgReset = gettext("Use default draw order");

class DrawOrderLayer {
    readonly layer: Layer;
    readonly collection: IObservableArray<DrawOrderLayer>;

    constructor(layer: Layer, collection: IObservableArray<DrawOrderLayer>) {
        this.layer = layer;
        this.collection = collection;
    }

    @computed
    get position(): number {
        return this.collection.indexOf(this) + 1;
    }

    @computed
    get title(): string {
        let parent: ItemObject | null = this.layer;
        const path: string[] = [];
        while (parent) {
            path.splice(0, 0, parent.displayName.value);
            parent = parent.parent;
        }
        return path.join(" > ");
    }
}

class DrawOrderStore implements FocusTableStore<DrawOrderLayer> {
    readonly items = observable.array<DrawOrderLayer>([]);

    constructor(items: IObservableArray<ItemObject>) {
        function* traverse(collection: typeof items): Generator<Layer> {
            for (const item of collection) {
                if (item instanceof Group) {
                    yield* traverse(item.children);
                } else {
                    yield item;
                }
            }
        }

        const array = sortBy(Array.from(traverse(items)), (i) => {
            const pos = i.layerDrawOrderPosition.value;
            return pos ?? Number.MAX_SAFE_INTEGER;
        });

        this.items.replace(
            array.map((item) => new DrawOrderLayer(item, this.items))
        );
    }

    @action
    sync() {
        this.items.forEach(({ layer, position }) => {
            if (layer.layerDrawOrderPosition.value !== position) {
                layer.layerDrawOrderPosition.value = position;
            }
        });
    }

    getItemChildren(item: DrawOrderLayer | null) {
        return item === null ? this.items : undefined;
    }

    getItemContainer(item: DrawOrderLayer) {
        return item && this.items;
    }

    getItemParent() {
        return null;
    }
}

function Title({ title, position }: { title: string; position: number }) {
    return (
        <>
            <span className="ngw-webmap-items-widget-draw-order-position">
                {position}
            </span>
            {title}
        </>
    );
}

export interface DrawOrderTableProps {
    store: ItemsStore;
    close?: () => void;
}

export function DrawOrderTable({ store, close }: DrawOrderTableProps) {
    const orderStore = useMemo(() => {
        return new DrawOrderStore(store.items);
    }, [store]);

    const environmentRef = useRef<ComplexTreeEnvironment<DrawOrderLayer>>(null);

    useEffect(() => {
        store.drawOrderEnabled.value = true;
        orderStore.sync();
        return reaction(
            () => [...orderStore.items],
            () => orderStore.sync()
        );
    }, [orderStore, store]);

    const actions = useMemo<FocusTableAction<DrawOrderLayer | null>[]>(
        () => [
            {
                key: "back",
                title: msgBack,
                icon: <ArrowBackIcon />,
                placement: "left",
                callback: () => close?.(),
            },
            {
                key: "reset",
                title: msgReset,
                icon: <ClearIcon />,
                placement: "right",
                danger: true,
                callback: () => {
                    store.drawOrderEnabled.value = false;
                    orderStore.items.forEach(({ layer }) => {
                        layer.layerDrawOrderPosition.value = null;
                    });
                    close?.();
                },
            },
        ],
        [orderStore, close, store]
    );

    const posPlaces = Math.ceil(Math.log10(orderStore.items.length)) + 0.5;
    const posStyle = { "--position-width": `${posPlaces}ch` } as CSSProperties;

    return (
        <div className="ngw-webmap-items-widget-draw-order-table">
            <FocusToolbar<DrawOrderLayer | null>
                environmentRef={environmentRef}
                actions={actions}
                selected={null}
            />
            <div className="items" style={posStyle}>
                <ComplexTree<DrawOrderLayer>
                    store={orderStore}
                    environment={environmentRef}
                    showActions={true}
                    title={(item) => (
                        <Title title={item.title} position={item.position!} />
                    )}
                />
            </div>
        </div>
    );
}
