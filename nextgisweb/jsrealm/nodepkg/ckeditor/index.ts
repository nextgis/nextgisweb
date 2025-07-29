import {
    Autoformat,
    Base64UploadAdapter,
    BlockQuote,
    Bold,
    ClassicEditor,
    Essentials,
    GeneralHtmlSupport,
    Heading,
    Image,
    ImageCaption,
    ImageInsert,
    ImageStyle,
    ImageToolbar,
    ImageUpload,
    Indent,
    Italic,
    Link,
    List,
    Paragraph,
    PasteFromOffice,
    PictureEditing,
    SourceEditing,
    Strikethrough,
    Table,
    TableToolbar,
    TextTransformation,
    Underline,
} from "ckeditor5";
import type { ArrayOrItem, EditorConfig, Translations } from "ckeditor5";

import "ckeditor5/ckeditor5.css";
import "./index.less";

const locale = ngwConfig.locale || "en";
let translationBundles: ArrayOrItem<Translations> | undefined = undefined;

if (locale !== "en") {
    try {
        const coreTranslations = await import(
            `ckeditor5/translations/${locale}.js`
        );
        translationBundles = [coreTranslations.default];
    } catch {
        console.log(`CKEditor: Translation uavailable for '${locale}'`);
    }
}

export class Editor extends ClassicEditor {
    constructor(element: HTMLElement | string, config: EditorConfig = {}) {
        config = {
            language: locale,
            translations: translationBundles,
            plugins: [
                Autoformat,
                Bold,
                Italic,
                Strikethrough,
                Underline,
                BlockQuote,
                Essentials,
                Heading,
                GeneralHtmlSupport,
                Image,
                ImageCaption,
                ImageInsert,
                ImageStyle,
                ImageToolbar,
                ImageUpload,
                PictureEditing,
                Indent,
                Link,
                List,
                Paragraph,
                PasteFromOffice,
                SourceEditing,
                Table,
                TableToolbar,
                TextTransformation,
                Base64UploadAdapter,
            ],
            toolbar: {
                items: [
                    "undo",
                    "redo",
                    "|",
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "underline",
                    "strikethrough",
                    "|",
                    "link",
                    "imageInsert",
                    "insertTable",
                    "blockQuote",
                    "|",
                    "bulletedList",
                    "numberedList",
                    "outdent",
                    "indent",
                    "|",
                    "sourceEditing",
                ],
            },
            image: {
                toolbar: [
                    "imageStyle:inline",
                    "imageStyle:block",
                    "imageStyle:side",
                    "|",
                    "toggleImageCaption",
                    "imageTextAlternative",
                ],
            },
            table: {
                contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
            },
            htmlSupport: {
                allow: [
                    {
                        name: "figure",
                        attributes: true,
                        classes: true,
                        styles: true,
                    },
                ],
            },
            ...config,
        };
        super(element, config);
    }
}
