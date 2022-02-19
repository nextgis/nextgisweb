import { history, historyKeymap } from "@codemirror/history";
import { indentOnInput } from "@codemirror/language";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { commentKeymap } from "@codemirror/comment";
import { lintKeymap } from "@codemirror/lint";
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
            ...commentKeymap,
            ...lintKeymap,
            ...historyKeymap,
            ...completionKeymap,
        ]),
    ];
}
