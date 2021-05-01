/* entrypoint: true */
export default async () => {
    console.log("Loading module '@nextgisweb/jsrealm/demo/aux/foo' with absolute path...");
    const foo = await import('@nextgisweb/jsrealm/demo/aux/foo');
    console.log(foo);

    console.log("Loading module '@nextgisweb/jsrealm/demo/aux/bar' with relative path...");
    const bar = await import('./aux/bar');
    console.log(bar);

    console.log("Loading entrypoint '@nextgisweb/jsrealm/demo/aux/entrypoint' with relative path...");
    const entrypoint = await import('./aux/entrypoint');
    console.log(entrypoint);
}
