import type { ModalBrowseData } from "@nextgisweb/gui/model-browse/ModelBrowse";

export interface UserBrowseData extends ModalBrowseData {
    disabled?: boolean;
    system?: boolean;
}
