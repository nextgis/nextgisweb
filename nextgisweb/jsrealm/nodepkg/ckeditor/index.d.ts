declare module "@nextgisweb/ckeditor" {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    type Editor = import("@ckeditor/ckeditor5-editor-classic");
    const value: { Editor: Editor };
    export = value;
}
