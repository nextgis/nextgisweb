import type { ShowModalOptions } from "package/nextgisweb/nextgisweb/gui/nodepkg/showModal";

import { Modal } from "@nextgisweb/gui/antd";

import type { DataSource } from "../../attachment-editor/type";

import { CarouselRender } from "./CarouselRender";

import Close from "@nextgisweb/icon/material/close";

import "./CarouselModal.less";

interface CarouselModalOptions extends ShowModalOptions {
    dataSource: DataSource[];
    attachment: DataSource;
    featureId: number;
    resourceId: number;
}

export const CarouselModal = ({
    open,
    close,
    dataSource,
    attachment,
    featureId,
    resourceId,
}: CarouselModalOptions) => {
    return (
        <Modal
            rootClassName="ngw-feature-attachment-carousel-modal"
            open={open}
            footer={null}
            closeIcon={<Close />}
            onCancel={close}
            destroyOnClose
            width="100%"
        >
            <CarouselRender
                data={dataSource}
                attachment={attachment}
                resourceId={resourceId}
                featureId={featureId}
            />
        </Modal>
    );
};
