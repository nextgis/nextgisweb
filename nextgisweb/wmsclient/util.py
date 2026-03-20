XLINK_HREF = "{http://www.w3.org/1999/xlink}href"


def find_tags(el, tag):
    return el.iterchildren(tag="{*}%s" % tag)


def find_tag(el, tag, *, must=False):
    for child in find_tags(el, tag):
        return child
    if must:
        raise ValueError(f"Tag {tag} not found in {el.tag} element.")


def get_capability_urls(el_cap):
    result = {}
    for op in ("GetMap", "GetFeatureInfo"):
        el_op = next(el_cap.iter("{*}" + op), None)
        if el_op is None:
            continue
        for el_or in el_op.iter("{*}OnlineResource"):
            href = el_or.get(XLINK_HREF)
            if href:
                result[op] = href
                break
    return result


def get_capability_formats(el_cap):
    result = []
    _request = find_tag(el_cap, "Request", must=True)
    _getmap = find_tag(_request, "GetMap", must=True)
    for el in find_tags(_getmap, "Format"):
        result.append(el.text)
    return result


def _layer_bbox(el, *, version):
    if version == "1.3.0":
        if (exbbox := find_tag(el, "EX_GeographicBoundingBox")) is not None:
            return [
                float(find_tag(exbbox, tag).text)
                for tag in (
                    "westBoundLongitude",
                    "southBoundLatitude",
                    "eastBoundLongitude",
                    "northBoundLatitude",
                )
            ]
    else:
        if (llbbox := find_tag(el, "LatLonBoundingBox")) is not None:
            return [float(llbbox.attrib[a]) for a in ("minx", "miny", "maxx", "maxy")]

    for elbbox in find_tags(el, "BoundingBox"):
        if version == "1.3.0":
            if elbbox.attrib["CRS"] != "CRS:84":
                continue
        else:
            if elbbox.attrib["SRS"] != "EPSG:4326":
                continue
        return [float(elbbox.attrib[a]) for a in ("minx", "miny", "maxx", "maxy")]


def _layer_from_element(el, parent, *, version):
    if parent is not None:
        name = parent["id"]
        title = parent["title"]
        bbox = parent["bbox"]
    else:
        name = title = bbox = None

    if (el_name := find_tag(el, "Name")) is not None:
        name = el_name.text
    if (el_title := find_tag(el, "Title")) is not None:
        title = el_title.text
    if _bbox := _layer_bbox(el, version=version):
        bbox = _bbox

    return dict(
        id=name,
        title=title,
        bbox=bbox,
    )


def _layers(el_layer, parent=None, *, version):
    result = []

    layer = _layer_from_element(el_layer, parent, version=version)

    for el in find_tags(el_layer, "Layer"):
        result.extend(_layers(el, layer, version=version))

    if len(result) == 0:
        result.append(layer)

    return result


def get_capability_layers(el_cap, *, version):
    result = []
    for el in find_tags(el_cap, "Layer"):
        result.extend(_layers(el, version=version))
    return result


def get_capability_srs(el_cap, *, version):
    tag = "CRS" if version == "1.3.0" else "SRS"
    result = []
    seen = set()
    for el in el_cap.iter("{*}%s" % tag):
        for code in el.text.split():
            if code not in seen:
                seen.add(code)
                result.append(code)
    return result
