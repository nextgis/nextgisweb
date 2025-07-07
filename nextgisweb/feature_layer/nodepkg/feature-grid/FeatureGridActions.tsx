import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type {
    ActionToolbarAction,
    CreateButtonActionProps,
} from "@nextgisweb/gui/action-toolbar";
import { Button, Input, Space, Tooltip } from "@nextgisweb/gui/antd";
import { DeleteIcon, EditIcon, OpenInNewIcon } from "@nextgisweb/gui/icon";
import showModal from "@nextgisweb/gui/showModal";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { confirmDelete } from "@nextgisweb/pyramid/layout";
import type Routes from "@nextgisweb/pyramid/type/route";
import { useResource } from "@nextgisweb/resource/hook/useResource";

import { FeatureDisplayModal } from "../feature-display-modal";
import { FeatureEditorModal } from "../feature-editor-modal";

import type { FeatureGridStore } from "./FeatureGridStore";
import { deleteFeatures } from "./api/deleteFeatures";
import { ExportAction } from "./component/ExportAction";
import type { ActionProps } from "./type";

const msgOpenTitle = gettext("Open");
const msgOpenOnNewPage = gettext("Open on a new page");
const msgDeleteTitle = gettext("Delete");
const msgEditTitle = gettext("Edit");
const msgEditOnNewPage = gettext("Edit on a new page");

const msgSearchPlaceholder = gettext("Search...");

export const FeatureGridActions = observer(
    ({
        store,
        children,
    }: {
        store: FeatureGridStore;
        children?: React.ReactNode;
    }) => {
        const {
            id,
            size,
            actions: propActions,
            readonly,
            queryParams,
            selectedIds,
            editOnNewPage,
            isExportAllowed: propIsExportAllowed,
            beforeDelete,
            deleteError,
            onDelete,
            onSave,
            onOpen,
        } = store;

        const { isExportAllowed } = useResource({ id });

        const [exportAllowed, setExportAllowed] = useState(false);

        useEffect(() => {
            const run = async () => {
                if (propIsExportAllowed) {
                    const allowed = await isExportAllowed();
                    setExportAllowed(allowed);
                }
            };
            run();
        }, [propIsExportAllowed, isExportAllowed]);

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
                    showModal(FeatureDisplayModal, {
                        featureId,
                        resourceId: id,
                    });
                }
            }
        }, [selectedIds, onOpen, id]);

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
                            <Tooltip title={!props.isFit && msgEditTitle}>
                                <Button
                                    disabled={!selectedIds.length}
                                    size={size}
                                    icon={<EditIcon />}
                                    onClick={() => {
                                        if (selectedIds.length) {
                                            const featureId = selectedIds[0];
                                            showModal(FeatureEditorModal, {
                                                editorOptions: {
                                                    featureId,
                                                    resourceId: id,
                                                    onSave: (e) => {
                                                        if (onSave) {
                                                            onSave(e);
                                                        }
                                                        store.bumpVersion();
                                                    },
                                                },
                                            });
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

        const rightActions: ActionToolbarAction<ActionProps>[] = [];
        if (exportAllowed) {
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
                <div>
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
                </div>
                {children}
            </ActionToolbar>
        );
    }
);

FeatureGridActions.displayName = "FeatureGridActions";
