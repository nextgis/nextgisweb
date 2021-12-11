"""
Copyright 2021 Protomaps LLC

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Code from https://github.com/bdon/TileSiege
"""

import bisect
import random
import csv
import os
import urllib.request
import lzma
import math
import argparse
import requests
from urllib.parse import urlparse

parser = argparse.ArgumentParser(description="Create a urls.txt for siege.")
parser.add_argument(
    "--maxzoom", type=int, default=19, help="Maximum zoom level, inclusive."
)
parser.add_argument(
    "--instance", type=str, default="https://demo.nextgis.com", help="NGW instance"
)
parser.add_argument("--resid", type=int, help="IRenderableStyle resource")
args = parser.parse_args()


def _xy(lon, lat):
    x = lon / 360.0 + 0.5
    sinlat = math.sin(math.radians(lat))
    y = 0.5 - 0.25 * math.log((1.0 + sinlat) / (1.0 - sinlat)) / math.pi
    return x, y


def bbox(resid):
    extent = []
    r = requests.get("{}/api/resource/{}".format(args.instance, resid))
    parent_id = r.json()["resource"]["parent"]["id"]
    r = requests.get("{}/api/resource/{}/extent".format(args.instance, parent_id))
    for k in ("minLon", "minLat", "maxLon", "maxLat"):
        extent.append(r.json()["extent"][k])
    return extent


min_lon, min_lat, max_lon, max_lat = bbox(args.resid)
min_x, min_y = _xy(float(min_lon), float(min_lat))
max_x, max_y = _xy(float(max_lon), float(max_lat))
bounds = [min_x, max_y, max_x, min_y]  # invert Y

# one week of anonymized tile edge request logs from openstreetmap.org
FILENAME = "tiles-2021-08-08.txt.xz"
OUTPUT_ROWS = 10000

if not os.path.isfile(FILENAME):
    print("Downloading " + FILENAME)
    urllib.request.urlretrieve(
        f"https://planet.openstreetmap.org/tile_logs/{FILENAME}", FILENAME
    )

# output should be pseudorandom + deterministic.
random.seed(3857)

maxzoom = args.maxzoom
distribution = [
    2,
    2,
    6,
    12,
    16,
    27,
    38,
    41,
    49,
    56,
    72,
    71,
    99,
    135,
    135,
    136,
    102,
    66,
    37,
    6,
]  # the total distribution...

total_weight = 0
totals = {}
ranges = {}
tiles = {}
for zoom in range(maxzoom + 1):
    total_weight = total_weight + distribution[zoom]
    totals[zoom] = 0
    ranges[zoom] = []
    tiles[zoom] = []

with lzma.open(FILENAME, "rt") as f:
    reader = csv.reader(f, delimiter=" ")
    for row in reader:

        split = row[0].split("/")
        z = int(split[0])
        x = int(split[1])
        y = int(split[2])
        count = int(row[1])

        if z > maxzoom:
            continue

        if bounds:
            f = 1 << z
            if (
                x >= math.floor(bounds[0] * f)
                and x <= math.floor(bounds[2] * f)
                and y >= math.floor(bounds[1] * f)
                and y <= math.floor(bounds[3] * f)
            ):
                pass
            else:
                continue

        ranges[z].append(totals[z])
        tiles[z].append(row[0])
        totals[z] = totals[z] + count

with open("urls.txt", "w") as f:
    parsed_url = urlparse(args.instance)
    port = 443 if parsed_url.scheme == "https" else 80
    f.write("PROT={}\n".format(parsed_url.scheme))
    f.write("HOST={}\n".format(parsed_url.hostname))
    f.write("PATH={}\n".format("api/component/render/tile"))
    f.write("PORT={}\n".format(port))
    for zoom in range(0, maxzoom + 1):
        rows_for_zoom = math.ceil(OUTPUT_ROWS * distribution[zoom] / total_weight)
        for sample in range(rows_for_zoom):
            rand = random.randrange(totals[zoom])
            i = bisect.bisect(ranges[zoom], rand) - 1
            z, x, y = tiles[zoom][i].split("/")
            f.write(
                f"$(PROT)://$(HOST):$(PORT)/$(PATH)?resource={args.resid}&z={z}&x={x}&y={y}\n"
            )
        p1 = " " if zoom < 10 else ""
        p2 = " " * (len(str(10000)) - len(str(rows_for_zoom)))
        bar = "█" * math.ceil(rows_for_zoom / OUTPUT_ROWS * 60)
        print(f"{p1}{zoom} | {p2}{rows_for_zoom} {bar}")
print(f"wrote urls.txt with {OUTPUT_ROWS} requests.")
