import ArrowBack from "@material-icons/svg/arrow_back";
import CreateNewFolder from "@material-icons/svg/create_new_folder";
import DoneIcon from "@material-icons/svg/done";
import HighlightOff from "@material-icons/svg/highlight_off";
import { Button, Col, Input, Row, Space, Tooltip } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { observer } from "mobx-react-lite";
import { PropTypes } from "prop-types";
import { useState, useRef, useEffect } from "react";

const createNewGroupTitle = i18n.gettext("Create group");
const moveToThisGroupTitle = i18n.gettext("Move to this group");
const moveToSelectedGroupTitle = i18n.gettext("Move to selected group");
const clearSelectionTitle = i18n.gettext("Clear selection");

const CreateControl = observer(({ setCreateMode, resourceStore }) => {
    const { childrenLoading } = resourceStore;
    const resourceNameInput = useRef(null);

    const [resourceName, setResourceName] = useState();

    useKeydownListener("enter", () => {
        onSave();
    });

    useEffect(() => {
        const input = resourceNameInput.current;
        if (input) {
            input.focus();
        }
    }, []);

    const onSave = async () => {
        try {
            if (resourceName) {
                await resourceStore.createNewGroup(resourceName);
                setCreateMode(false);
            }
        } catch (er) {
            errorModal(er);
        }
    };

    return (
        <Input.Group>
            <Row>
                <Col>
                    <Button
                        icon={<ArrowBack />}
                        onClick={() => setCreateMode(false)}
                    ></Button>
                </Col>
                <Col flex="auto">
                    <Input
                        style={{ width: "calc(100% - 40px)" }}
                        value={resourceName}
                        onChange={(e) => {
                            setResourceName(e.target.value);
                        }}
                        ref={resourceNameInput}
                    />
                    <Button
                        type="primary"
                        icon={<DoneIcon />}
                        loading={childrenLoading}
                        disabled={!resourceName}
                        onClick={onSave}
                    ></Button>
                </Col>
            </Row>
        </Input.Group>
    );
});

const MoveControl = observer(({ setCreateMode, resourceStore, onOk }) => {
    const {
        selected,
        parentId,
        disabledIds,
        allowCreateResource,
        createNewGroupLoading,
    } = resourceStore;

    const onCreateClick = () => {
        resourceStore.clearSelection();
        setCreateMode(true);
    };

    return (
        <Row justify="space-between" >
            <Col>
                {allowCreateResource && !createNewGroupLoading && (
                    <Tooltip title={createNewGroupTitle}>
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
                        <Tooltip title={clearSelectionTitle}>
                            <Button
                                icon={<HighlightOff />}
                                onClick={() => {
                                    resourceStore.clearSelection();
                                }}
                            ></Button>
                        </Tooltip>
                        <Button
                            type="primary"
                            disabled={!selected.length}
                            onClick={() => onOk(selected[0])}
                        >
                            {moveToSelectedGroupTitle}
                        </Button>
                    </Space>
                ) : (
                    <Button
                        type="primary"
                        onClick={() => onOk(parentId)}
                        disabled={disabledIds.includes(parentId)}
                    >
                        {moveToThisGroupTitle}
                    </Button>
                )}
            </Col>
        </Row>
    );
});

export const ResourcePickerModalFooter = observer(({ resourceStore, onOk }) => {
    const [createMode, setCreateMode] = useState(false);

    return (
        <>
            {createMode ? (
                <CreateControl {...{ resourceStore, setCreateMode }} />
            ) : (
                <MoveControl {...{ resourceStore, setCreateMode, onOk }} />
            )}
        </>
    );
});

ResourcePickerModalFooter.propTypes = {
    resourceStore: PropTypes.object,
    onOk: PropTypes.func,
};
