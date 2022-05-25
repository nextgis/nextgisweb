import { Button } from "@nextgisweb/gui/antd";
import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import { routeURL } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/settings!spatial_ref_sys";
import i18n from "@nextgisweb/pyramid/i18n!";
import getMessages from "../srsMessages";
import { modelObj } from "../srsModel";

export function SrsBrowse() {
    const columns = [
        {
            title: i18n.gettext("Display name"),
            dataIndex: "display_name",
            key: "display_name",
            sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
        },
    ];

    const headerControls = [];

    if (settings.catalog.enabled) {
        headerControls.push(({ selected, rows, setRows }) => {
            const importFromCatalog = () => {
                const url = routeURL("srs.catalog");
                window.open(url, "_self");
            };
            return (
                <Button onClick={importFromCatalog}>
                    {i18n.gettext("Import from catalog")}
                </Button>
            );
        });
    }

    return (
        <ModelBrowse
            model={modelObj}
            columns={columns}
            messages={getMessages()}
            itemProps={{ canDelete: ({ item }) => !item.system }}
            headerControls={headerControls}
        />
    );
}
