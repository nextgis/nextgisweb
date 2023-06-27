import { useState, useEffect } from "react";
import { PropTypes } from "prop-types";
import { Spin } from "@nextgisweb/gui/antd";

import { LoadingOutlined } from "@ant-design/icons";

import { route } from "@nextgisweb/pyramid/api";

import "./BookmarksPanel.less";

export const BookmarksPanel = ({ bookmarkLayerId, display }) => {
    const [loading, setLoading] = useState(false);
    const [bookmarks, setBookmarks] = useState(undefined);
    const [bookmarkSelected, setBookmarkSelected] = useState(undefined);

    const loadBookmarks = async () => {
        setLoading(true);

        const query = {
            geom: "no",
            label: true
        };
        const features = await route("feature_layer.feature.collection", bookmarkLayerId).get({
            query
        });

        const bookmarks = features.map(f => {
            return { key: f.id, label: f.label };
        });

        setBookmarks(bookmarks);
        setLoading(false);
    };

    useEffect(() => {
        loadBookmarks();
    }, []);

    const selectBookmark = async (bookmark) => {
        const result = await route("feature_layer.feature.item_extent",
            bookmarkLayerId, bookmark.key).get();
        display.map.zoomToNgwExtent(result.extent, display.displayProjection);
        setBookmarkSelected(bookmark);
    };

    const makeBookmarkJsx = (bookmark) => {
        const isSelected = bookmarkSelected && bookmark.key === bookmarkSelected.key;
        return <div
            className={`bookmark ${isSelected ? "selected" : ""}`}
            key={bookmark.key}
            onClick={() => selectBookmark(bookmark)}
        >
            <span>
                {bookmark.label}
            </span>
        </div>;
    };

    let bookmarksJsx = null;
    if (bookmarks && !loading) {
        bookmarksJsx = bookmarks.map(b => makeBookmarkJsx(b));
    } else if (loading) {
        const indicator = <LoadingOutlined style={{ fontSize: 30 }} spin/>;
        bookmarksJsx = <Spin
            className="loading"
            indicator={indicator}
        />;
    }

    return (
        <div className="bookmarks-panel">
            <div className="results">
                {bookmarksJsx}
            </div>
        </div>
    );
};

BookmarksPanel.propTypes = {
    bookmarkLayerId: PropTypes.number,
    display: PropTypes.object
};
