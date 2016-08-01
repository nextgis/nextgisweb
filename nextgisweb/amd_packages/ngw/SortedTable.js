define([
	"dojo/_base/declare",
	"dojo/query",  
  "dojo/_base/array",
	"dojo/has!ie?polyfills/classList",
	"tablesort/tablesort.min"
], function(
	declare,
	query,
  array,
	classList,
	tablesort
){
  return declare(null, {
  	_sortingType: ["date", "dotsep", "filesize", "monthname", "number"],
  	_sortingTypeScriptsPath: "tablesort/sorts/tablesort.",
  	_getSortingTypeScripts: function(el){
  		var sortingTypeScripts=[];
      array.forEach(this._sortingType, function(item, i){
        if (query('[data-sort-method='+ item +']', el).length) 
          sortingTypeScripts.push(this._sortingTypeScriptsPath + this._sortingType[i]);
      });
  		return sortingTypeScripts;
  	},
  	constructor: function(el){  	
  		require(this._getSortingTypeScripts(el), function(){	
  			new Tablesort(el);
  		});
  	}
  });
});