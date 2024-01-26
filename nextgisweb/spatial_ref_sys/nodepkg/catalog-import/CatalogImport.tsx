import { useMemo, useState } from "react";

import { Button, Form } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { SRSItem } from "../type";

interface CatalogImportProps {
    url: string;
    id: number;
}

export function CatalogImport({ url, id }: CatalogImportProps) {
    const [status, setStatus] = useState<string | null>(null);

    const { data, isLoading, error } = useRouteGet<SRSItem>({
        name: "spatial_ref_sys.catalog.item",
        params: { id },
    });

    const fields = useMemo<FormField[]>(
        () => [
            {
                name: "display_name",
                label: gettext("Display name"),
                inputProps: {
                    readOnly: true,
                },
            },
            {
                name: "wkt",
                label: gettext("OGC WKT definition"),
                readOnly: true,
                widget: "text",
                rows: 4,
                style: { margin: "0" },
            },
        ],
        []
    );

    if (isLoading) {
        return <LoadingWrapper />;
    } else if (error) {
        return null;
    }

    const showSrsDetailInfo = () => {
        window.open(url, "_blank");
    };

    const importSrs = async () => {
        setStatus("importing");
        try {
            const resp = await route("spatial_ref_sys.catalog.import").post<{
                id: number;
            }>({
                json: { catalog_id: id },
            });
            window.open(routeURL("srs.edit", resp.id), "_self");
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setStatus(null);
        }
    };

    return (
        <FieldsForm fields={fields} initialValues={data}>
            <Form.Item>
                <Button
                    onClick={showSrsDetailInfo}
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                >
                    {gettext("View details")}
                </Button>
            </Form.Item>
            <Form.Item>
                <SaveButton
                    onClick={importSrs}
                    icon={null}
                    loading={status === "importing"}
                >
                    {gettext("Import")}
                </SaveButton>
            </Form.Item>
        </FieldsForm>
    );
}
