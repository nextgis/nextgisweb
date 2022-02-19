import { EditorView } from "@codemirror/view";

export function themeSetup({ autoHeight, minHeight, maxHeight }) {
    const rootElementStyle = {
        border: "1px solid rgb(153, 153, 153)",
    };
    const baseTheme = {
        "&.cm-focused": {
            outline: "none!important",
        },
    };
    const autoHeightTheme = EditorView.theme({
        "&": { ...rootElementStyle, height: "auto" },
        ".cm-scroller": {
            minHeight,
            maxHeight,
            overflowY: maxHeight ? "auto" : "hidden",
            overflowX: "auto",
        },
        ".cm-gutter": { minHeight },
        ...baseTheme,
    });
    const fullHeightTheme = EditorView.theme({
        "&": { ...rootElementStyle, height: "100%", width: "100%" },
        ...baseTheme,
    });

    if (autoHeight) {
        return autoHeightTheme;
    } else {
        return fullHeightTheme;
    }
}
