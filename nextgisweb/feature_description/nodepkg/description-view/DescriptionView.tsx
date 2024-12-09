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
                title={
                    <>
                        <DescriptionIcon /> {gettext("Description")}
                    </>
                }
            />
            <PanelContentContainer>
                <div dangerouslySetInnerHTML={{ __html: description }} />
            </PanelContentContainer>
        </>
    );
};

DescriptionView.displayName = "DescriptionEditor";

export default DescriptionView;
