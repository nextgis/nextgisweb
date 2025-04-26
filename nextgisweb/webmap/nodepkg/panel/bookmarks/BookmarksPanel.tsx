import classNames from "classnames";
import { sortBy } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";

import { PanelContainer } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import { LoadingOutlined } from "@ant-design/icons";

import "./BookmarksPanel.less";

interface Bookmark {
    key: number;
    label: string;
}

const BookmarksPanel = observer<PanelPluginWidgetProps>(
    ({ store, display }) => {
        const bookmarkLayerId = display.config.bookmarkLayerId;

        const [bookmarkSelected, setBookmarkSelected] = useState<Bookmark>();

        const { data, isLoading } = useRouteGet({
            name: "feature_layer.feature.collection",
            params: { id: bookmarkLayerId },
            options: {
                query: {
                    geom: false,
                    label: true,
                    dt_format: "iso",
                    fields: [],
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
                // @ts-expect-error Extent may be null for features without geometries
                result.extent,
                {
                    displayProjection: display.displayProjection,
                }
            );
            setBookmarkSelected(bookmark);
        };

        const makeBookmarkJsx = (bookmark: Bookmark) => {
            const isSelected =
                bookmarkSelected && bookmark.key === bookmarkSelected.key;
            return (
                <div
                    key={bookmark.key}
                    className={classNames("bookmark", isSelected && "selected")}
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
            <PanelContainer
                className="ngw-webmap-panel-bookmarks"
                title={store.title}
                close={store.close}
                components={{ content: PanelContainer.Unpadded }}
            >
                <div>{bookmarksJsx}</div>
            </PanelContainer>
        );
    }
);

BookmarksPanel.displayName = "BookmarksPanel";
export default BookmarksPanel;
