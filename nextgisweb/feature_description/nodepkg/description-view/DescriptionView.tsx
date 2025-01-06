import { gettext } from "@nextgisweb/pyramid/i18n";
import { PanelContentContainer } from "@nextgisweb/webmap/panel/identification/PanelContentContainer";
import type { IdentifyExtensionComponentProps } from "@nextgisweb/webmap/panel/identification/identification";

import DescriptionIcon from "@nextgisweb/icon/material/description/outline";

import "@nextgisweb/webmap/panel/identification/PanelContentContainer.less";

const DescriptionView = ({ featureItem }: IdentifyExtensionComponentProps) => {
    if (!featureItem.extensions || !featureItem.extensions["description"]) {
        return null;
    }

    const description = featureItem.extensions["description"];

    return (
        <>
            <PanelContentContainer
                icon={<DescriptionIcon />}
                title={gettext("Description")}
                marginAll
                content={
                    <div dangerouslySetInnerHTML={{ __html: description }} />
                }
            />
        </>
    );
};

DescriptionView.displayName = "DescriptionEditor";

export default DescriptionView;
