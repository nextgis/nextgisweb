import { Button, Space } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!gui";
import settings from "@nextgisweb/pyramid/settings!pyramid";

export function Body({ error }) {
    return (
        <>
            <p>{error.message}</p>
            {error.detail && <p>{error.detail}</p>}
        </>
    );
}

export function TechInfo({ state, error }) {
    const [tinfoVisible, setTinfoVisible] = state;
    return (
        <>
            {tinfoVisible && (
                <pre>
                    <code>{JSON.stringify(error, null, 4)}</code>
                </pre>
            )}
        </>
    );
}

export function Footer({ tinfoState, onOk }) {
    const [tinfoVisible, setTinfoVisible] = tinfoState;
    return (
        <div style={{ display: "flex" }}>
            {tinfoVisible || (
                <Button onClick={() => setTinfoVisible(true)}>
                    {i18n.gettext("Technical information")}
                </Button>
            )}
            <Space style={{ marginLeft: "auto" }} direction="horizontal">
                <Button
                    type="link"
                    href={settings["support_url"]}
                    target="_blank"
                >
                    {i18n.gettext("Contact support")}
                </Button>
                {onOk ? (
                    <Button type="primary" onClick={onOk}>
                        {i18n.gettext("OK")}
                    </Button>
                ) : (
                    <Button type="primary" href={ngwConfig.applicationUrl}>
                        {i18n.gettext("Back to home")}
                    </Button>
                )}
            </Space>
        </div>
    );
}
