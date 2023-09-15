import pytest

from nextgisweb.lib.json import dumps

from .. import model as m


def mkstyle(symbolizer: m.Symbolizer):
    return m.Style(rules=[m.Rule(symbolizers=[symbolizer])])


stroke = m.Stroke(opacity=0.75, color="#FF0000", width=2)
fill = m.Fill(opacity=0.25, color="#00FF00")
mark = m.Mark(well_known_name=m.WellKnownName.SQUARE, stroke=stroke, fill=fill)
graphic = m.Graphic(opacity=0.75, mark=mark, size=16)

point = mkstyle(m.PointSymbolizer(graphic=graphic))
line = mkstyle(m.LineSymbolizer(stroke=stroke))
polygon = mkstyle(m.PolygonSymbolizer(stroke=stroke, fill=fill))


@pytest.mark.parametrize(
    "value",
    [
        pytest.param(point, id="point"),
        pytest.param(line, id="line"),
        pytest.param(polygon, id="polygon"),
    ],
)
def test_serialization(value, ngw_txn):
    obj = m.SLD(value=value).persist()
    serialized = obj.serialize()
    print(dumps(serialized, pretty=True))
    obj.deserialize(serialized)
