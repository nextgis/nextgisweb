/** @entrypoint */
export default async () => {
    console.log("Loading './aux/foo' with absolute path...");
    const foo = await import("@nextgisweb/pyramid/example/aux/foo");
    console.log(foo);

    console.log("Loading '/aux/bar' with relative path...");
    const bar = await import("./aux/bar");
    console.log(bar);

    console.log("Loading entrypoint './aux/entrypoint' with relative path...");
    const entrypoint = await import("./aux/entrypoint");
    console.log(entrypoint);
};
