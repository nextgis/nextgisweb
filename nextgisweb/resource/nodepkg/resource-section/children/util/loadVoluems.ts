import { route } from "@nextgisweb/pyramid/api";
import type {
    ResourceChildItem,
    ResourceVolume,
} from "@nextgisweb/resource/type/api";

interface LoadVoluemsParams {
    data: ResourceChildItem[];
    setState: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    signal?: AbortSignal;
}

export async function loadVolumes({
    data,
    signal,
    setState,
}: LoadVoluemsParams) {
    setState({});
    for (const { id } of data) {
        const v = await route("resource.volume", id).get<ResourceVolume>({
            signal,
        });
        setState((prevState) => {
            return { ...prevState, [id]: v.volume };
        });
    }
}
