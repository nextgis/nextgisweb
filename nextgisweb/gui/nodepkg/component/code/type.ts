import type { MutableRefObject } from "react";
import type { ViewUpdate, EditorView } from "@codemirror/view";

export interface Editor {
    source: EditorView;
    getValue: () => string;
}

export type LangShortcut = "js" | "py" | "md";

export type Lang =
    | "css"
    | "xml"
    | "json"
    | "html"
    | "python"
    | "markdown"
    | "javascript"
    | LangShortcut;

export interface CodeOptions {
    lang: Lang;
    value?: string;
    fold?: boolean;
    target?: MutableRefObject<HTMLDivElement | null>;
    readOnly?: boolean;
    onChange?: (val: string, view: ViewUpdate) => void;
    minHeight?: string;
    maxHeight?: string;
    autoHeight?: boolean;
    lineNumbers?: boolean;
}
