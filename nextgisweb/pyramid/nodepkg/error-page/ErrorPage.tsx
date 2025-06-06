import { ErrorPage as GuiErrorPage } from "@nextgisweb/gui/error";
import type { ErrorInfo } from "@nextgisweb/gui/error/extractError";

export function ErrorPage({ error_json }: { error_json: ErrorInfo }) {
    return (
        <div
            id="content"
            className="ngw-pyramid-layout-crow"
            style={{
                justifyContent: "center",
                alignItems: "center",
                padding: "24px",
                backgroundColor: "#fafafa",
            }}
        >
            <GuiErrorPage error={error_json} />
        </div>
    );
}
