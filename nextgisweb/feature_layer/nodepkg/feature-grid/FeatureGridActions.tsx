import { useCallback } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type { ActionToolbarAction } from "@nextgisweb/gui/action-toolbar";
import { Button, Input, Space, Tooltip } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import { confirmDelete } from "@nextgisweb/gui/confirm";
import showModal from "@nextgisweb/gui/showModal";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useResource } from "@nextgisweb/resource/hook/useResource";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import { FeatureEditorModal } from "../feature-editor-modal";

import type { ActionProps } from "./FeatureGrid";
import { deleteFeatures } from "./api/deleteFeatures";
import { ExportAction } from "./component/ExportAction";
import { KEY_FIELD_KEYNAME } from "./constant";
import type { FeatureAttrs } from "./type";

import DeleteIcon from "@nextgisweb/icon/material/delete";
import EditInNewpageIcon from "@nextgisweb/icon/material/launch";
import OpenIcon from "@nextgisweb/icon/material/open_in_new";

const msgOpenTitle = gettext("Open");
const msgDeleteTitle = gettext("Delete");
const msgEditTitle = gettext("Edit");
const msgEditOnNewPage = gettext("Edit on a new page");

export interface FeatureGridActionsProps {
    id: number;
    size?: SizeType;
    query: string;
    actions: ActionToolbarAction<ActionProps>[];
    readonly?: boolean;
    selected: FeatureAttrs[];
    children?: React.ReactNode;
    editOnNewPage?: boolean;
    beforeDelete?: (featureIds: number[]) => void;
    refreshTotal: () => Promise<void>;
    deleteError?: (featureIds: number[]) => void;
    setSelected: React.Dispatch<React.SetStateAction<FeatureAttrs[]>>;
    onDelete?: (featureIds: number[]) => void;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    onSave?: (value: ResourceItem | undefined) => void;
}

const msgSearchPlaceholder = gettext("Search...");

export const FeatureGridActions = ({
    id,
    size,
    query,
    actions: propActions,
    readonly,
    selected,
    children,
    editOnNewPage,
    beforeDelete,
    refreshTotal,
    deleteError,
    setSelected,
    onDelete,
    setQuery,
    onSave,
}: FeatureGridActionsProps) => {
    const { isExportAllowed } = useResource({ id });

    const goTo = useCallback(
        (
            path: "feature_layer.feature.update" | "feature_layer.feature.show"
        ) => {
            const first = selected[0];
            if (first) {
                const featureId = first[KEY_FIELD_KEYNAME] as number;
                window.open(routeURL(path, { id, feature_id: featureId }));
            }
        },
        [id, selected]
    );

    const handleDelete = useCallback(async () => {
        const featureIds = selected.map(
            (s) => s[KEY_FIELD_KEYNAME]
        ) as number[];
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
        } catch (er) {
            if (deleteError) {
                deleteError(featureIds);
            }
        }
        await refreshTotal();
        setSelected([]);
    }, [
        beforeDelete,
        refreshTotal,
        setSelected,
        deleteError,
        onDelete,
        selected,
        id,
    ]);

    const defActions: ActionToolbarAction<ActionProps>[] = [
        {
            onClick: () => {
                goTo("feature_layer.feature.show");
            },
            icon: <OpenIcon />,
            title: msgOpenTitle,
            disabled: !selected.length,
            size,
        },
    ];

    if (!readonly) {
        defActions.push(
            ...[
                <Space.Compact key="feature-item-edit">
                    <Button
                        disabled={!selected.length}
                        size={size}
                        onClick={() => {
                            const first = selected[0];
                            if (first) {
                                const featureId = first[
                                    KEY_FIELD_KEYNAME
                                ] as number;
                                showModal(FeatureEditorModal, {
                                    editorOptions: {
                                        featureId,
                                        resourceId: id,
                                        onSave: (e) => {
                                            if (onSave) {
                                                onSave(e);
                                            }

                                        },
                                    },
                                });
                            }
                        }}
                    >
                        {msgEditTitle}
                    </Button>
                    {editOnNewPage && (
                        <Tooltip title={msgEditOnNewPage} key="leftButton">
                            <Button
                                disabled={!selected.length}
                                size={size}
                                onClick={() => {
                                    goTo("feature_layer.feature.update");
                                }}
                                icon={<EditInNewpageIcon />}
                            ></Button>
                        </Tooltip>
                    )}
                </Space.Compact>,
                {
                    onClick: () => {
                        confirmDelete({ onOk: handleDelete });
                    },
                    icon: <DeleteIcon />,
                    title: msgDeleteTitle,
                    danger: true,
                    disabled: !selected.length,
                    size,
                },
            ]
        );
    }

    const rightActions: ActionToolbarAction<ActionProps>[] = [];
    if (isExportAllowed) {
        rightActions.push((props) => <ExportAction {...props} />);
    }

    const actionProps: ActionProps = { selected, query, id };

    return (
        <ActionToolbar
            size={size}
            actions={[...defActions, ...propActions]}
            rightActions={rightActions}
            actionProps={actionProps}
        >
            <div>
                <Input
                    placeholder={msgSearchPlaceholder}
                    onChange={(e) => setQuery(e.target.value)}
                    allowClear
                    size={size}
                />
            </div>
            {children}
        </ActionToolbar>
    );
};
