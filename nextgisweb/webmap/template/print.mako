<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <style>
            @page {
                size: ${width}mm ${height}mm;
                margin: 0;
            }

            @media screen, print {
                html,
                body {
                    font-family: Roboto, sans-serif;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    width: 100;
                    height: 100%;
                }
            }

            .wrapper {
                position: relative;
                margin: ${margin}mm;
            }

            img.map {
                position: absolute;
                top: ${map.y}px;
                left: ${map.x}px;
                width: ${map.width}px;
                height: ${map.height}px;
                overflow: hidden;
                z-index: 1;
            }

            % if title:
                .title-wrapper {
                    position: absolute;
                    top: ${title.y}px;
                    left: ${title.x}px;
                    width: ${title.width}px;
                    height: ${title.height}px;
                    padding: 0;
                    margin: 0;
                    background-color: white;
                    border: 1px solid rgb(201, 201, 201);
                    display: flex;
                    justify-content: center;
                    flex-direction: row;
                    align-items: center;
                    z-index: 3;
                }

                .title {
                    font-size: 15px;
                    padding: 10px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-align: center;
                }
            % endif

            % if legend:
                .legend-wrapper {
                    position: absolute;
                    background-color: white;
                    top: ${legend.y}px;
                    left: ${legend.x}px;
                    width: ${legend.width}px;
                    height: ${legend.height}px;
                    border: 1px solid #c9c9c9;
                    padding: 0;
                    margin: 0;
                    overflow: hidden;
                    z-index: 2;
                }

                .legend {
                    font-size: 14px;    
                    padding: 0;
                    margin: 0;
                    z-index: 2;
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    bottom: 5px;
                    left: 5px;
                }

                .legend .tree {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    column-count: ${legend.legendColumns};
                }

                .legend .legend-level {
                    display: inline-block;
                    min-width: 15px;
                    min-height: 20px;
                    border: none;
                    background: none;
                }

                .legend .icon img {
                    min-width: 20px;
                    min-height: 20px;
                    margin-right: 3px;
                }

                .legend .item {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: left;
                }

                .legend .legend-title {
                    overflow: hidden;
                    position: relative;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .legend .legend-group,
                .legend .legend-layer {
                    margin: 4px 0;
                }

                .legend .legend-item {
                    font-size: 13px;
                }

                .legend .legend-item .icon img {
                    width: 15px;
                    height: 15px;
                }
            % endif
        </style>
    </head>

    <body onload="window.print()">
        <div class="wrapper">
            % if title:
                <div class="title-wrapper">
                    <div class="title">${title.content}</div>
                </div>
            % endif
            
            % if legend:
                <div class="legend-wrapper">
                    <div class="legend">
                        <div class="tree">
                            % for legend_item in legend_info:
                                <%
                                    legend_class = 'legend-item' if legend_item.legend else '' 
                                    group_class = 'legend-group' if legend_item.group else '' 
                                    layer = (not legend_item.group) and (not legend_item.legend)
                                    layer_class = 'legend-layer' if layer else '' 
                                    item_class = f'{legend_class} {group_class} {layer_class}'
                                %>
                                <div class="item ${item_class}">
                                    % for i in range(legend_item.level):
                                        <div class="legend-level"></div> 
                                    % endfor

                                    % if legend_item.icon:
                                        <div class="icon">
                                            <img src="${f'data:image/png;base64,{legend_item.icon}'}"/>
                                        </div>
                                    % endif

                                    <div class="legend-title">${legend_item.title}</div>
                                </div>
                            % endfor
                        </div>
                    </div>  
                </div>
            % endif

            <img class="map" src="${map_image}" />
        </div>
    </body>
</html>
