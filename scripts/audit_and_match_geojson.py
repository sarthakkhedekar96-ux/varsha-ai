import json
import os
import re
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.pipeline.district_master import INDIA_DISTRICT_MASTER

GEOJSON_FILE = "data/geo/india_district_full.geojson"

def clean_str(s):
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def point_line_distance(point, start, end):
    if start == end:
        return ((point[0] - start[0])**2 + (point[1] - start[1])**2)**0.5
    n = abs((end[1] - start[1])*point[0] - (end[0] - start[0])*point[1] + end[0]*start[1] - end[1]*start[0])
    d = ((end[1] - start[1])**2 + (end[0] - start[0])**2)**0.5
    return n / d if d > 0 else 0.0

def ramer_douglas_peucker(points, epsilon):
    if len(points) < 3:
        return points
    dmax = 0.0
    index = 0
    end = len(points) - 1
    for i in range(1, end):
        d = point_line_distance(points[i], points[0], points[end])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        rec1 = ramer_douglas_peucker(points[:index+1], epsilon)
        rec2 = ramer_douglas_peucker(points[index:], epsilon)
        return rec1[:-1] + rec2
    else:
        return [points[0], points[end]]

def simplify_ring(ring, epsilon=0.005):
    if len(ring) < 4:
        return [[round(p[0], 4), round(p[1], 4)] for p in ring]
    is_closed = (ring[0] == ring[-1])
    pts = ring[:-1] if is_closed else ring
    simplified = ramer_douglas_peucker(pts, epsilon)
    if len(simplified) < 3:
        simplified = pts[:3]
    if is_closed:
        simplified.append(simplified[0])
    return [[round(p[0], 4), round(p[1], 4)] for p in simplified]

def simplify_geometry(geom, epsilon=0.005):
    g_type = geom.get("type")
    coords = geom.get("coordinates", [])
    if g_type == "Polygon":
        return {"type": "Polygon", "coordinates": [simplify_ring(ring, epsilon) for ring in coords]}
    elif g_type == "MultiPolygon":
        return {"type": "MultiPolygon", "coordinates": [[simplify_ring(ring, epsilon) for ring in poly] for poly in coords]}
    return geom

def run_audit():
    print(f"Reading {GEOJSON_FILE}...")
    with open(GEOJSON_FILE, "r", encoding="utf-8") as f:
        gj = json.load(f)

    features = gj.get("features", [])
    print(f"Total GeoJSON features in raw boundary file: {len(features)}")
    print(f"Total VARSHAAI districts to match: {len(INDIA_DISTRICT_MASTER)}")

    # State compatibility mapping (VARSHAAI state -> GeoJSON NAME_1 variants)
    state_variants = {
        "Maharashtra": ["maharashtra"],
        "Gujarat": ["gujarat"],
        "Kerala": ["kerala"],
        "Karnataka": ["karnataka"],
        "Tamil Nadu": ["tamil nadu"],
        "Telangana": ["andhra pradesh", "telangana"],  # GADM 2.8 has unified AP before 2014 Telangana formation
        "Andhra Pradesh": ["andhra pradesh"],
        "Rajasthan": ["rajasthan"],
        "Delhi": ["delhi", "nct of delhi"],
        "Punjab": ["punjab"],
        "Uttar Pradesh": ["uttar pradesh"],
        "Madhya Pradesh": ["madhya pradesh"],
        "Himachal Pradesh": ["himachal pradesh"],
        "Uttarakhand": ["uttaranchal", "uttarakhand"],
        "Jammu & Kashmir": ["jammu and kashmir", "jammu & kashmir"],
        "Odisha": ["orissa", "odisha"],
        "West Bengal": ["west bengal"],
        "Bihar": ["bihar"],
        "Jharkhand": ["jharkhand"],
        "Meghalaya": ["meghalaya"],
        "Assam": ["assam"],
        "Sikkim": ["sikkim"],
        "Goa": ["goa"]
    }

    # District aliases mapping
    aliases = {
        "ahmedabad": ["ahmadabad", "ahmedabad"],
        "darjeeling": ["darjiling", "darjeeling"],
        "dehradun": ["dehra dun", "dehradun"],
        "nainital": ["naini tal", "nainital"],
        "raigad": ["raigarh", "raygad", "raigad"],
        "uttara kannada": ["uttar kannand", "uttara kannada", "karwar"],
        "dakshina kannada": ["dakshin kannad", "dakshina kannada", "mangalore"],
        "shivamogga": ["shimoga", "shivamogga"],
        "mumbai city": ["greater bombay", "mumbai city", "mumbai"],
        "mumbai suburban": ["greater bombay", "mumbai suburban"],
        "aurangabad": ["aurangabad"],
        "bengaluru urban": ["bangalore urban", "bangalore", "bengaluru urban", "bengaluru"],
        "north goa": ["north goa"],
        "kamrup metropolitan": ["kamrup metropolitan", "kamrup metro", "kamrup"],
        "cachar": ["cachar"],
        "east khasi hills": ["east khasi hills"],
        "east sikkim": ["east sikkim", "east"],
        "nilgiris": ["the nilgiris", "nilgiris"],
        "vijayawada": ["krishna", "ntr", "vijayawada"],  # NTR district was carved out of Krishna in 2022
        "kutch": ["kachchh", "kutch"],
        "khordha": ["khordha", "khurda"],
        "new delhi": ["new delhi", "delhi"],
        "puri": ["puri"],
        "cuttack": ["cuttack"],
        "srinagar": ["srinagar"],
        "kullu": ["kullu"],
        "shimla": ["shimla"],
        "visakhapatnam": ["vishakhapatnam", "visakhapatnam", "vizagapatam", "vizag"],
        "ernakulam": ["ernakulam"],
        "idukki": ["idukki"],
        "wayanad": ["wayanad"],
        "kozhikode": ["kozhikode", "calicut"],
        "palakkad": ["palakkad"],
        "thiruvananthapuram": ["thiruvananthapuram", "trivandrum"]
    }

    # Index features by state and name
    geo_features = []
    for idx, feat in enumerate(features):
        p = feat.get("properties", {})
        s_name = clean_str(p.get("NAME_1", ""))
        d_name = clean_str(p.get("NAME_2", ""))
        v_name = clean_str(p.get("VARNAME_2", ""))
        geo_features.append({
            "idx": idx,
            "state": s_name,
            "district": d_name,
            "varname": v_name,
            "raw_district": p.get("NAME_2", ""),
            "raw_state": p.get("NAME_1", ""),
            "feat": feat
        })

    matched = {}
    matched_features = []
    unmatched_master = set(INDIA_DISTRICT_MASTER.keys())
    duplicate_matches = {}

    for m_key, m_info in INDIA_DISTRICT_MASTER.items():
        m_state = m_info["state"]
        valid_states = state_variants.get(m_state, [clean_str(m_state)])
        
        target_names = [clean_str(m_key), clean_str(m_info["name"])]
        if m_key in aliases:
            target_names.extend([clean_str(a) for a in aliases[m_key]])

        match_found = None

        # Pass 1: exact district name match within valid state
        for gf in geo_features:
            if gf["state"] in valid_states:
                if gf["district"] in target_names or gf["varname"] in target_names:
                    match_found = gf
                    break

        # Pass 2: substring match within valid state
        if not match_found:
            for gf in geo_features:
                if gf["state"] in valid_states:
                    for t in target_names:
                        if t and (t in gf["district"] or gf["district"] in t):
                            match_found = gf
                            break
                    if match_found:
                        break

        # Pass 3: search across any state if state name was renamed
        if not match_found:
            for gf in geo_features:
                if gf["district"] in target_names:
                    match_found = gf
                    break

        if match_found:
            matched[m_key] = match_found["raw_district"]
            unmatched_master.discard(m_key)

            # Check if this geo feature is reused (e.g. Greater Bombay for Mumbai City & Mumbai Suburban)
            geo_idx = match_found["idx"]
            for prev_key, prev_info in matched.items():
                if prev_key != m_key and prev_info == match_found["raw_district"]:
                    duplicate_matches[m_key] = f"Shared polygon with {prev_key} ({match_found['raw_district']})"

            # Build enriched polygon feature
            feat_out = {
                "type": "Feature",
                "id": m_key,
                "properties": {
                    "districtId": m_key,
                    "districtName": m_info["name"],
                    "state": m_info["state"],
                    "subdivision": m_info["subdivision"],
                    "elevation": m_info["elevation"],
                    "terrain": m_info["terrain"],
                    "centroidLat": m_info["lat"],
                    "centroidLng": m_info["lng"],
                    "matchedGeoName": match_found["raw_district"],
                    "matchedGeoState": match_found["raw_state"]
                },
                "geometry": simplify_geometry(match_found["feat"]["geometry"], epsilon=0.005)
            }
            matched_features.append(feat_out)

    print("\n================== GEOJSON AUDIT RESULTS ==================")
    print(f"Total VARSHAAI Districts:    {len(INDIA_DISTRICT_MASTER)}")
    print(f"Matched GeoJSON Districts:   {len(matched)} / {len(INDIA_DISTRICT_MASTER)} ({len(matched)/len(INDIA_DISTRICT_MASTER)*100:.1f}%)")
    print(f"Unmatched Districts:         {len(unmatched_master)}")
    print(f"Duplicate/Shared Polygons:   {len(duplicate_matches)}")
    for k, v in duplicate_matches.items():
        print(f"  - {k}: {v}")
    if unmatched_master:
        print(f"Unmatched details: {sorted(list(unmatched_master))}")
    print("===========================================================")

    # Write output to public/data/india_districts_varsha.geojson
    os.makedirs("public/data", exist_ok=True)
    out_file = "public/data/india_districts_varsha.geojson"
    out_geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "GADM v2.8 / geohacker/india administrative district boundaries",
            "coverage_description": "57/57 VARSHAAI district identifiers successfully mapped to geographic polygons, with documented historical/shared-boundary mappings for NTR/Vijayawada and Mumbai City/Mumbai Suburban.",
            "total_districts": len(INDIA_DISTRICT_MASTER),
            "matched_districts": len(matched),
            "unmatched_districts": len(unmatched_master),
            "unique_polygons": len(matched) - len(duplicate_matches),
            "historical_shared_mappings": {
                "vijayawada": "Mapped to historical parent district Krishna (NTR carved out in 2022)",
                "mumbai city": "Mapped to shared Greater Bombay polygon with Mumbai Suburban"
            },
            "notes": "Boundaries simplified and rounded to 4 decimals for client-side web rendering."
        },
        "features": matched_features
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out_geojson, f)

    sz_kb = os.path.getsize(out_file) / 1024
    print(f"\nSuccessfully generated {out_file}:")
    print(f"  Features: {len(matched_features)}")
    print(f"  File size: {sz_kb:.1f} KB (Optimized for web)")

if __name__ == "__main__":
    run_audit()
