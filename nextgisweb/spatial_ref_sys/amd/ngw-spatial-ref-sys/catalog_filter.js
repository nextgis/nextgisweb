define([
    "dojo/dom-class",
], function (
    domClass,
) {
    return function(input) {
        function textFilter () {
            var searchValue = input.value.trim().toLowerCase();
            var allVisible = searchValue == '';

            var rows = document.getElementsByClassName("srs-row");
            rows_loop:
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];

                if (allVisible) {
                    row.style.display = '';
                    continue;
                }

                for (var j = 0; j < row.children.length; j++) {
                    var col = row.children[j];

                    if (domClass.contains(col, "col-searchable")) {
                        if(col.textContent.toLowerCase().includes(searchValue)) {
                            row.style.display = '';
                            continue rows_loop;
                        }
                    }
                };
                row.style.display = 'none';
            }
        };

        input.onchange = textFilter;
    };
});
