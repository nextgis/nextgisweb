import { route } from "@nextgisweb/pyramid/api";
import type { ResourceVolume } from "@nextgisweb/resource/type/api";

import type { ChildrenResource } from "../type";

interface LoadVoluemsParams {
    items: ChildrenResource[];
    setState: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    signal?: AbortSignal;
}

export async function loadVolumes({
    items,
    signal,
    setState,
}: LoadVoluemsParams) {
    setState({});
    for (const { id } of items) {
        const v = await route("resource.volume", id).get<ResourceVolume>({
            signal,
        });
        setState((prevState) => {
            return { ...prevState, [id]: v.volume };
        });
    }
}
