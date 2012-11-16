var testResourceRe = /^cbtree\/tests\//;
var copyOnly = function(filename, mid) {
	var list = {
		"cbtree/cbtree.profile":1,
		"cbtree/cbtree.build":1,
		"cbtree/package.json":1
	};
	return (mid in list) || (/^cbtree\/themes\//.test(mid) && !/\.css$/.test(filename)) || /(png|jpg|jpeg|gif|tiff)$/.test(filename);
};

var profile = {

	releaseDir: "../release",
	basePath : "..",
	action: "release",
	cssOptimize: "comments",
	optimize: "closure",
	layerOptimize: "closure",
	selectorEngine: "acme",
	mini: false,

	layers: {
		"dojo/dojo": {
				include: [
					"dojo/dojo",
					"dojo/_base/array",
					"dojo/data/ItemFileWriteStore",
					"dojo/domReady",
					"dojo/dom",
					"dojo/i18n",
					"dojo/ready"
				],
				customBase: true,
				boot: true
		},
		"cbtree/main": {
				include: [
					"cbtree/models/FileStoreModel",
					"cbtree/models/ForestStoreModel",
					"cbtree/models/TreeStoreModel",
					"cbtree/models/StoreModel-API",
					"cbtree/stores/FileStore",
					"cbtree/CheckBox",
					"cbtree/TreeStyling",
					"cbtree/Tree"
				]
		}
	},
	 
	resourceTags: {
		test: function(filename, mid){
			var result = testResourceRe.test(mid);
			return testResourceRe.test(mid) || mid=="cbtree/tests" || mid=="cbtree/demos";
		},

		amd: function(filename, mid) {
			return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);				 
		},
		
		copyOnly: function(filename, mid) {
			return copyOnly(filename, mid);
		},

		miniExclude: function(filename, mid){
			var result = /^cbtree\/tests\//.test(mid) || /^cbtree\/demos\//.test(mid);
			return result;
		}		
	}
};
