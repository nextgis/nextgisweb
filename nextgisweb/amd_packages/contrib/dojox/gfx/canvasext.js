//>>built
define("dojox/gfx/canvasext",["./_base","./canvas"],function(b,c){var d=b.canvasext={};c.Surface.extend({getImageData:function(a){"pendingRender"in this&&this._render(!0);return this.rawNode.getContext("2d").getImageData(a.x,a.y,a.width,a.height)},getContext:function(){return this.rawNode.getContext("2d")}});return d});
//# sourceMappingURL=canvasext.js.map