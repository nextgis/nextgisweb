import { Modal } from "@nextgisweb/gui/antd";
import { CloseIcon } from "@nextgisweb/gui/icon";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

import type { DataSource } from "../../attachment-editor/type";

import { CarouselRender } from "./CarouselRender";

import "./CarouselModal.less";

interface CarouselModalOptions extends ShowModalOptions {
    dataSource: DataSource[];
    attachment: DataSource;
    featureId: number | null;
    resourceId: number;
}

export function CarouselModal({
    open,
    close,
    dataSource,
    attachment,
    featureId,
    resourceId,
}: CarouselModalOptions) {
    return (
        <Modal
            rootClassName="ngw-feature-attachment-carousel-modal"
            open={open}
            footer={null}
            closeIcon={<CloseIcon />}
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
}
