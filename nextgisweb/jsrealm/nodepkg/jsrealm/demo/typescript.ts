/* entry: true */
interface Foo {
    some: number;
    other: string;
}

export default async () => {
    let x: Foo = { some: 1, other: "text" };
    alert(x.other);
}