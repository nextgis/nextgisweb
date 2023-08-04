declare module "@nextgisweb/ckeditor" {
    type Editor = import("@ckeditor/ckeditor5-editor-classic");
    const value: { Editor: Editor };
    export = value;
}
