<%inherit file='../obj.mako' />

<%def name="head()">
	<% import json %>
	<script>
		var objData = ${obj.to_dict() | json.dumps, n};
	</script>
</%def>

<div data-dojo-type="webmap/Form" data-dojo-id="form" data-dojo-props="data: objData"></div>

<script>
	require(["dojo/parser", "webmap/Form"], function(parser) { 
		parser.parse();
		form.setData(objData); 
	});

</script>