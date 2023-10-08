import type { InputRef } from "antd/lib/input/Input";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button, Col, Input, Row, Space, Tooltip } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import usePickerCard from "./hook/usePickerCard";
import type { ResourcePickerStore } from "./store/ResourcePickerStore";
import type { ResourcePickerFooterProps, SelectValue } from "./type";

import ArrowBack from "@nextgisweb/icon/material/arrow_back";
import CreateNewFolder from "@nextgisweb/icon/material/create_new_folder";
import DoneIcon from "@nextgisweb/icon/material/done";
import HighlightOff from "@nextgisweb/icon/material/highlight_off";

interface CreateControlProps {
    resourceStore: ResourcePickerStore;
    setCreateMode?: (val: boolean) => void;
}

interface MoveControlProps<V extends SelectValue = SelectValue> {
    resourceStore: ResourcePickerStore;
    setCreateMode?: (val: boolean) => void;
    onOk?: (val: V) => void;
}

const msgCreateGroup = gettext("Create group");
const msgClearSelection = gettext("Clear selection");

const CreateControl = observer(
    ({ setCreateMode, resourceStore }: CreateControlProps) => {
        const { resourcesLoading } = resourceStore;
        const resourceNameInput = useRef<InputRef>(null);

        const [resourceName, setResourceName] = useState<string>();

        const onSave = async () => {
            try {
                if (resourceName) {
                    await resourceStore.createNewGroup(resourceName);
                    if (setCreateMode) {
                        setCreateMode(false);
                    }
                }
            } catch (er) {
                errorModal(er as ApiError);
            }
        };

        useKeydownListener("enter", () => {
            onSave();
        });

        useEffect(() => {
            const input = resourceNameInput.current;
            if (input) {
                input.focus();
            }
        }, []);

        return (
            <Space.Compact>
                <Row>
                    <Col>
                        <Button
                            icon={<ArrowBack />}
                            onClick={() => {
                                if (setCreateMode) {
                                    setCreateMode(false);
                                }
                            }}
                        />
                    </Col>
                    <Col flex="auto">
                        <Input
                            value={resourceName}
                            onChange={(e) => {
                                setResourceName(e.target.value);
                            }}
                            ref={resourceNameInput}
                        />
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            icon={<DoneIcon />}
                            loading={resourcesLoading}
                            disabled={!resourceName}
                            onClick={onSave}
                        />
                    </Col>
                </Row>
            </Space.Compact>
        );
    }
);

const MoveControlInner = <V extends SelectValue = SelectValue>({
    setCreateMode,
    resourceStore,
    onOk,
}: MoveControlProps<V>) => {
    const {
        selected,
        parentId,
        multiple,
        parentItem,
        getThisMsg,
        getSelectedMsg,
        getResourceClasses,
        disableResourceIds,
        allowCreateResource,
        createNewGroupLoading,
    } = resourceStore;

    const { getCheckboxProps } = usePickerCard({ resourceStore });

    const pickThisGroupAllowed = useMemo(() => {
        if (parentItem) {
            const { disabled } = getCheckboxProps(parentItem.resource);
            return !disabled;
        }
        return false;
    }, [getCheckboxProps, parentItem]);

    const possibleToCreate = useMemo(() => {
        if (parentItem) {
            return getResourceClasses([parentItem.resource.cls]).includes(
                "resource_group"
            );
        }
        return false;
    }, [getResourceClasses, parentItem]);

    const onCreateClick = () => {
        resourceStore.clearSelection();
        if (setCreateMode) {
            setCreateMode(true);
        }
    };

    const OkBtn = ({ disabled }: { disabled?: boolean }) => {
        return (
            <Button
                type="primary"
                disabled={disabled ?? !selected.length}
                onClick={() => {
                    if (onOk) {
                        onOk((multiple ? selected : selected[0]) as V);
                    }
                }}
            >
                {getSelectedMsg}
            </Button>
        );
    };

    return (
        <Row justify="space-between">
            <Col>
                {allowCreateResource &&
                    possibleToCreate &&
                    !createNewGroupLoading && (
                        <Tooltip title={msgCreateGroup}>
                            <a
                                style={{ fontSize: "1.5rem" }}
                                onClick={onCreateClick}
                            >
                                <CreateNewFolder />
                            </a>
                        </Tooltip>
                    )}
            </Col>
            <Col>
                {selected.length ? (
                    <Space>
                        <Tooltip title={msgClearSelection}>
                            <Button
                                icon={<HighlightOff />}
                                onClick={() => {
                                    resourceStore.clearSelection();
                                }}
                            ></Button>
                        </Tooltip>
                        <OkBtn />
                    </Space>
                ) : pickThisGroupAllowed ? (
                    <Button
                        type="primary"
                        onClick={() => {
                            if (onOk) {
                                const toSelect = multiple
                                    ? [parentId]
                                    : parentId;
                                onOk(toSelect as V);
                            }
                        }}
                        disabled={disableResourceIds.includes(parentId)}
                    >
                        {getThisMsg}
                    </Button>
                ) : (
                    <OkBtn disabled={true}></OkBtn>
                )}
            </Col>
        </Row>
    );
};

const MoveControl = observer(MoveControlInner);

const ResourcePickerFooterInner = <V extends SelectValue = SelectValue>({
    resourceStore,
    onOk,
    ...props
}: ResourcePickerFooterProps<V>) => {
    const [createMode, setCreateMode] = useState(false);

    return (
        <>
            {createMode ? (
                <CreateControl {...{ resourceStore, setCreateMode }} />
            ) : (
                <MoveControl
                    {...{ resourceStore, setCreateMode, onOk, ...props }}
                />
            )}
        </>
    );
};

export const ResourcePickerFooter = observer(ResourcePickerFooterInner);
