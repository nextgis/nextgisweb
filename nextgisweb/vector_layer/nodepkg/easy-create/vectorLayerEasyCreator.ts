import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { route } from "@nextgisweb/pyramid/api";
import type { ResourceCompositeAddEvent } from "@nextgisweb/resource/resource-section/main/CreateResourceButton";
import type { VectorLayerCreate } from "@nextgisweb/vector-layer/type/api";

export default async function vectorLayerEasyCreator({
    parent,
    file,
}: {
    file: FileMeta;
    parent: number;
}): Promise<ResourceCompositeAddEvent> {
    const vectorLayer: VectorLayerCreate = {
        source: file,
        srs: { id: 3857 },
        fix_errors: "LOSSY",
        skip_errors: true,
    };
    const displayName =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const layerResp = await route("resource.collection").post({
        json: {
            resource: {
                cls: "vector_layer",
                parent: {
                    id: parent,
                },
                display_name: displayName,
            },
            resmeta: {
                items: {},
            },
            vector_layer: vectorLayer,
        },
    });
    await route("resource.collection").post({
        json: {
            resource: {
                cls: "qgis_vector_style",
                parent: {
                    id: layerResp.id,
                },
                display_name: displayName,
            },
        },
    });

    return { cls: "vector_layer", id: layerResp.id, parent };
}
