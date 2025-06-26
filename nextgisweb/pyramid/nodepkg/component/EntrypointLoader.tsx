import { use } from "react";

export function EntrypointLoader({
    entrypoint,
    props,
}: {
    entrypoint: string;
    props: Record<string, any>;
}) {
    const mod = use(window.ngwEntry(entrypoint));
    const Component = (mod as any).default ?? mod;
    return <Component {...props} />;
}
