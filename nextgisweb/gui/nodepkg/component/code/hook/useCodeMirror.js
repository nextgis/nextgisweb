import { useState, useEffect } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { customSetup } from "./customSetup";
import { themeSetup } from "./themeSetup";

const getLang = async (lang) => {
    const aliases = {
        js: "javascript",
        py: "python",
        md: "markdown",
    };
    lang = aliases[lang] || lang;

    // Unable to pass a variable when importing
    // - string concatenation
    // `"@codemirror/lang-" + "css"` - Ok
    // - from variable
    // `"@codemirror/lang-" + lang` - Runtime error
    const importers = {
        css: () => import("@codemirror/lang-css"),
        xml: () => import("@codemirror/lang-xml"),
        json: () => import("@codemirror/lang-json"),
        html: () => import("@codemirror/lang-html"),
        python: () => import("@codemirror/lang-python"),
        markdown: () => import("@codemirror/lang-markdown"),
        javascript: () => import("@codemirror/lang-javascript"),
    };
    try {
        const module = await importers[lang]();
        return module[lang];
    } catch (er) {
        throw new Error(`CodeMirror language for '${lang}' is not installed`);
    }
};

export function useCodeMirror({
    target,
    lang,
    value: doc,
    readOnly,
    fold,
    autoHeight,
    minHeight,
    maxHeight,
    lineNumbers,
}) {
    const [editor, setEditor] = useState(null);

    useEffect(async () => {
        const parent = target.current;
        const langExtension = await getLang(lang);
        const setup = await customSetup({ lineNumbers, readOnly, fold });
        const extensions = [
            setup,
            langExtension(),
            themeSetup({ autoHeight, minHeight, maxHeight }),
        ];

        const state = EditorState.create({
            doc,
            extensions,
        });
        const cm = new EditorView({
            state,
            parent,
        });

        setEditor({
            source: cm,
            getValue: () => cm.state.doc.toString(),
        });

        return () => {
            cm.destroy();
        };
    }, [target]);

    return editor;
}
