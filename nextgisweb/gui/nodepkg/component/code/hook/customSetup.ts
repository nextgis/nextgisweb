import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
    bracketMatching,
    defaultHighlightStyle,
    foldGutter,
    foldKeymap,
    indentOnInput,
    syntaxHighlighting,
} from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
    crosshairCursor,
    drawSelection,
    dropCursor,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
} from "@codemirror/view";

interface CustomSetupOptions {
    lineNumbers?: boolean;
    readOnly?: boolean;
    fold?: boolean;
}

export async function customSetup({
    lineNumbers: lineNumbers_,
    readOnly,
    fold,
}: CustomSetupOptions) {
    const keymap_ = [
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap,
        ...lintKeymap,
    ];

    const customSetup = [
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
    ];

    fold = fold ?? lineNumbers_;

    if (lineNumbers_) {
        customSetup.push(...[lineNumbers(), highlightActiveLineGutter()]);
    }
    if (fold) {
        customSetup.push(foldGutter());
        keymap_.push(...foldKeymap);
    }
    if (readOnly) {
        customSetup.push(...[EditorState.readOnly.of(true)]);
        customSetup.push(keymap.of(keymap_));
    } else {
        const { editableSetup } = await import("./editableSetup");
        customSetup.push(...editableSetup());
    }

    return customSetup;
}
