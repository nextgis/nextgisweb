define([
    "dojo/_base/declare",
    "./_Base"
], function (
    declare,
    _Base
) {
    function quadKey(tileCoord) {
        const z = tileCoord[0];
        const digits = new Array(z);
        let mask = 1 << (z - 1);
        let i, charCode;
        for (i = 0; i < z; ++i) {
          // 48 is charCode for 0 - '0'.charCodeAt(0)
          charCode = 48;
          if (tileCoord[1] & mask) {
            charCode += 1;
          }
          if (tileCoord[2] & mask) {
            charCode += 2;
          }
          digits[i] = String.fromCharCode(charCode);
          mask >>= 1;
        }
        return digits.join('');
    }

    return declare([_Base], {
        olLayerClassName: "layer.Tile",
        olSourceClassName: "source.XYZ",

        constructor: function(name, loptions, soptions) {
            this.inherited(arguments);

            const source = this.olSource;
            this.olSource.setTileUrlFunction(
                function (tileCoord, pixelRatio, projection) {
                    const quadKeyTileCoord = [0, 0, 0];
                    let url;
                    if (!tileCoord) {
                        return undefined;
                    } else {
                        quadKeyTileCoord[0] = tileCoord[0];
                        quadKeyTileCoord[1] = tileCoord[1];
                        quadKeyTileCoord[2] = tileCoord[2];
                        url = source.getUrls()[0];
                        return url.replace('{q}', quadKey(quadKeyTileCoord));
                    }
                }
            );
        }
    });
});