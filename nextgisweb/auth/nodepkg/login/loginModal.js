import { Modal } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";

import { LoginForm } from "./LoginForm";

const LoginModal = (props) => {
    return (
        <Modal footer={null} width="350px" {...props}>
            <LoginForm reloadAfterLogin />
        </Modal>
    );
};

export function loginModal() {
    const onCancel = () => {
        modal.destroy();
    };
    const modal = showModal(LoginModal, { onCancel });
    return modal;
}
