import { route } from "./api";

export async function fetchSettings<T>(component: string) {
    return (await route("pyramid.settings").get({
        query: { component: component as any },
        cache: true,
    })) as T;
}
