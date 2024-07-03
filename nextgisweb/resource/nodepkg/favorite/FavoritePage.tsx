/** @entrypoint */
import groupBy from "lodash-es/groupBy";
import sortBy from "lodash-es/sortBy";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, InputValue } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { DeleteIcon, EditIcon, SuccessIcon } from "@nextgisweb/gui/icon";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { mergeClasses } from "@nextgisweb/gui/util";
import { route } from "@nextgisweb/pyramid/api";
import {
    useAbortController,
    useRoute,
    useRouteGet,
} from "@nextgisweb/pyramid/hook";
import { PageTitle } from "@nextgisweb/pyramid/layout";
import type * as apitype from "@nextgisweb/resource/type/api";

import "./FavoritePage.less";

type Schema = Record<string, apitype.ResourceFavoriteSchemaItem>;

type ResourceInfo = { id: number; cls: string; path: string[]; dn: string };
type Item = Omit<apitype.ResourceFavoriteRead, "resource"> & {
    resource: ResourceInfo;
};

interface EditorProps {
    id: number;
    label: string | null;
    icon: string;
    schemaItem: apitype.ResourceFavoriteSchemaItem;
    block: boolean;
    deleteItem: () => Promise<unknown>;
    relabelItem: (value: string | null) => Promise<unknown>;
}

function Editor(props: EditorProps) {
    const [label, setLabel] = useState(props.label || "");
    const [dirty, setDirty] = useState(false);

    return (
        <InputValue
            size="large"
            value={label || ""}
            placeholder={props.schemaItem.label}
            htmlSize={label && label.length > 8 ? label.length : 8}
            style={props.block ? {} : { width: "auto" }}
            addonBefore={<SvgIcon icon={props.icon} />}
            addonAfter={
                <DeleteIcon
                    style={{ cursor: "pointer" }}
                    onClick={() => props.deleteItem()}
                />
            }
            onChange={(value) => {
                setLabel(value);
                setDirty(true);
            }}
            onBlur={() => {
                if (dirty) {
                    props.relabelItem(label === "" ? null : label);
                    setDirty(false);
                }
            }}
        />
    );
}

interface ResourceProps {
    resource: ResourceInfo;
    items: Item[];
    schema: Schema;
    editing: boolean;
    deleteItem: (id: number) => Promise<unknown>;
    relabelItem: (id: number, label: string | null) => Promise<unknown>;
}

function Resource({
    resource,
    items,
    schema,
    editing,
    deleteItem,
    relabelItem,
}: ResourceProps) {
    const [first, rest] = useMemo(() => {
        const sorted = sortBy(
            items,
            (i) => schema[i.identity].route,
            (i) => i.created
        );

        const firstIdentity = sorted.at(0)?.identity;
        return sorted.length === 1 ||
            (firstIdentity && schema[firstIdentity].route)
            ? [sorted[0], sorted.slice(1)]
            : [undefined, sorted];
    }, [items, schema]);

    const Item = useCallback(
        ({ item, block }: { item: (typeof items)[number]; block: boolean }) => {
            const schemaItem = schema[item.identity];
            return editing ? (
                <Editor
                    id={item.id}
                    label={item.label}
                    icon={schemaItem.icon}
                    schemaItem={schemaItem}
                    block={block}
                    deleteItem={() => deleteItem(item.id)}
                    relabelItem={(label) => relabelItem(item.id, label)}
                />
            ) : (
                <Button
                    type="default"
                    size="large"
                    href={item.url}
                    style={block ? { display: "block", width: "100%" } : {}}
                    icon={
                        <SvgIcon icon={schemaItem.icon} fill="currentColor" />
                    }
                >
                    {item.label || schemaItem.label}
                </Button>
            );
        },
        [editing, deleteItem, relabelItem, schema]
    );

    const path = resource.path;

    return (
        <>
            <div className="icon">
                <SvgIcon icon={`rescls-${resource.cls}`} />
            </div>
            <div
                className={mergeClasses(
                    "resource",
                    rest.length > 0 && "has-tail"
                )}
            >
                {path.length > 0 && (
                    <div className="path">{path.join(" > ")}</div>
                )}
                <div className="dn">{resource.dn}</div>
            </div>
            {first && (
                <div className="first">
                    <Item item={first} block={true} />
                </div>
            )}
            {rest.length > 0 && (
                <div className="rest">
                    {rest.map((item) => (
                        <Item key={item.id} item={item} block={false} />
                    ))}
                </div>
            )}
        </>
    );
}

export default function FavoritePage() {
    const { makeSignal } = useAbortController();
    const { data: schema } = useRouteGet("resource.favorite.schema");
    const [items, setItems] = useState<Item[] | undefined>();
    const [editing, setEditing] = useState(false);
    const { route: routeCollection } = useRoute("resource.favorite.collection");

    useEffect(() => {
        (async () => {
            const { items, resources } = await routeCollection.get();
            const rm = new Map(resources.map((r) => [r.id, r]));
            const rp = new Map(
                resources.map((res) => {
                    const path: string[] = [];

                    let p = res.parent ? rm.get(res.parent?.id) ?? null : null;
                    while (p && p.id !== 0) {
                        path.splice(0, 0, p.display_name);
                        p = p.parent ? rm.get(p.parent.id) ?? null : null;
                    }

                    if (path.slice(-1)[0] === res.display_name) path.splice(-1);

                    return [
                        res.id,
                        {
                            id: res.id,
                            cls: res.cls,
                            path: path,
                            dn: res.display_name,
                        },
                    ];
                })
            );

            setItems(
                items.map((item) => ({
                    ...item,
                    resource: rp.get(item.resource.id)!,
                }))
            );
        })();
    }, [routeCollection]);

    const entries = useMemo(() => {
        if (!schema || !items) return undefined;
        const grp = groupBy(items, (i) => i.resource.id);
        const vals = Object.values(grp).map((items) => {
            const resource = items[0].resource;
            return { resource, items };
        });
        return sortBy(vals, ({ resource }) => resource.path.join("\0"));
    }, [items, schema]);

    const deleteItem = useCallback(
        (id: number) => {
            setItems((items) => items?.filter((item) => item.id !== id));
            return route("resource.favorite.item", id).delete({
                signal: makeSignal(),
            });
        },
        [makeSignal]
    );

    const relabelItem = useCallback(
        (id: number, label: string | null) => {
            setItems((items) =>
                items?.map((item) =>
                    item.id === id ? { ...item, label } : item
                )
            );
            return route("resource.favorite.item", id).put({
                json: { label },
                signal: makeSignal(),
            });
        },
        [makeSignal]
    );

    return (
        <>
            <PageTitle>
                {" "}
                <Button
                    type="text"
                    size="large"
                    icon={editing ? <SuccessIcon /> : <EditIcon />}
                    onClick={() => {
                        setEditing(!editing);
                    }}
                />
            </PageTitle>
            <div className="ngw-resource-favorite-page">
                {!entries || !schema ? (
                    <LoadingWrapper />
                ) : (
                    entries.map(({ resource, items }) => (
                        <Resource
                            key={resource.id}
                            resource={resource}
                            items={items}
                            schema={schema}
                            editing={editing}
                            deleteItem={deleteItem}
                            relabelItem={relabelItem}
                        />
                    ))
                )}
            </div>
        </>
    );
}

FavoritePage.targetElementId = "main";
