import ArrowBack from "@material-icons/svg/arrow_back";
import CreateNewFolder from "@material-icons/svg/create_new_folder";
import DoneIcon from "@material-icons/svg/done";
import HighlightOff from "@material-icons/svg/highlight_off";
import { Button, Col, Input, Row, Space, Tooltip } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { observer } from "mobx-react-lite";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

const createNewFolderTitle = i18n.gettext("New folder");
const moveToThisFolderTitle = i18n.gettext("Move to this folder");
const moveToSelectedFolderTitle = i18n.gettext("Move");
const cleanSelectionTitle = i18n.gettext("Clean selection");

export const ResourcePickerModalFooter = observer(({ resourceStore, onOk }) => {
    const {
        selected,
        parentId,
        initialParentId,
        createNewFolderLoading,
        allowCreateResource,
        childrenLoading,
    } = resourceStore;

    const [createMode, setCreateMode] = useState(false);
    const [newFolderName, setNewFolderName] = useState();

    const onCreateClick = () => {
        resourceStore.cleanSelection();
        setCreateMode(true);
    };

    const onSave = async () => {
        try {
            await resourceStore.createNewFolder(newFolderName);
            setCreateMode(false);
        } catch (er) {
            errorModal(er);
        }
    };

    useEffect(() => {
        resourceStore.setAllowSelection(!createMode);
        resourceStore.setAllowMoveInside(!createMode);
    }, [createMode]);

    return (
        <>
            {createMode ? (
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
                                onChange={(e) => {
                                    setNewFolderName(e.target.value);
                                }}
                            />
                            <Button
                                type="primary"
                                icon={<DoneIcon />}
                                loading={childrenLoading}
                                disabled={!newFolderName}
                                onClick={onSave}
                            ></Button>
                        </Col>
                    </Row>
                </Input.Group>
            ) : (
                <Row justify="space-between">
                    <Col>
                        {allowCreateResource && !createNewFolderLoading && (
                            <Tooltip title={createNewFolderTitle}>
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
                                <Tooltip title={cleanSelectionTitle}>
                                    <Button
                                        icon={<HighlightOff />}
                                        onClick={() => {
                                            resourceStore.cleanSelection();
                                        }}
                                    ></Button>
                                </Tooltip>
                                <Button
                                    style={{ width: "200px" }}
                                    color="primary"
                                    disabled={!selected.length}
                                    onClick={() => onOk(selected[0])}
                                >
                                    {moveToSelectedFolderTitle}
                                </Button>
                            </Space>
                        ) : (
                            <Button
                                style={{ width: "200px" }}
                                color="primary"
                                onClick={() => onOk(parentId)}
                                disabled={parentId === initialParentId}
                            >
                                {moveToThisFolderTitle}
                            </Button>
                        )}
                    </Col>
                </Row>
            )}
        </>
    );
});

ResourcePickerModalFooter.propTypes = {
    allowCreateResourceBtn: PropTypes.bool,
    onOk: PropTypes.func,
};
