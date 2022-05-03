import { Modal } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { Form } from "@nextgisweb/gui/antd";
import LoginForm from "./login-form";
import { authStore } from "./store/authStore";

const { confirm } = Modal;

const titleMsg = i18n.gettext("Sign in to Web GIS");
const okText = i18n.gettext("Sign in");

export default function loginModal() {
    let creds = null;
    let form = null;
    const setCreds = (val) => {
        creds = val;
    };

    const onOk = async () => {
        await form.validateFields();
        await authStore.login(creds);
        location.reload();
    };

    const Content = () => {
        form = Form.useForm()[0];
        return <LoginForm onChange={setCreds} form={form} />;
    };

    return confirm({
        icon: false,
        style: { textAlign: "center" },
        title: <h1 className="auth-form__title">{titleMsg}</h1>,
        content: <Content />,
        okButtonProps: { size: "large", key: "submit", htmlType: "submit" },
        cancelButtonProps: { size: "large" },
        okText,
        onOk,
    });
}
