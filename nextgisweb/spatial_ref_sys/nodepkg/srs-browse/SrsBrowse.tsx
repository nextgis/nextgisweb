import { Button } from "@nextgisweb/gui/antd";
import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

import getMessages from "../srsMessages";
import { modelObj } from "../srsModel";

interface SrsBrowseProps {
    readonly: boolean;
}

export function SrsBrowse({ readonly }: SrsBrowseProps) {
    const headerControls = [];

    if (settings.catalog.enabled) {
        headerControls.push(() => {
            const importFromCatalog = () => {
                const url = routeURL("srs.catalog");
                window.open(url, "_self");
            };
            return (
                <Button onClick={importFromCatalog}>
                    {gettext("Import from catalog")}
                </Button>
            );
        });
    }

    return (
        <ModelBrowse<SRSRead>
            model={modelObj}
            readonly={readonly}
            columns={[
                {
                    title: gettext("Display name"),
                    dataIndex: "display_name",
                    key: "display_name",
                    sorter: (a, b) =>
                        a.display_name > b.display_name ? 1 : -1,
                },
            ]}
            messages={getMessages()}
            itemProps={{ canDelete: ({ item }) => !item.system }}
            headerControls={headerControls}
        />
    );
}
