# Tokyo offline vector map data

Map data © OpenStreetMap contributors. Licensed under the Open Data Commons Open Database License (ODbL) 1.0.

- Attribution and copyright: https://www.openstreetmap.org/copyright
- Database license: https://opendatacommons.org/licenses/odbl/1-0/
- Query source: https://overpass-api.de/api/interpreter
- Download/processing date: 2026-09-03

## Data and processing

The adjacent `tokyo-map-data.js` is the complete machine-readable derived database used by this demo, distributed under ODbL 1.0. Read the JSON following `window.TOKYO_MAP_DATA=` and remove the final semicolon. Coordinates are longitude/latitude in WGS84. Original OpenStreetMap way geometry was rounded to six decimal places and simplified with Ramer–Douglas–Peucker at approximately 8 m tolerance. Tiny parks were omitted. No map tiles were downloaded. No coordinates were invented. The dataset is a filtered map illustration, not a navigation or routing service. Some ways extend beyond the requested bounds and should be visually clipped.

## Reproducible Overpass query

```overpass
[out:json][timeout:45];(way["highway"~"^(motorway|trunk|primary|secondary)$"](35.625,139.67,35.755,139.89);way["waterway"="river"](35.625,139.67,35.755,139.89);way["natural"="water"]["name"](35.625,139.67,35.755,139.89);way["leisure"="park"]["name"~"代々木|上野|新宿|日比谷|芝公園|隅田|北の丸|葛西"](35.625,139.67,35.755,139.89);way["railway"="rail"]["name"="山手線"](35.625,139.67,35.755,139.89););out tags geom;
```

## Neighborhood street supplement

Additional tertiary, residential and unclassified streets cover the Asakusa/Skytree, Harajuku/Shibuya, Shinjuku, Ueno and Maihama trip areas. Their original way geometry was rounded to six decimal places and simplified with approximately 3 m tolerance. Duplicate OpenStreetMap way IDs and duplicate coordinate sequences were removed before merging. This supplement remains under the same ODbL 1.0 database license.

Overpass data timestamp: `2026-09-03T04:43:05Z`.

```overpass
[out:json][timeout:45];(way["highway"~"^(tertiary|residential|unclassified)$"](35.700,139.780,35.725,139.825);way["highway"~"^(tertiary|residential|unclassified)$"](35.650,139.685,35.681,139.716);way["highway"~"^(tertiary|residential|unclassified)$"](35.677,139.682,35.701,139.720);way["highway"~"^(tertiary|residential|unclassified)$"](35.704,139.763,35.726,139.790);way["highway"~"^(tertiary|residential|unclassified)$"](35.625,139.869,35.646,139.890););out tags geom;
```
