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
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    width: 100;
                    height: 100%;
                }

                img.map {
                    margin: ${margin}mm;
                    width: ${width - margin * 2}mm;
                    height: ${height - margin * 2}mm;
                    overflow: hidden;
                }
            }
        </style>
    </head>
    <body>
        <img class="map" src="${map_image}" />
    </body>
</html>
