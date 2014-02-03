<?php
	/*
		This Server Side app is called by the tree30.html demo
	*/
	$method = $_SERVER['REQUEST_METHOD'];
	$storeItems = json_decode($_POST["checkboxes"]);

	echo ("<h3>Checked states included in the form</h3>");
	echo ('<table border="1"');
		echo ("<tr>");
			echo ("<th>Item Id</th><th>Value</th><th>Checked</th><th>Reference Count</th>");
			forEach($storeItems as $item) {
				echo ("<tr> <td>$item->id</td> <td>$item->value</td> <td>$item->checked</td> <td>$item->count</td></tr>");
			}
		echo ("</tr>");
	echo("</table>");
	echo ("<p>Courtesy of <em><b>The Checkbox Tree</b></em></p>");

?>