# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
# Borrowed from https://github.com/kylefox/python-image-orientation-patch

from collections import namedtuple
from PIL import Image

Orientation = namedtuple('Orientation', ['description', 'degrees'])

# The EXIF tag that holds orientation data.
EXIF_ORIENTATION_TAG = 274

ORIENTATIONS = {
    1: Orientation("Normal", 0),
    2: Orientation("Mirrored left-to-right", 0),
    3: Orientation("Rotated 180 degrees", Image.ROTATE_180),
    4: Orientation("Mirrored top-to-bottom", 0),
    5: Orientation("Mirrored along top-left diagonal", 0),
    6: Orientation("Rotated 90 degrees", Image.ROTATE_270),
    7: Orientation("Mirrored along top-right diagonal", 0),
    8: Orientation("Rotated 270 degrees", Image.ROTATE_90)
}
