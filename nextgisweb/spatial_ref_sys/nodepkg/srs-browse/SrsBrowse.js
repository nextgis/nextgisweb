import { Button } from "@nextgisweb/gui/antd";
import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import i18n from "@nextgisweb/pyramid/i18n!";
import getMessages from "../srsMessages";
import { modelObj } from "../srsModel";

export function SrsBrowse() {
    const columns = [
        {
            title: i18n.gettext("SRS name"),
            dataIndex: "display_name",
            key: "display_name",
            sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
        },
    ];

    const headerControls = [
        ({ selected, rows, setRows }) => {
            const onAddFromCatalogClick = () => {
                console.log("click", selected, rows);
            };
            return (
                <Button onClick={onAddFromCatalogClick}>
                    {i18n.gettext("Add from catalog")}
                </Button>
            );
        },
    ];

    return (
        <ModelBrowse
            model={modelObj}
            columns={columns}
            messages={getMessages()}
            itemProps={{ canDelete: ({ item }) => item.disabled }}
            headerControls={headerControls}
        />
    );
}
