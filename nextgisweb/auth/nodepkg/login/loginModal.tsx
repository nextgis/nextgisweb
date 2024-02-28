import { Modal } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

import { LoginForm } from "./LoginForm";

const LoginModal = (props: ShowModalOptions) => {
    return (
        <Modal footer={null} width="350px" {...props}>
            <LoginForm reloadAfterLogin />
        </Modal>
    );
};

export function loginModal() {
    const modal = showModal(LoginModal, {
        onCancel: () => {
            modal.destroy();
        },
    });
    return modal;
}
