import {
    highlightSpecialChars,
    drawSelection,
    dropCursor,
    highlightActiveLine,
} from "@codemirror/view";
export { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { bracketMatching } from "@codemirror/matchbrackets";
import { rectangularSelection } from "@codemirror/rectangular-selection";
import { defaultHighlightStyle } from "@codemirror/highlight";

export async function customSetup({ lineNumbers, readOnly, fold }) {
    const keys = [];

    const customSetup = [
        highlightSpecialChars(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        defaultHighlightStyle.fallback,
        bracketMatching(),
        rectangularSelection(),
        highlightActiveLine(),
    ];

    fold = fold ?? lineNumbers;

    if (lineNumbers) {
        const { lineNumbers, highlightActiveLineGutter } = await import(
            "@codemirror/gutter"
        );
        customSetup.push(...[lineNumbers(), highlightActiveLineGutter()]);
    }
    if (fold) {
        const { foldGutter, foldKeymap } = await import("@codemirror/fold");
        customSetup.push(foldGutter());
        keys.push(foldKeymap);
    }
    if (readOnly) {
        customSetup.push(
            ...[
                // the `@codemirror/matchbrackets` does not work with editable: false
                // EditorView.editable.of(false),
                EditorState.readOnly.of(true),
            ]
        );
    } else {
        const { editableSetup } = await import("./editableSetup");
        customSetup.push(...editableSetup());
    }

    return customSetup;
}
