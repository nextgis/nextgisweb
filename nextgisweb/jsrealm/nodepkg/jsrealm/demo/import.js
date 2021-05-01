/* entry: true */

export default async () => {
    console.log("Loading module '@nextgisweb/jsrealm/demo/aux/foo' with absolute path...");
    const foo = await import('@nextgisweb/jsrealm/demo/aux/foo');
    console.log(foo);

    console.log("Loading module '@nextgisweb/jsrealm/demo/aux/bar' with relative path...");
    const bar = await import('./aux/bar');
    console.log(bar);

    console.log("Loading entry '@nextgisweb/jsrealm/demo/aux/entry' with relative path...");
    const entry = await import('./aux/entry');
    console.log(entry);
}
