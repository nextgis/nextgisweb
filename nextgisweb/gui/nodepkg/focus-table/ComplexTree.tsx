import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, MutableRefObject, ReactNode, Ref } from "react";
import {
    InteractionMode,
    Tree,
    UncontrolledTreeEnvironment,
} from "react-complex-tree";
import type {
    IndividualTreeViewState,
    TreeEnvironmentRef,
    TreeItem,
    TreeItemIndex,
    TreeItemRenderContext,
} from "react-complex-tree";

import { Button, Tooltip } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { mergeClasses } from "@nextgisweb/gui/util";

import { ROOT_DATA, ROOT_ITEM, useDataProvider } from "./DataProvider";
import type { DataProvider } from "./DataProvider";
import { useActionsCallback } from "./hook";
import type {
    FocusTableActions,
    FocusTableItem,
    FocusTableStore,
} from "./type";

import ErrorIcon from "@nextgisweb/icon/material/error_outline";
import ArrowIcon from "@nextgisweb/icon/material/keyboard_arrow_right";

import "./ComplexTree.less";

const TREE_ID = "main";
const getItemTitleStub = () => "STUB";

const arrowCollapsed = <ArrowIcon />;
const arrowExpanded = <ArrowIcon style={{ transform: "rotate(90deg)" }} />;
const arrowItem = <span style={{ display: "inline-block", width: "16px" }} />;

function ActionButton({ title, ...buttonProps }: ButtonProps) {
    return (
        <Tooltip {...{ title }}>
            <Button type="text" shape="circle" size="small" {...buttonProps} />
        </Tooltip>
    );
}

export interface ComplexTreeEnvironment<I extends FocusTableItem> {
    readonly store: FocusTableStore<I>;
    readonly selected: I | null;
    select: (item: I | null) => void;
    expand: (item: I[]) => void;
    indexFor: (item: I) => TreeItemIndex;
    isExpanded: (item: I | null) => boolean;
}

class EnvironmentAdapter<I extends FocusTableItem>
    implements ComplexTreeEnvironment<I>
{
    readonly target: TreeEnvironmentRef<I>;
    readonly store: FocusTableStore<I>;
    readonly provider: DataProvider<I>;

    constructor(
        target: TreeEnvironmentRef<I>,
        opts: { store: FocusTableStore<I>; provider: DataProvider<I> }
    ) {
        this.target = target;
        this.store = opts.store;
        this.provider = opts.provider;
    }

    get selected(): I | null {
        const state = this.target.viewState[TREE_ID] as IndividualTreeViewState;
        const selectedItems = state.selectedItems ?? [];
        return this.provider.indexer.lookup(selectedItems[0]) ?? null;
    }

    select = (item: I | null) => {
        if (item) {
            const index = this.provider.indexer.indexFor(item);
            this.target.selectItems([index], TREE_ID);
        } else {
            this.target.selectItems([], TREE_ID);
        }
    };

    expand = (items: I[]) => {
        items.forEach((item) => {
            const index = this.provider.indexer.indexFor(item);
            this.target.expandItem(index, TREE_ID);
        });
    };

    indexFor = (item: I) => {
        return this.provider.indexer.indexFor(item);
    };

    isExpanded = (item: I | null) => {
        if (item === null) return true;
        const state = this.target.viewState[TREE_ID] as IndividualTreeViewState;
        const expandedItems = state.expandedItems ?? [];
        return expandedItems.indexOf(this.indexFor(item)) >= 0;
    };
}

type ColumnWidth = string | [min: string, max: string];

export interface ComplexTreeColumn<I extends FocusTableItem> {
    render: (item: I) => ReactNode | string;
    span?: number;
    width?: ColumnWidth;
}

type ColumnMapping<I extends FocusTableItem, C extends string> = Partial<
    Record<C, ComplexTreeColumn<I>[]>
>;

export function columnsForType<I extends FocusTableItem>(
    arr: ComplexTreeColumn<I>[]
) {
    return arr as ComplexTreeColumn<FocusTableItem>[];
}

function columnCalcPercent(value: string): string {
    if (!value.endsWith("%")) return value;
    const p = Number(value.slice(0, value.length - 1));
    const f = (p / 100).toFixed(3);
    return `calc(${f} * var(--ct-width))`;
}

function columnWidthStyle(width?: ColumnWidth): CSSProperties {
    if (!width) return {};
    if (typeof width === "string") width = [width, width];
    return {
        minWidth: columnCalcPercent(width[0]),
        maxWidth: columnCalcPercent(width[1]),
    };
}

function setRefCurrent<T>(ref?: Ref<T>, val?: T) {
    if (!ref) return;
    const cast = ref as MutableRefObject<T | undefined>;
    cast.current = val ? val : undefined;
}

function Container(props: {
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    containerProps: any;
}) {
    const { className, containerProps, children } = props;
    const { style, ref, ...restContainerProps } = containerProps;

    const themeVariables = useThemeVariables({
        "color-primary": "colorPrimary",
        "color-alter": "colorFillAlter",
        "color-active": "controlItemBgActive",
        "color-disabled": "colorTextDisabled",
    });

    useEffect(() => {
        const element = ref.current;
        if (element) {
            const resizeObserver = new ResizeObserver((entries) => {
                entries.forEach((entry) => {
                    const div = entry.target as HTMLDivElement;
                    const width = div.getBoundingClientRect().width.toFixed(0);
                    div.style.setProperty("--ct-width", `${width}px`);
                });
            });
            resizeObserver.observe(element);
            return () => resizeObserver.unobserve(element);
        }
    }, [ref]);

    return (
        <div
            ref={ref}
            className={mergeClasses(
                "ngw-gui-focus-table-complex-tree",
                className
            )}
            style={{ ...style, ...themeVariables }}
            {...restContainerProps}
        >
            {children}
        </div>
    );
}

export interface ComplexTreeProps<
    I extends FocusTableItem,
    C extends string,
    S,
> {
    store: S;
    root?: string;
    environment?: Ref<ComplexTreeEnvironment<I>> | undefined;
    title?: (item: I) => string;
    columns?: ComplexTreeColumn<I>[] | [(item: I) => C, ColumnMapping<I, C>];
    actions?: FocusTableActions<I, ComplexTreeEnvironment<I>, undefined>;
    showErrors: boolean;
    showColumns: boolean;
    showActions: boolean;
    onSelect: (item: I | null) => void;
    onPrimaryAction?: (item: I) => void;
    rootClassName?: string;
}

export function ComplexTree<
    I extends FocusTableItem,
    C extends string = string,
    S extends FocusTableStore<I> = FocusTableStore<I>,
>({
    store,
    root = ROOT_ITEM,
    environment: propsEnvironment,
    title,
    columns,
    actions,
    showErrors = true,
    showColumns = true,
    showActions = true,
    onSelect,
    onPrimaryAction,
    rootClassName,
}: ComplexTreeProps<I, C, S>) {
    type EnvType = typeof UncontrolledTreeEnvironment<I | typeof ROOT_DATA>;
    type EnvProps = Required<Parameters<EnvType>[0]>;
    type CTE = ComplexTreeEnvironment<I>;

    const provider = useDataProvider<I>({ store, rootItem: root });
    const environmentRef = useRef<CTE>() as MutableRefObject<CTE>;

    const environmentMergeRefs = useCallback(
        (value: TreeEnvironmentRef<I> | null) => {
            const newValue = value
                ? new EnvironmentAdapter(value, {
                      store,
                      provider,
                  })
                : undefined;
            setRefCurrent(environmentRef, newValue);
            setRefCurrent(propsEnvironment, newValue);
        },
        [propsEnvironment, provider, store]
    );

    const getActions = useActionsCallback(actions, undefined);

    const onSelectItems = useCallback(
        (indexes: TreeItemIndex[]) => {
            onSelect?.(
                indexes.length > 0
                    ? provider.indexer.lookup(indexes[0]) || null
                    : null
            );
        },
        [onSelect, provider]
    );

    const onPrimaryActionCallback = useCallback(
        (item: TreeItem<I | typeof ROOT_DATA>) => {
            onPrimaryAction?.(item.data as I);
        },
        [onPrimaryAction]
    );

    // Rendering building blocks

    const [totalColumns, renderColumns] = useMemo<
        [m: number, (item: I) => [n: number, ReactNode]]
    >(() => {
        if (!columns) return [0, () => [0, undefined]];

        let ofItem: (item: I) => ComplexTreeColumn<I>[] | undefined;
        let count: number;

        if (typeof columns[0] === "function") {
            const getColumnGroup = columns[0] as (item: I) => C;
            const columnsByGroup = columns[1] as ColumnMapping<I, C>;
            ofItem = (item: I) => columnsByGroup[getColumnGroup(item)];
            // Calclute maximum number of columns in groups
            const groupSums = Object.values<ComplexTreeColumn<I>[] | undefined>(
                columnsByGroup
            ).map((c) => {
                const colSpans = c?.map((c) => c.span || 1) || [];
                return colSpans.reduce((a, v) => a + v, 0);
            });
            count = Math.max(...groupSums);
        } else {
            ofItem = () => columns as ComplexTreeColumn<I>[];
            count = columns.length;
        }

        return [
            count,
            (item) => {
                const cols = ofItem(item);
                if (!cols) return [0, undefined];
                return [
                    cols.length,
                    <>
                        {cols.map((col, idx) => (
                            <td
                                key={idx}
                                className="column"
                                colSpan={col.span}
                                style={columnWidthStyle(col.width)}
                            >
                                {col.render(item)}
                            </td>
                        ))}
                    </>,
                ];
            },
        ];
    }, [columns]);

    const renderActions = useCallback(
        (item: I) => {
            if (!getActions) return;
            return (
                <td className="actions">
                    {getActions(item).map(({ key, title, icon, callback }) => (
                        <ActionButton
                            key={key}
                            title={title}
                            icon={icon}
                            onClick={(event) => {
                                callback(item, environmentRef.current!);
                                event.stopPropagation();
                            }}
                        />
                    ))}
                </td>
            );
        },
        [getActions]
    );

    const Row = useMemo(() => {
        const Base = ({
            treeItem,
            storeItem,
            context,
            ...props
        }: {
            treeItem: TreeItem<I>;
            storeItem: I;
            depth: number;
            arrow: ReactNode;
            context: TreeItemRenderContext;
            // To avoid observer recreation on minor changes
            showColumns: boolean;
            showErrors: boolean;
            showActions: boolean;
        }) => {
            const selected = context.isSelected || context.isDraggingOver;
            const error = store.getItemError?.(treeItem.data);
            const [columnCount, columnsElement] = props.showColumns
                ? renderColumns(storeItem)
                : [0, undefined];

            return (
                <tr
                    key={treeItem.index}
                    className={selected ? "selected" : undefined}
                    style={{ "--ct-depth": props.depth } as CSSProperties}
                    {...context.itemContainerWithChildrenProps}
                    {...context.itemContainerWithoutChildrenProps}
                    {...context.interactiveElementProps}
                >
                    <td
                        className="title"
                        colSpan={
                            props.showColumns && columnCount < totalColumns
                                ? totalColumns - columnCount + 1
                                : undefined
                        }
                    >
                        <div>
                            {!provider.isFlat && props.arrow}
                            <div className="title">
                                {title?.(storeItem) || <>&nbsp;</>}
                            </div>
                            {props.showErrors && error && (
                                <div className="error">
                                    <Tooltip title={String(error)}>
                                        <ErrorIcon />
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    </td>
                    {columnsElement}
                    {props.showActions && renderActions(storeItem)}
                </tr>
            );
        };
        return observer(Base);
    }, [title, totalColumns, renderColumns, renderActions, provider, store]);

    // React complex tree rendering callbacks

    const renderTreeContainer = useCallback<EnvProps["renderTreeContainer"]>(
        (props) => <Container className={rootClassName} {...props} />,
        [rootClassName]
    );

    const renderItemArrow = useCallback<EnvProps["renderItemArrow"]>(
        ({ item, context }) => {
            return (
                <div className="arrow" {...context.arrowProps}>
                    {item.isFolder
                        ? context.isExpanded
                            ? arrowExpanded
                            : arrowCollapsed
                        : arrowItem}
                </div>
            );
        },
        []
    );

    const renderItem = useCallback<EnvProps["renderItem"]>(
        ({ item: treeItem, children, ...rest }) => {
            if (treeItem.data === ROOT_DATA) return <></>;
            const storeItem = treeItem.data as I;
            return (
                <>
                    <Row
                        treeItem={treeItem as TreeItem<I>}
                        storeItem={storeItem}
                        showColumns={showColumns}
                        showActions={showActions}
                        showErrors={showErrors}
                        {...rest}
                    />
                    {children}
                </>
            );
        },
        [Row, showColumns, showErrors, showActions]
    );

    const renderDragBetweenLine = useCallback<
        EnvProps["renderDragBetweenLine"]
    >(({ lineProps }) => <div className="drag-between" {...lineProps} />, []);

    const renderItemsContainer = useCallback<EnvProps["renderItemsContainer"]>(
        ({ depth, children }) =>
            depth === 0 ? (
                <table>
                    <tbody>{children}</tbody>
                </table>
            ) : (
                <>{children}</>
            ),
        []
    );

    return (
        <UncontrolledTreeEnvironment<I | typeof ROOT_DATA>
            ref={environmentMergeRefs as never}
            dataProvider={provider}
            getItemTitle={getItemTitleStub}
            defaultInteractionMode={InteractionMode.ClickArrowToExpand}
            canInvokePrimaryActionOnItemContainer={true}
            onSelectItems={onSelectItems}
            onPrimaryAction={onPrimaryActionCallback}
            viewState={{}}
            canDragAndDrop
            canDropOnFolder
            canReorderItems
            canSearch={false}
            showLiveDescription={false}
            // Rendering
            renderTreeContainer={renderTreeContainer}
            renderItemsContainer={renderItemsContainer}
            renderItem={renderItem}
            renderItemArrow={renderItemArrow}
            renderDragBetweenLine={renderDragBetweenLine}
        >
            <Tree treeId={TREE_ID} rootItem={root} />
        </UncontrolledTreeEnvironment>
    );
}
