"""Tests for GeoHash encoding/decoding (FND-005)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from core.geo_hash import GeoHash

def test_encode_decode_roundtrip():
    cases = [(39.9042, 116.4074, 10), (31.2304, 121.4737, 10),
             (22.5431, 114.0579, 10), (0.0, 0.0, 8)]
    for lat, lng, prec in cases:
        gh = GeoHash.encode(lat, lng, prec)
        assert len(gh) == prec
        dlat, dlng = GeoHash.decode(gh)
        assert abs(dlat - lat) < 1.0
        assert abs(dlng - lng) < 1.0
    print("  PASS test_encode_decode_roundtrip")

def test_precision_increases_accuracy():
    lat, lng = 39.9042, 116.4074
    gh6 = GeoHash.encode(lat, lng, 6)
    gh10 = GeoHash.encode(lat, lng, 10)
    dlat6, dlng6 = GeoHash.decode(gh6)
    dlat10, dlng10 = GeoHash.decode(gh10)
    err6 = abs(dlat6 - lat) + abs(dlng6 - lng)
    err10 = abs(dlat10 - lat) + abs(dlng10 - lng)
    assert err10 <= err6
    print("  PASS test_precision_increases_accuracy")

def test_bbox():
    gh = GeoHash.encode(39.9042, 116.4074, 6)
    mn_lat, mn_lng, mx_lat, mx_lng = GeoHash.bbox(gh)
    clat, clng = GeoHash.decode(gh)
    assert mn_lat <= clat <= mx_lat
    assert mn_lng <= clng <= mx_lng
    print("  PASS test_bbox")

def test_neighbors():
    gh = GeoHash.encode(39.9042, 116.4074, 6)
    nbrs = GeoHash.neighbors(gh)
    assert len(nbrs) == 8
    assert len(set(nbrs)) == 8
    for n in nbrs:
        assert len(n) == len(gh)
    print("  PASS test_neighbors")

def test_validation():
    try: GeoHash.encode(91, 0); assert False
    except ValueError: pass
    try: GeoHash.encode(0, 181); assert False
    except ValueError: pass
    try: GeoHash.encode(0, 0, 0); assert False
    except ValueError: pass
    try: GeoHash.encode(0, 0, 13); assert False
    except ValueError: pass
    try: GeoHash.decode("!"); assert False
    except ValueError: pass
    print("  PASS test_validation")

def run_all():
    print("Running GeoHash tests (FND-005)...")
    test_encode_decode_roundtrip()
    test_precision_increases_accuracy()
    test_bbox()
    test_neighbors()
    test_validation()
    print("All GeoHash tests PASSED!\n")

if __name__ == "__main__":
    run_all()
