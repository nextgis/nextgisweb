import { sortBy } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";

import { PanelHeader } from "../header";

import { LoadingOutlined } from "@ant-design/icons";

import "./BookmarksPanel.less";

interface Bookmark {
    key: number;
    label: string;
}

const BookmarksPanel = observer(
    ({ display, title, close }: PanelComponentProps) => {
        const bookmarkLayerId = display.config.bookmarkLayerId;

        const [bookmarkSelected, setBookmarkSelected] = useState<Bookmark>();

        const { data, isLoading } = useRouteGet({
            name: "feature_layer.feature.collection",
            params: { id: bookmarkLayerId },
            options: {
                query: {
                    geom: true,
                    label: true,
                    extensions: [],
                },
            },
        });

        const bookmarks = useMemo(() => {
            return sortBy(
                // @ts-expect-error wait for server-side type definition
                data?.map((f) => ({ key: f.id, label: f.label })),
                ["label", "key"]
            ) as Bookmark[];
        }, [data]);

        const selectBookmark = async (bookmark: Bookmark) => {
            const result = await route(
                "feature_layer.feature.item_extent",
                bookmarkLayerId,
                bookmark.key
            ).get();
            display.map.zoomToNgwExtent(
                result.extent,
                display.displayProjection
            );
            setBookmarkSelected(bookmark);
        };

        const makeBookmarkJsx = (bookmark: Bookmark) => {
            const isSelected =
                bookmarkSelected && bookmark.key === bookmarkSelected.key;
            return (
                <div
                    className={`bookmark ${isSelected ? "selected" : ""}`}
                    key={bookmark.key}
                    onClick={() => selectBookmark(bookmark)}
                >
                    <span>{bookmark.label}</span>
                </div>
            );
        };

        let bookmarksJsx = null;
        if (bookmarks && !isLoading) {
            bookmarksJsx = bookmarks.map((b) => makeBookmarkJsx(b));
        } else if (isLoading) {
            const indicator = <LoadingOutlined style={{ fontSize: 30 }} spin />;
            bookmarksJsx = <Spin className="loading" indicator={indicator} />;
        }

        return (
            <div className="ngw-webmap-bookmarks-panel">
                <PanelHeader title={title} close={close} />
                <div className="results">{bookmarksJsx}</div>
            </div>
        );
    }
);

BookmarksPanel.displayName = "BookmarksPanel";

export default BookmarksPanel;
