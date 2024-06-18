import { route } from "@nextgisweb/pyramid/api";

export async function getConnectionResource({ id }: { id: number }) {
    const res = await route("resource.item", id).get({
        cache: true,
    });

    if (res.resource.parent && res.resource.parent.id !== undefined) {
        return {
            id: id,
            parent: { id: res.resource.parent.id },
        };
    }
}
