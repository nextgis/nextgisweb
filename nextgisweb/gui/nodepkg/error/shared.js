import { Suspense, lazy } from "react";

import { Button, Space, Spin } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";
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

export function TechInfo({ error }) {
    return (
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
    );
}

export function Footer({ tinfo, setTinfo, onOk }) {
    return (
        <div style={{ display: "flex", marginTop: "1em" }}>
            {tinfo || (
                <Button onClick={() => setTinfo(true)}>
                    {gettext("Technical information")}
                </Button>
            )}
            <Space style={{ marginLeft: "auto" }} direction="horizontal">
                {settings.support_url && (
                    <Button
                        type="link"
                        href={url(settings.support_url)}
                        target="_blank"
                    >
                        {gettext("Contact support")}
                    </Button>
                )}
                {onOk ? (
                    <Button type="primary" onClick={onOk}>
                        {gettext("OK")}
                    </Button>
                ) : (
                    <Button type="primary" href={ngwConfig.applicationUrl}>
                        {gettext("Back to home")}
                    </Button>
                )}
            </Space>
        </div>
    );
}
