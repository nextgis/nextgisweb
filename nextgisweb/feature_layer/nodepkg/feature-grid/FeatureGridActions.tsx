import { observer } from "mobx-react-lite";
import { useCallback, useMemo } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    CreateButtonActionProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Input, Space, Tooltip } from "@nextgisweb/gui/antd";
import { useConfirm } from "@nextgisweb/gui/hook/useConfirm";
import {
    AddIcon,
    DeleteIcon,
    EditIcon,
    OpenInNewIcon,
} from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type Routes from "@nextgisweb/pyramid/type/route";
import { useResource } from "@nextgisweb/resource/hook/useResource";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import type { FeatureEditorWidgetProps } from "../feature-editor/type";
import type { FilterExpressionString } from "../feature-filter/type";
import FilteredCount from "../filtered-count/FilteredCount";

import type { FeatureGridStore } from "./FeatureGridStore";
import { deleteFeatures } from "./api/deleteFeatures";
import { ExportAction } from "./component/ExportAction";
import type { ActionProps } from "./type";

import FilterAltIcon from "@nextgisweb/icon/material/filter_alt/outline";

const msgOpenTitle = gettext("Open");
const msgOpenOnNewPage = gettext("Open on a new page");
const msgDeleteTitle = gettext("Delete");
const msgEditTitle = gettext("Edit");
const msgEditOnNewPage = gettext("Edit on a new page");
const msgCreate = gettext("Create");

const msgSearchPlaceholder = gettext("Search...");
const msgFilterTitle = gettext("Advanced filter");

export const FeatureGridActions = observer(
    ({
        store,
        children,
        editorProps,
    }: {
        store: FeatureGridStore;
        children?: React.ReactNode;
        editorProps?: FeatureEditorWidgetProps;
    }) => {
        const {
            id,
            size,
            actions: propActions,
            readonly,
            canCreate,
            queryParams,
            selectedIds,
            editOnNewPage,
            filterExpression,
            beforeDelete,
            deleteError,
            onDelete,
            onSave: onSaveProp,
            onOpen,
            fields,
        } = store;

        const { isExportAllowed } = useResource({ id });
        const { data: resourceData } = useRouteGet("resource.item", { id });

        const { confirmDelete, contextHolder } = useConfirm();
        const { lazyModal, modalHolder } = useShowModal();

        const goTo = useCallback(
            (
                path: keyof Pick<
                    Routes,
                    | "feature_layer.feature.update"
                    | "feature_layer.feature.show"
                >
            ) => {
                if (selectedIds.length) {
                    window.open(
                        routeURL(path, { id, feature_id: selectedIds[0] })
                    );
                }
            },
            [id, selectedIds]
        );

        const handleDelete = useCallback(async () => {
            const featureIds = [...selectedIds];
            if (beforeDelete) {
                beforeDelete(featureIds);
            }
            try {
                await deleteFeatures({
                    resourceId: id,
                    featureIds,
                });
                if (onDelete) {
                    onDelete(featureIds);
                }
            } catch {
                if (deleteError) {
                    deleteError(featureIds);
                }
            }
            store.setSelectedIds([]);
            store.bumpVersion();
        }, [selectedIds, beforeDelete, store, id, onDelete, deleteError]);

        const onOpenClick = useCallback(() => {
            if (selectedIds.length) {
                const featureId = selectedIds[0];
                if (onOpen) {
                    onOpen({ featureId, resourceId: id });
                } else {
                    lazyModal(() => import("../feature-display-modal"), {
                        featureId,
                        resourceId: id,
                    });
                }
            }
        }, [selectedIds, onOpen, id, lazyModal]);

        const onSave = useCallback(
            (item?: CompositeRead) => {
                if (onSaveProp) {
                    onSaveProp(item);
                }
                store.bumpVersion();
            },
            [onSaveProp, store]
        );

        const handleFilterApply = useCallback(
            (filter: FilterExpressionString | undefined) => {
                store.setFilterExpression(filter);

                store.bumpVersion();
            },
            [store]
        );

        const handleAdvancedFilterClick = useCallback(() => {
            lazyModal(
                () => import("../feature-filter/FeatureFilterModalLazy"),
                {
                    fields,
                    value: filterExpression || undefined,
                    onApply: handleFilterApply,
                }
            );
        }, [lazyModal, fields, filterExpression, handleFilterApply]);

        const defActions: ActionToolbarAction<ActionProps>[] = [
            (props: CreateButtonActionProps) => (
                <Space.Compact key="feature-item-open">
                    <Tooltip title={!props.isFit && msgOpenTitle}>
                        <Button
                            disabled={!selectedIds.length}
                            size={size}
                            onClick={onOpenClick}
                        >
                            {props.isFit && msgOpenTitle}
                        </Button>
                    </Tooltip>

                    <Tooltip title={msgOpenOnNewPage} key="open-new-page">
                        <Button
                            disabled={!selectedIds.length}
                            size={size}
                            onClick={() => {
                                if (selectedIds.length) {
                                    goTo("feature_layer.feature.show");
                                }
                            }}
                            icon={<OpenInNewIcon />}
                        />
                    </Tooltip>
                </Space.Compact>
            ),
        ];

        if (!readonly) {
            defActions.push(
                ...[
                    (props: CreateButtonActionProps) => (
                        <Space.Compact key="feature-item-edit">
                            {canCreate && (
                                <Tooltip title={!props.isFit && msgCreate}>
                                    <Button
                                        size={size}
                                        icon={<AddIcon />}
                                        onClick={() => {
                                            lazyModal(
                                                () =>
                                                    import("../feature-editor-modal"),
                                                {
                                                    editorOptions: {
                                                        resourceId: id,
                                                        onSave,
                                                        ...(editorProps ?? {}),
                                                    },
                                                }
                                            );
                                        }}
                                    >
                                        {props.isFit && msgCreate}
                                    </Button>
                                </Tooltip>
                            )}
                            <Tooltip title={!props.isFit && msgEditTitle}>
                                <Button
                                    disabled={!selectedIds.length}
                                    size={size}
                                    icon={<EditIcon />}
                                    onClick={() => {
                                        if (selectedIds.length) {
                                            const featureId = selectedIds[0];
                                            lazyModal(
                                                () =>
                                                    import("../feature-editor-modal"),
                                                {
                                                    editorOptions: {
                                                        featureId,
                                                        resourceId: id,
                                                        onSave: (e) => {
                                                            if (onSave) {
                                                                onSave(e);
                                                            }
                                                            store.bumpVersion();
                                                        },
                                                        ...(editorProps ?? {}),
                                                    },
                                                }
                                            );
                                        }
                                    }}
                                >
                                    {props.isFit && msgEditTitle}
                                </Button>
                            </Tooltip>
                            {editOnNewPage && (
                                <Tooltip
                                    title={msgEditOnNewPage}
                                    key="leftButton"
                                >
                                    <Button
                                        disabled={!selectedIds.length}
                                        size={size}
                                        onClick={() => {
                                            goTo(
                                                "feature_layer.feature.update"
                                            );
                                        }}
                                        icon={<OpenInNewIcon />}
                                    />
                                </Tooltip>
                            )}
                        </Space.Compact>
                    ),
                    {
                        onClick: () => {
                            confirmDelete({ onOk: handleDelete });
                        },
                        icon: <DeleteIcon />,
                        title: msgDeleteTitle,
                        danger: true,
                        disabled: !selectedIds.length,
                        size,
                    },
                ]
            );
        }

        let advancedButton = undefined;
        if (
            resourceData?.resource?.interfaces?.includes(
                "IFilterableFeatureLayer"
            )
        ) {
            advancedButton = (
                <Tooltip title={msgFilterTitle}>
                    <Button
                        icon={<FilterAltIcon />}
                        onClick={handleAdvancedFilterClick}
                        size={size}
                        type={filterExpression ? "primary" : "default"}
                    />
                </Tooltip>
            );
        }

        const rightActions: ActionToolbarAction<ActionProps>[] = [
            <FilteredCount store={store} key="filtered-count" />,
            <div key="search">
                <Space.Compact>
                    <Input
                        value={queryParams?.ilike}
                        placeholder={msgSearchPlaceholder}
                        onChange={(e) =>
                            store.setQueryParams({
                                ...store.queryParams,
                                ilike: e.target.value,
                            })
                        }
                        allowClear
                        size={size}
                    />
                    {advancedButton}
                </Space.Compact>
            </div>,
        ];
        if (isExportAllowed) {
            rightActions.push((props) => (
                <ExportAction queryParams={queryParams} {...props} />
            ));
        }

        const actionProps: ActionProps = useMemo(
            () => ({
                selectedIds,
                id,
            }),
            [selectedIds, id]
        );

        return (
            <ActionToolbar
                size={size}
                actions={[...defActions, ...propActions]}
                rightActions={rightActions}
                actionProps={actionProps}
            >
                {contextHolder}
                {modalHolder}
                {children}
            </ActionToolbar>
        );
    }
);

FeatureGridActions.displayName = "FeatureGridActions";
