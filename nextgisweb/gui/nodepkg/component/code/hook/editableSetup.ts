import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap,
} from "@codemirror/autocomplete";
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from "@codemirror/commands";
import { indentOnInput } from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";

export function editableSetup() {
    return [
        history(),
        closeBrackets(),
        highlightSelectionMatches(),
        indentOnInput(),
        autocompletion(),
        keymap.of([
            indentWithTab,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...lintKeymap,
            ...historyKeymap,
            ...completionKeymap,
        ]),
    ];
}
