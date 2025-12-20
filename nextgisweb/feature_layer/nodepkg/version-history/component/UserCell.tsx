import { useRouteGet } from "@nextgisweb/pyramid/hook";

export function UserCell({ userId }: { userId: number }) {
    const { data, isLoading } = useRouteGet(
        "auth.user.item",
        {
            id: userId,
        },
        { cache: true }
    );
    if (isLoading) {
        return "...";
    }
    return data ? data.display_name : `#${userId}`;
}
