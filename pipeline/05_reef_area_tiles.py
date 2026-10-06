"""Render the UNEP-WCMC warm-water coral reef extent into PNG map tiles for the web map.

python pipeline/05_reef_area_tiles.py

Source: UNEP-WCMC, WorldFish Centre, WRI, TNC (2010). Global distribution of warm-water coral reefs,
v4.1 (2021). Download WCMC008_CoralReefs2018_v4_1.zip from https://data.unep-wcmc.org/datasets/1 and
put it (or its extracted folder) in data/raw/wcmc/.

Why raster tiles: UNEP-WCMC's General Data License allows publishing the data online only if it is not
downloadable, so the reef outlines are rendered to images instead of being served as vectors. The tiles
are derived data under the same license: keep them out of git (see .gitignore) and keep the attribution
visible wherever they are shown. Non-commercial use only without UNEP-WCMC's written permission.
"""
import argparse
import shutil
import time
import zipfile

import geopandas as gpd
import pyogrio
import shapely
from PIL import Image, ImageDraw
from shapely.geometry import box
from shapely.ops import unary_union

from config import RAW, REEF_AREA_BOXES, REEF_AREA_TILES

SHAPEFILE = "WCMC008_CoralReef2018_Py_v4_1.shp"
TILE = 256
SUPERSAMPLE = 2  # draw at 512 px and downsample for anti-aliased edges
WEB_MERCATOR_HALF = 20037508.342789244
FILL = (32, 164, 170, 140)  # reef shallows turquoise, semi-transparent
EDGE = (14, 110, 120, 230)


def find_shapefile():
    found = list((RAW / "wcmc").rglob(SHAPEFILE))
    if found:
        return found[0]
    zips = list((RAW / "wcmc").glob("WCMC008*.zip"))
    if not zips:
        raise SystemExit(f"Put WCMC008_CoralReefs2018_v4_1.zip in {RAW / 'wcmc'} (see module docstring).")
    with zipfile.ZipFile(zips[0]) as z:
        z.extractall(RAW / "wcmc", [n for n in z.namelist() if "_Py_" in n])
    return next((RAW / "wcmc").rglob(SHAPEFILE))


def load_reefs(boxes):
    region = unary_union([box(*b) for b in boxes])
    gdf = pyogrio.read_dataframe(find_shapefile(), bbox=region.bounds, columns=[])
    # Some records are multi-part shapes spanning several regions: clip, don't just select.
    geoms = shapely.intersection(gdf.geometry.values, region)
    geoms = geoms[~shapely.is_empty(geoms)]  # records in the overall bbox but outside every box
    merc = gpd.GeoSeries(geoms, crs=gdf.crs).to_crs("EPSG:3857").values
    polys = shapely.get_parts(merc)
    return polys[shapely.get_type_id(polys) == 3]  # polygons only


def tile_bounds(z, x, y):
    size = 2 * WEB_MERCATOR_HALF / 2 ** z
    minx = -WEB_MERCATOR_HALF + x * size
    maxy = WEB_MERCATOR_HALF - y * size
    return minx, maxy - size, minx + size, maxy


def tiles_for(bounds_merc, z):
    size = 2 * WEB_MERCATOR_HALF / 2 ** z
    minx, miny, maxx, maxy = bounds_merc
    x0, x1 = int((minx + WEB_MERCATOR_HALF) // size), int((maxx + WEB_MERCATOR_HALF) // size)
    y0, y1 = int((WEB_MERCATOR_HALF - maxy) // size), int((WEB_MERCATOR_HALF - miny) // size)
    return x0, x1, y0, y1


def render(polys, z, x, y):
    minx, miny, maxx, maxy = tile_bounds(z, x, y)
    px = TILE * SUPERSAMPLE
    scale = px / (maxx - minx)
    pad = 2 / scale
    clipped = shapely.get_parts(shapely.intersection(polys, box(minx - pad, miny - pad, maxx + pad, maxy + pad)))
    clipped = clipped[(shapely.get_type_id(clipped) == 3) & ~shapely.is_empty(clipped)]
    if len(clipped) == 0:
        return None

    def ring(coords):
        return [((cx - minx) * scale, (maxy - cy) * scale) for cx, cy in coords]

    mask = Image.new("L", (px, px), 0)
    edges = Image.new("L", (px, px), 0)
    dm, de = ImageDraw.Draw(mask), ImageDraw.Draw(edges)
    for poly in clipped:
        outer = ring(poly.exterior.coords)
        dm.polygon(outer, fill=255)
        de.line(outer + outer[:1], fill=255, width=SUPERSAMPLE)
        for hole in poly.interiors:
            dm.polygon(ring(hole.coords), fill=0)
    img = Image.new("RGBA", (px, px), FILL[:3] + (0,))
    img.putalpha(mask.point(lambda v: v * FILL[3] // 255))
    edge_layer = Image.new("RGBA", (px, px), EDGE[:3] + (0,))
    edge_layer.putalpha(edges.point(lambda v: v * EDGE[3] // 255))
    img = Image.alpha_composite(img, edge_layer)
    return img.resize((TILE, TILE), Image.LANCZOS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-zoom", type=int, default=3)
    parser.add_argument("--max-zoom", type=int, default=11)
    args = parser.parse_args()

    t0 = time.time()
    polys = load_reefs(REEF_AREA_BOXES)
    tree = shapely.STRtree(polys)
    merc_bounds = shapely.total_bounds(polys)
    print(f"{len(polys):,} reef polygons in {len(REEF_AREA_BOXES)} boxes ({time.time() - t0:.1f}s)", flush=True)

    total = 0
    for z in range(args.min_zoom, args.max_zoom + 1):
        tz = time.time()
        # Clear this zoom first so tiles from a previous, differently bounded run don't linger.
        shutil.rmtree(REEF_AREA_TILES / str(z), ignore_errors=True)
        pixel_m = 2 * WEB_MERCATOR_HALF / 2 ** z / TILE
        simplified = shapely.simplify(polys, pixel_m / 2, preserve_topology=True)
        x0, x1, y0, y1 = tiles_for(merc_bounds, z)
        count = 0
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                hits = tree.query(box(*tile_bounds(z, x, y)))
                if len(hits) == 0:
                    continue
                img = render(simplified[hits], z, x, y)
                if img is None:
                    continue
                out = REEF_AREA_TILES / str(z) / str(x) / f"{y}.png"
                out.parent.mkdir(parents=True, exist_ok=True)
                img.save(out, optimize=True)
                count += 1
        total += count
        print(f"z{z}: {count:,} tiles ({time.time() - tz:.1f}s)", flush=True)

    size_mb = sum(p.stat().st_size for p in REEF_AREA_TILES.rglob("*.png")) / 1e6
    print(f"Done: {total:,} tiles, {size_mb:.1f} MB in {REEF_AREA_TILES} ({time.time() - t0:.0f}s total)")


if __name__ == "__main__":
    main()
