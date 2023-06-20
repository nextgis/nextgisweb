import { useState, useEffect, useCallback, useRef } from "react";
import { Annotation, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { customSetup } from "./customSetup";
import { themeSetup } from "./themeSetup";

const External = Annotation.define();

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
    fold,
    lang,
    value: doc,
    target,
    readOnly,
    onChange,
    minHeight,
    maxHeight,
    autoHeight,
    lineNumbers,
}) {
    const [editor, setEditor] = useState(null);

    const destroy = useRef();

    const createEditor = useCallback(async () => {
        if (destroy.current) {
            destroy.current();
        }
        const parent = target.current;
        const langExtension = await getLang(lang);
        const setup = await customSetup({ lineNumbers, readOnly, fold });
        const extensions = [
            setup,
            langExtension(),
            themeSetup({ autoHeight, minHeight, maxHeight }),
        ];
        if (onChange) {
            // based on https://github.com/uiwjs/react-codemirror/blob/master/core/src/useCodeMirror.ts#L55
            const updateListener = EditorView.updateListener.of((vu) => {
                if (
                    vu.docChanged &&
                    typeof onChange === "function" &&
                    // Fix echoing of the remote changes:
                    // If transaction is market as remote we don't have to call `onChange` handler again
                    !vu.transactions.some((tr) => tr.annotation(External))
                ) {
                    const doc = vu.state.doc;
                    const value = doc.toString();
                    onChange(value, vu);
                }
            });
            extensions.push(updateListener)
        }
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
        destroy.current = () => {
            cm.destroy();
            setEditor(null);
        };
        return cm;
    }, [
        doc,
        fold,
        lang,
        target,
        readOnly,
        minHeight,
        maxHeight,
        autoHeight,
        lineNumbers,
    ]);

    useEffect(() => {
        createEditor();
    }, [createEditor]);

    useEffect(() => {
        return () => {
            if (destroy.current) {
                destroy.current();
            }
        };
    }, []);

    return editor;
}
