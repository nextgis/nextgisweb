import CircleIcon from "@nextgisweb/icon/material/circle";

interface DirtyMarkProps {
    dirty: boolean;
}

export function DirtyMark({ dirty }: DirtyMarkProps) {
    // We can add revert all changes of the tab via reset(),
    // but it should not fire on regular tab clicks.
    return (
        (dirty && <CircleIcon style={{ color: "var(--primary)" }} />) || null
    );
}
