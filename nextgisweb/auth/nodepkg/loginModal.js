import { LoginOutlined } from "@ant-design/icons";
import { Form, Modal } from "@nextgisweb/gui/antd";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import LoginForm from "./login-form";
import { authStore } from "./store/authStore";

const { confirm } = Modal;

const titleMsg = i18n.gettext("Sign in to Web GIS");
const okText = i18n.gettext("Sign in");

export default function loginModal() {
    let creds = null;
    let loginConfirm = false;
    let form = null;
    const setCreds = (val) => {
        creds = val;
    };

    const okButtonProps = {
        size: "large",
        key: "submit",
        htmlType: "submit",
        icon: <LoginOutlined />,
    };

    const onOk = async () => {
        try {
            loginConfirm.update({
                okButtonProps: { ...okButtonProps, loading: true },
            });
            await form.validateFields();
            await authStore.login(creds);
            Modal.destroyAll();
            location.reload();
        } finally {
            loginConfirm.update({
                okButtonProps: { ...okButtonProps, loading: false },
            });
        }
    };

    const Content = () => {
        form = Form.useForm()[0];
        useKeydownListener("enter", () => onOk());
        return <LoginForm onChange={setCreds} form={form} />;
    };

    loginConfirm = confirm({
        icon: false,
        style: { textAlign: "center" },
        title: <h1>{titleMsg}</h1>,
        content: <Content />,
        okButtonProps,
        cancelButtonProps: { size: "large" },
        okText: okText,
        onOk,
    });

    return loginConfirm;
}
