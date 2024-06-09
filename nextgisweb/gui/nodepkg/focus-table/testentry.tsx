/** @testentry react */
/* eslint-disable no-use-before-define */
import * as falso from "@ngneat/falso";
import { makeObservable, override } from "mobx";
import type { IObservableArray } from "mobx";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Input, InputValue } from "@nextgisweb/gui/antd";
import { LotMV, firstError, mapper, validate } from "@nextgisweb/gui/arm";
import type { ErrorResult } from "@nextgisweb/gui/arm";
import { FieldsForm, useForm } from "@nextgisweb/gui/fields-form";
import {
    FocusTable,
    action,
    columnsForType,
    observableChildren,
} from "@nextgisweb/gui/focus-table";
import type {
    FocusTablePropsActions,
    FocusTableStore,
} from "@nextgisweb/gui/focus-table";
import { Area } from "@nextgisweb/gui/mayout";

interface GroupPayload {
    type: "group";
    title: string;
    children: (GroupPayload | LayerPayload)[];
}

interface LayerPayload {
    type: "layer";
    title: string;
    foo: string;
    bar: string;
}

type TypeValue = "group" | "layer";
type Common<T = TypeValue> = { type: T; title: string };
type Item = Group | Layer;

const {
    "title": baseTitle,
    $load: baseLoad,
    $error: baseError,
} = mapper<Base, Pick<Common, "title">>();

baseTitle.validate(
    validate.unique((o) => {
        return o.store.getItemContainer(o as Item);
    }, "title")
);

class Base<T extends TypeValue = TypeValue, D extends Common<T> = Common<T>> {
    readonly store: Store;
    readonly type: T;

    parent: Group | null = null;
    title = baseTitle.init("", this);

    constructor(store: Store, { type, ...data }: D) {
        this.store = store;
        this.type = type;
        baseLoad(this, data);
        makeObservable(this, { parent: true, error: true });
    }

    get error(): ErrorResult {
        return baseError(this);
    }
}

class Group extends Base<"group", Omit<GroupPayload, "children">> {
    readonly children = observableChildren<Item>(this, "parent");

    constructor(
        store: Store,
        { children, ...data }: Omit<GroupPayload, "type">
    ) {
        super(store, { type: "group", ...data });
        makeObservable(this, { error: override });
        this.children.replace(
            children.map((item) =>
                item.type === "group"
                    ? new Group(this.store, item)
                    : new Layer(this.store, item)
            )
        );
    }

    get error(): ErrorResult {
        return firstError(
            () => super.error,
            () => {
                for (const c of this.children) {
                    const r = c.error;
                    if (r === true || typeof r === "string")
                        return "Group members have errors";
                }
            }
        );
    }
}

const {
    foo: layerFoo,
    bar: layerBar,
    $load: layerLoad,
    $error: layerError,
} = mapper<Layer, LayerPayload>();

class Layer extends Base<"layer", LayerPayload> {
    foo = layerFoo.init("", this);
    bar = layerBar.init("", this);

    constructor(store: Store, { ...data }: Omit<LayerPayload, "type">) {
        super(store, { type: "layer", ...data });
        layerLoad(this, data);
        makeObservable(this, { error: override, update: true });
    }

    get error(): ErrorResult {
        return firstError(
            () => super.error,
            () => layerError(this)
        );
    }

    update(value: Partial<Omit<LayerPayload, "type" | "children">>) {
        Object.entries(value).forEach(([k, v]) =>
            this[k as keyof typeof value].setter(v)
        );
    }
}

class Store implements FocusTableStore<Item> {
    children = observableChildren<Item>(null, "parent");

    // FocusTableStore implementation

    getItemChildren(item: Item | null): IObservableArray<Item> | undefined {
        return item === null
            ? this.children
            : item.type === "group"
              ? item.children
              : undefined;
    }

    getItemContainer(item: Item): IObservableArray<Item> {
        return item.parent === null ? this.children : item.parent.children;
    }

    getItemParent(item: Item): Item | null {
        return item.parent;
    }

    getItemError(item: Item): ErrorResult {
        return item.error;
    }
}

const GroupComponent = observer<{
    item: Group;
    store: Store;
}>(function GroupComponentBase({ item }) {
    return (
        <Area pad>
            <LotMV label="Title" value={item.title} component={InputValue} />
        </Area>
    );
});

function LayerComponent({ item }: { item: Layer }) {
    const form = useForm<Layer>()[0];
    const fields = useMemo(
        () => [
            { name: "title", label: "Title", formItem: <Input /> },
            { name: "foo", label: "Foo", formItem: <Input /> },
            { name: "bar", label: "Bar", formItem: <Input /> },
        ],
        []
    );

    return (
        <FieldsForm
            form={form}
            fields={fields}
            initialValues={{
                title: item.title.value,
                foo: item.foo.value,
                bar: item.bar.value,
            }}
            onChange={({ value }) => item.update(value)}
            style={{ padding: "1em" }}
        />
    );
}

export default function ComplexTreeTest() {
    const store = useMemo(() => new Store(), []);

    const { tableActions, itemActions } = useMemo<FocusTablePropsActions<Item>>(
        () => ({
            tableActions: [
                action.addItem(
                    () =>
                        new Group(store, {
                            title: falso.randCompanyName(),
                            children: [],
                        }),
                    { key: "add_group", title: "Add group" }
                ),
                action.addItem(
                    () =>
                        new Layer(store, {
                            title: falso.randBrand(),
                            foo: falso.randFullName(),
                            bar: falso.randZipCode(),
                        }),
                    { key: "add_layer", title: "Add layer" }
                ),
            ],
            itemActions: [action.deleteItem()],
        }),
        [store]
    );

    return (
        <div
            style={{ height: "500px", border: "1px solid rgba(0, 0, 0, 0.06)" }}
        >
            <FocusTable<Item, "group" | "layer">
                store={store}
                title={(item) => item.title.value}
                columns={[
                    (item) => item.type,
                    {
                        // Groups don't have extra columns
                        layer: columnsForType<Layer>([
                            {
                                render: (i) => i.foo.value,
                                width: ["25%", "50%"],
                            },
                            { render: (i) => i.bar.value },
                        ]),
                    },
                ]}
                tableActions={tableActions}
                itemActions={itemActions}
                renderDetail={({ item }) => {
                    return item.type === "group" ? (
                        <GroupComponent item={item} store={store} />
                    ) : (
                        <LayerComponent item={item} />
                    );
                }}
            />
        </div>
    );
}
