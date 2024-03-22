import sortBy from "lodash-es/sortBy";
import { useEffect, useState } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";

import { PanelHeader } from "../header";

import { LoadingOutlined } from "@ant-design/icons";

import "./BookmarksPanel.less";

export function BookmarksPanel({ display, title, close }) {
    const bookmarkLayerId = display.config.bookmarkLayerId;

    const [loading, setLoading] = useState(false);
    const [bookmarks, setBookmarks] = useState(undefined);
    const [bookmarkSelected, setBookmarkSelected] = useState(undefined);

    const loadBookmarks = async () => {
        setLoading(true);

        const query = {
            geom: "no",
            label: true,
        };
        const features = await route(
            "feature_layer.feature.collection",
            bookmarkLayerId
        ).get({ query });

        const bookmarks = sortBy(
            features.map((f) => ({ key: f.id, label: f.label })),
            ["label", "key"]
        );

        setBookmarks(bookmarks);
        setLoading(false);
    };

    useEffect(() => {
        loadBookmarks();
    }, []);

    const selectBookmark = async (bookmark) => {
        const result = await route(
            "feature_layer.feature.item_extent",
            bookmarkLayerId,
            bookmark.key
        ).get();
        display.map.zoomToNgwExtent(result.extent, display.displayProjection);
        setBookmarkSelected(bookmark);
    };

    const makeBookmarkJsx = (bookmark) => {
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
    if (bookmarks && !loading) {
        bookmarksJsx = bookmarks.map((b) => makeBookmarkJsx(b));
    } else if (loading) {
        const indicator = <LoadingOutlined style={{ fontSize: 30 }} spin />;
        bookmarksJsx = <Spin className="loading" indicator={indicator} />;
    }

    return (
        <div className="ngw-webmap-bookmarks-panel">
            <PanelHeader {...{ title, close }} />
            <div className="results">{bookmarksJsx}</div>
        </div>
    );
}
