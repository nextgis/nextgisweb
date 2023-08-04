export interface TextEditorProps {
    value: string;
    onChange?: (val: string) => void;
    parentHeight?: boolean;
    border?: boolean;
}
