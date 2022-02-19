import { lazy, Suspense } from "react";
import { Button, Space, Spin } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!gui";
import settings from "@nextgisweb/pyramid/settings!pyramid";

const CodeLazy = lazy(() => import("./CodeLazy"));

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
                <Suspense
                    fallback={
                        <div
                            style={{
                                display: "flex",
                                height: "150px",
                                justifyContent: "center",
                                alignContent: "center",
                                flexDirection: "column",
                            }}
                        >
                            <Spin delay={250} />
                        </div>
                    }
                >
                    <CodeLazy
                        value={JSON.stringify(error, null, 4)}
                        lang="json"
                        readOnly
                        lineNumbers
                        autoHeight
                        minHeight="150px"
                        maxHeight="300px"
                    />
                </Suspense>
            )}
        </>
    );
}

export function Footer({ tinfoState, onOk }) {
    const [tinfoVisible, setTinfoVisible] = tinfoState;
    return (
        <div style={{ display: "flex", marginTop: "1em" }}>
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
