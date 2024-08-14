/** @entrypoint */
import groupBy from "lodash-es/groupBy";
import partition from "lodash-es/partition";
import sortBy from "lodash-es/sortBy";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Balancer } from "react-wrap-balancer";

import { Button, InputValue, Tooltip } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { DeleteIcon, EditIcon, SuccessIcon } from "@nextgisweb/gui/icon";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { mergeClasses } from "@nextgisweb/gui/util";
import { route } from "@nextgisweb/pyramid/api";
import {
    useAbortController,
    useRoute,
    useRouteGet,
} from "@nextgisweb/pyramid/hook";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import { Translated } from "@nextgisweb/pyramid/i18n/translated";
import { PageTitle } from "@nextgisweb/pyramid/layout";
import { resources } from "@nextgisweb/resource/blueprint";
import type * as apitype from "@nextgisweb/resource/type/api";

import IconFavoriteOutline from "@nextgisweb/icon/material/star";

import "./FavoritePage.less";

const msgEmptyTextFmt = gettextf(
    "No favorite resources have been added yet. Use the star icon ({}) " +
        "in the user's context menu to add items here."
);

type Schema = Record<string, apitype.ResourceFavoriteSchemaItem>;

type ResourceInfo = {
    id: number;
    cls: string;
    path: string[];
    pstr: string;
    dn: string;
};

type Item = Omit<apitype.ResourceFavoriteRead, "resource"> & {
    resource: ResourceInfo;
};

interface EditorProps {
    id: number;
    value: string | null;
    placeholder: string;
    schema: Schema;
    relabelItem: (id: number, value: string | null) => Promise<unknown>;
}

function Editor(props: EditorProps) {
    const [value, setValue] = useState(props.value || "");
    const [dirty, setDirty] = useState(false);

    return (
        <InputValue
            value={value || ""}
            placeholder={props.placeholder}
            onChange={(value) => {
                setValue(value);
                setDirty(true);
            }}
            onBlur={() => {
                if (dirty) {
                    props.relabelItem(props.id, value === "" ? null : value);
                    setDirty(false);
                }
            }}
        />
    );
}

interface ItemLinkProps {
    item: Item;
    schema: Schema;
    editing: boolean;
    deleteItem: (id: number) => Promise<unknown>;
}

function ItemLink({ item, schema, editing, deleteItem }: ItemLinkProps) {
    if (editing) {
        return (
            <a onClick={() => deleteItem(item.id)}>
                <DeleteIcon />
            </a>
        );
    } else {
        return (
            <Tooltip title={schema[item.identity].label}>
                <a href={item.url}>
                    <SvgIcon
                        icon={schema[item.identity].icon}
                        fill="currentColor"
                    />
                </a>
            </Tooltip>
        );
    }
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

                    let p = res.parent
                        ? (rm.get(res.parent?.id) ?? null)
                        : null;
                    while (p && p.id !== 0) {
                        path.splice(0, 0, p.display_name);
                        p = p.parent ? (rm.get(p.parent.id) ?? null) : null;
                    }

                    return [
                        res.id,
                        {
                            id: res.id,
                            cls: res.cls,
                            path: path,
                            pstr: path.join("\0"),
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

    const data = useMemo(() => {
        if (!schema || !items) return undefined;
        const grpPath = groupBy(items, ({ resource }) => resource.pstr);
        const sortPath = sortBy(
            Object.values(grpPath),
            (items) => items[0].resource.pstr
        );

        const result = [];
        for (const items of sortPath) {
            const path = items[0].resource.path;

            const grpResource = groupBy(items, ({ resource }) => resource.id);
            const srtResource = sortBy(
                Object.values(grpResource),
                (items) => items[0].resource.dn
            );

            const rows = [];
            for (const ritem of srtResource) {
                const res = ritem[0].resource;

                const [aitems, bitems] = partition(
                    ritem,
                    ({ identity }) => !!schema[identity].route
                );

                rows.push({
                    key: `resource-${res.id}`,
                    type: "resource",
                    resource: res,
                    items: aitems,
                });

                let idx = 0;
                for (const item of bitems) {
                    const label = schema[item.identity].label;
                    rows.push({
                        key: `item-${item.id}`,
                        type: "item",
                        item: item,
                        placeholder: label + " " + String(++idx),
                    });
                }
            }

            result.push({ path, rows });
        }
        return result;
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

    const PathRow = useCallback(({ path }: { path: string[] }) => {
        return (
            path.length > 0 && (
                <tr className="path">
                    <td colSpan={3}>{path.join(" > ")}</td>
                </tr>
            )
        );
    }, []);

    const ResourceRow = useCallback(
        ({ resource, items }: { resource: ResourceInfo; items: Item[] }) => {
            const onClick =
                items.length === 1 && !editing
                    ? () => (window.location.href = items[0].url)
                    : undefined;
            return (
                <tr
                    className={mergeClasses("resource", onClick && "click")}
                    onClick={onClick}
                >
                    <td className="dn">
                        <div>
                            <SvgIcon icon={`rescls-${resource.cls}`} />
                            {resource.dn}
                        </div>
                    </td>
                    <td className="type">{resources[resource.cls].label}</td>
                    <td className="action">
                        <div>
                            {items.map((item, idx) => (
                                <ItemLink
                                    key={idx}
                                    item={item}
                                    schema={schema!}
                                    editing={editing}
                                    deleteItem={deleteItem}
                                />
                            ))}
                        </div>
                    </td>
                </tr>
            );
        },
        [deleteItem, editing, schema]
    );

    const ItemRow = useCallback(
        ({ item, placeholder }: { item: Item; placeholder: string }) => (
            <tr
                className="item click"
                onClick={
                    !editing
                        ? () => (window.location.href = item.url)
                        : undefined
                }
            >
                <td className="dn">
                    {editing ? (
                        <Editor
                            id={item.id}
                            value={item.label}
                            placeholder={placeholder}
                            relabelItem={relabelItem}
                            schema={schema!}
                        />
                    ) : (
                        item.label || placeholder
                    )}
                </td>
                <td className="type">{schema![item.identity].label}</td>
                <td className="action">
                    <div>
                        <ItemLink
                            item={item}
                            schema={schema!}
                            editing={editing}
                            deleteItem={deleteItem}
                        />
                    </div>
                </td>
            </tr>
        ),
        [relabelItem, deleteItem, editing, schema]
    );

    const themeVariables = useThemeVariables({
        "color-alter": "colorFillAlter",
        "color-border": "colorBorderSecondary",
        "border-radius": "borderRadius",
    });

    let body;
    if (!data || !schema) {
        body = <LoadingWrapper />;
    } else if (data.length === 0) {
        body = (
            <div className="empty">
                <Balancer>
                    <Translated
                        msgf={msgEmptyTextFmt}
                        // eslint-disable-next-line react/jsx-key
                        args={[<IconFavoriteOutline />]}
                    />
                </Balancer>
            </div>
        );
    } else {
        body = (
            <table>
                {data.map(({ path, rows }, idx) => {
                    return (
                        <Fragment key={idx}>
                            {idx !== 0 && (
                                <tbody className="space">
                                    <tr>
                                        <td colSpan={3}>&nbsp;</td>
                                    </tr>
                                </tbody>
                            )}
                            <tbody>
                                <PathRow path={path} />
                                {rows.map(({ key, type, ...rest }) =>
                                    type === "resource" ? (
                                        <ResourceRow
                                            key={key}
                                            resource={rest.resource!}
                                            items={rest.items!}
                                        />
                                    ) : (
                                        <ItemRow
                                            key={key}
                                            item={rest.item!}
                                            placeholder={rest.placeholder!}
                                        />
                                    )
                                )}
                            </tbody>
                        </Fragment>
                    );
                })}
            </table>
        );
    }

    return (
        <>
            <PageTitle pullRight>
                {items && items.length > 0 && (
                    <Button
                        type="default"
                        size="large"
                        icon={editing ? <SuccessIcon /> : <EditIcon />}
                        onClick={() => setEditing(!editing)}
                    >
                        {editing ? gettext("Done") : gettext("Edit")}
                    </Button>
                )}
            </PageTitle>
            <div className="ngw-resource-favorite-page" style={themeVariables}>
                {body}
            </div>
        </>
    );
}

FavoritePage.targetElementId = "main";
