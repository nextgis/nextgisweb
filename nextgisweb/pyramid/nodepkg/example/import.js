/** @entrypoint */
export default async () => {
    console.log("Loading module '@nextgisweb/pyramid/example/aux/foo' with absolute path...");
    const foo = await import('@nextgisweb/pyramid/example/aux/foo');
    console.log(foo);

    console.log("Loading module '@nextgisweb/pyramid/example/aux/bar' with relative path...");
    const bar = await import('./aux/bar');
    console.log(bar);

    console.log("Loading entrypoint '@nextgisweb/pyramid/example/aux/entrypoint' with relative path...");
    const entrypoint = await import('./aux/entrypoint');
    console.log(entrypoint);
}
