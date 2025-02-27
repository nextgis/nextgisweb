import { route } from "./api";

export async function fetchSettings<T>(component: string) {
    return (await route("pyramid.settings").get({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: { component: component as any },
        cache: true,
    })) as T;
}
