import { useCallback, useEffect, useRef, useState } from "react";

import { Annotation, EditorState, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { customSetup } from "./customSetup";
import { themeSetup } from "./themeSetup";

import { Extension } from "@codemirror/state";
import type { CodeOptions, Editor, Lang } from "../type";

const External = Annotation.define();

const getLang = async (lang: Lang): Promise<() => Extension> => {
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
}: CodeOptions) {
    const [editor, setEditor] = useState<Editor>(null);

    const destroy = useRef<() => void>();

    const getExtensions = useCallback(async () => {
        const langExtension = await getLang(lang);
        const setup = await customSetup({ lineNumbers, readOnly, fold });
        const extensions: Extension[] = [
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
            extensions.push(updateListener);
        }
        return extensions;
    }, [
        fold,
        lang,
        onChange,
        readOnly,
        maxHeight,
        minHeight,
        autoHeight,
        lineNumbers,
    ]);

    const createEditor = useCallback(async (): Promise<EditorView> => {
        if (destroy.current) {
            destroy.current();
        }
        const parent = target.current;

        const state = EditorState.create({
            doc,
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
    }, [doc, target]);

    useEffect(() => {
        if (editor) {
            getExtensions().then((extensions) => {
                editor.source.dispatch({
                    effects: StateEffect.reconfigure.of(extensions),
                });
            });
        }
    }, [editor, getExtensions]);

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
