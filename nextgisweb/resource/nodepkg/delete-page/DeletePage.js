import DeleteOutlineIcon from "@material-icons/svg/delete/outline";
import { Button, Checkbox, Col, Row } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { errorModal } from "@nextgisweb/gui/error";
import { useState } from "react";
import { route, routeURL } from "@nextgisweb/pyramid/api";

export function DeletePage({ id }) {
    const [deleteConfirmed, setDeleteConfirmed] = useState(false);
    const [deletingInProgress, setDeletingInProgress] = useState(false);

    const onDeleteClick = async () => {
        setDeletingInProgress(true);
        try {
            const item = await route("resource.item", id).get();
            const parentId = item.resource.parent.id;
            const parentResourceUrl = routeURL("resource.show", {
                id: parentId,
            });
            await route("resource.item", id).delete();
            window.open(parentResourceUrl, "_self");
        } catch (err) {
            errorModal(err);
        } finally {
            setDeletingInProgress(false);
        }
    };

    return (
        <>
            <Row style={{ marginBottom: "3rem" }}>
                <Col>
                    <Checkbox
                        onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    >
                        {i18n.gettext("Confirm deletion of the resource")}
                    </Checkbox>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Button
                        loading={deletingInProgress}
                        disabled={!deleteConfirmed}
                        type="primary"
                        icon={<DeleteOutlineIcon />}
                        onClick={onDeleteClick}
                    >
                        {i18n.gettext("Delete")}
                    </Button>
                </Col>
            </Row>
        </>
    );
}
