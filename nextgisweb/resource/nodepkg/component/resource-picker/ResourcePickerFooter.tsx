import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, Button, Col, Input, Row, Space } from "@nextgisweb/gui/antd";
import type { InputRef } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import usePickerCard from "./hook/usePickerCard";
import type { ResourcePickerStore } from "./store/ResourcePickerStore";
import type { ResourcePickerFooterProps, SelectValue } from "./type";

import ArrowBack from "@nextgisweb/icon/material/arrow_back";
import HighlightOff from "@nextgisweb/icon/material/cancel";
import DoneIcon from "@nextgisweb/icon/material/check";
import CreateNewFolder from "@nextgisweb/icon/material/create_new_folder";

interface CreateControlProps {
    store: ResourcePickerStore;
    setCreateMode?: (val: boolean) => void;
}

interface MoveControlProps<V extends SelectValue = SelectValue> {
    store: ResourcePickerStore;
    setCreateMode?: (val: boolean) => void;
    onOk?: (val: V) => void;
}

const msgCreateGroup = gettext("Create group");
const msgClearSelection = gettext("Clear selection");

const CreateControl = observer(
    ({ setCreateMode, store }: CreateControlProps) => {
        const { loading } = store;
        const resourceNameInput = useRef<InputRef>(null);

        const [resourceName, setResourceName] = useState<string>();

        const onSave = async () => {
            try {
                if (resourceName) {
                    await store.createNewGroup(resourceName);
                    if (setCreateMode) {
                        setCreateMode(false);
                    }
                }
            } catch (err) {
                errorModal(err);
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
            <Space.Compact block>
                <Button
                    icon={<ArrowBack />}
                    onClick={() => {
                        if (setCreateMode) {
                            setCreateMode(false);
                        }
                    }}
                />
                <Input
                    value={resourceName}
                    onChange={(e) => {
                        setResourceName(e.target.value);
                    }}
                    ref={resourceNameInput}
                />
                <Button
                    type="primary"
                    icon={<DoneIcon />}
                    loading={loading.setChildrenFor}
                    disabled={!resourceName}
                    onClick={onSave}
                />
            </Space.Compact>
        );
    }
);

CreateControl.displayName = "CreateControl";

function MoveControlInner<V extends SelectValue = SelectValue>({
    setCreateMode,
    store,
    onOk,
}: MoveControlProps<V>) {
    const {
        loading,
        selected,
        parentId,
        multiple,
        parentItem,
        getThisMsg,
        getSelectedMsg,
        getResourceClasses,
        disableResourceIds,
        allowCreateResource,
    } = store;

    const { getCheckboxProps } = usePickerCard({ store });

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
        store.clearSelection();
        if (setCreateMode) {
            setCreateMode(true);
        }
    };

    const OkBtn = ({ disabled }: { disabled?: boolean }) => {
        const badgeCnt = multiple && selected.length > 1 ? selected.length : 0;
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
                {!!badgeCnt && (
                    <Badge size="small" color="transparent" count={badgeCnt} />
                )}
            </Button>
        );
    };

    return (
        <Row justify="space-between">
            <Col>
                {allowCreateResource &&
                    possibleToCreate &&
                    !loading.createNewGroup && (
                        <a
                            style={{ fontSize: "1.5rem" }}
                            onClick={onCreateClick}
                            title={msgCreateGroup}
                        >
                            <CreateNewFolder />
                        </a>
                    )}
            </Col>
            <Col>
                {selected.length ? (
                    <Space>
                        <Button
                            icon={<HighlightOff />}
                            title={msgClearSelection}
                            onClick={() => {
                                store.clearSelection();
                            }}
                        ></Button>
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
}

const MoveControl = observer(MoveControlInner);
MoveControl.displayName = "MoveControl";

const ResourcePickerFooterInner = <V extends SelectValue = SelectValue>({
    store,
    onOk,
    ...props
}: ResourcePickerFooterProps<V>) => {
    const [createMode, setCreateMode] = useState(false);

    return (
        <>
            {createMode ? (
                <CreateControl store={store} setCreateMode={setCreateMode} />
            ) : (
                <MoveControl
                    store={store}
                    setCreateMode={setCreateMode}
                    onOk={onOk}
                    {...props}
                />
            )}
        </>
    );
};

export const ResourcePickerFooter = observer(ResourcePickerFooterInner);
ResourcePickerFooter.displayName = "ResourcePickerFooter";
