import type { ApiError } from "package/nextgisweb/nextgisweb/gui/nodepkg/error/type";
import { useState } from "react";

import { Button, Checkbox, Col, Row } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ResourceItem } from "../type";

import DeleteOutlineIcon from "@nextgisweb/icon/material/delete/outline";

interface DeletePageProps {
    id: number;
}

export function DeletePage({ id }: DeletePageProps) {
    const [deleteConfirmed, setDeleteConfirmed] = useState(false);
    const [deletingInProgress, setDeletingInProgress] = useState(false);

    const onDeleteClick = async () => {
        setDeletingInProgress(true);
        try {
            const item = await route("resource.item", id).get<ResourceItem>();
            const parentId = item.resource.parent.id;
            const parentResourceUrl = routeURL("resource.show", {
                id: parentId,
            });
            await route("resource.item", id).delete();
            window.open(parentResourceUrl, "_self");
        } catch (err) {
            errorModal(err as ApiError);
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
                        {gettext("Confirm deletion of the resource")}
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
                        {gettext("Delete")}
                    </Button>
                </Col>
            </Row>
        </>
    );
}
