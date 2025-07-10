/** @registry */
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { ResourceCompositeAddEvent } from "../main/CreateResourceButton";

export interface EasyCreateProps {
    match: (file: File) => boolean;
    getCreator: () => Promise<
        (val: {
            file: FileMeta;
            parent: number;
        }) => Promise<ResourceCompositeAddEvent>
    >;
}

export const registry = pluginRegistry<EasyCreateProps>(MODULE_NAME);
