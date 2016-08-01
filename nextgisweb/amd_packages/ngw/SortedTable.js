define([
	"dojo/_base/declare",
	"dojo/query",
	"dojo/has!ie?polyfills/classList",
	"tablesort/tablesort.min"
], function(
	declare,
	query,
	classList,
	tablesort
){
  SortedTable = declare(null, {
  	_sortingType: ["date", "dotsep", "filesize", "monthname", "number"],
  	_sortingTypeScriptsPath: "tablesort/sorts/tablesort.",
  	_getSortingTypeScripts: function(el){
  		var sortingTypeScripts=[];
  		for (i = 0; i < this._sortingType.length; i++){
  			if (query('[data-sort-method='+ this._sortingType[i] +'', el).length) 
  				sortingTypeScripts.push(this._sortingTypeScriptsPath + this._sortingType[i]);
  		}
  		return sortingTypeScripts;
  	},
  	constructor: function(el){  	
  		require(this._getSortingTypeScripts(el), function(){	
  			new Tablesort(el);
  		});
  	}
  });

  return SortedTable;
});