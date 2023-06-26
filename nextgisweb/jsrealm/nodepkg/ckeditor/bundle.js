/**
 * @license Copyright (c) 2014-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */
import ClassicEditor from "@ckeditor/ckeditor5-editor-classic/src/classiceditor.js";
import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials.js";
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph.js";

class Editor extends ClassicEditor {}

// Plugins to include in the build.
Editor.builtinPlugins = [Essentials, Paragraph];

// Editor configuration.
Editor.defaultConfig = {
    toolbar: {
        items: ["undo", "redo"],
    },
    language: "en",
};

export default Editor;
