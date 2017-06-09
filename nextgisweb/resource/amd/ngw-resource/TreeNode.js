/* globals define, ngwConfig */
define([
    "dojo/_base/declare",
    "dijit/Tree",
    "dojo/text!./template/TreeNode.hbs"
], function (
    declare,
    Tree,
    template
) {
    return declare([Tree._TreeNode], {
        templateString: template,
        assetUrl: ngwConfig.assetUrl
    });
});
