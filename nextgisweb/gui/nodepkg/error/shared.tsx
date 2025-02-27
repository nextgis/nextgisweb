import { Suspense, lazy } from "react";

import { Button, Space, Spin } from "@nextgisweb/gui/antd";
import settings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";

import { isApiError, isError } from "./util";

const CodeLazy = lazy(() => import("./CodeLazy"));

export function Body({ error }: { error: unknown }) {
    if (isApiError(error) || isError(error)) {
        return (
            <>
                <p>{error.message}</p>
                {"detail" in error && <p>{error.detail}</p>}
            </>
        );
    }
    return <>{typeof error === "string" ? error : gettext("Unknown Error")}</>;
}

export function TechInfo({ error }: { error: unknown }) {
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

export function Footer({
    tinfo,
    setTinfo,
    onOk,
}: {
    tinfo: boolean;
    setTinfo: (val: boolean) => void;
    onOk?: () => void;
}) {
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
