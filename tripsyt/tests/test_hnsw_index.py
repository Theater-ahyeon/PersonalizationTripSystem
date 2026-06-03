"""
Tests for the HNSWIndex data structure (FND-007).
"""

import os
import sys
import math

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.hnsw_index import HNSWIndex


def test_init_validation():
    """Test constructor validation."""
    try:
        HNSWIndex(dimension=0)
        assert False, "Expected ValueError"
    except ValueError:
        pass

    try:
        HNSWIndex(dimension=2, M=1)
        assert False, "Expected ValueError"
    except ValueError:
        pass

    idx = HNSWIndex(dimension=3, M=8, ef_construction=100)
    assert idx.dimension == 3
    assert idx.M == 8
    assert idx.ef_construction == 100
    assert len(idx) == 0
    print("  PASS test_init_validation")


def test_insert_single():
    """Test inserting a single vector."""
    idx = HNSWIndex(dimension=2)
    node_id = idx.insert([1.0, 2.0], "data_1")
    assert node_id == 0
    assert idx.node_count == 1
    assert idx.entry_point == 0
    print("  PASS test_insert_single")


def test_insert_dimension_mismatch():
    """Test that wrong-dimension vectors are rejected."""
    idx = HNSWIndex(dimension=3)
    try:
        idx.insert([1.0, 2.0])  # only 2 elements
        assert False, "Expected ValueError"
    except ValueError:
        pass
    print("  PASS test_insert_dimension_mismatch")


def test_basic_search():
    """Test basic search on a small dataset."""
    idx = HNSWIndex(dimension=2, M=4, ef_construction=50)

    # Insert some 2D points
    points = [
        ([0.0, 0.0], "origin"),
        ([1.0, 0.0], "right"),
        ([0.0, 1.0], "up"),
        ([1.0, 1.0], "diag"),
        ([2.0, 2.0], "far"),
        ([0.5, 0.5], "mid"),
    ]
    for vec, ref in points:
        idx.insert(vec, ref)

    # Search near origin
    results = idx.search([0.0, 0.0], k=3)
    assert len(results) == 3
    refs = [r[0] for r in results]
    assert "origin" in refs  # closest should be origin

    # Distances should be non-decreasing
    dists = [r[1] for r in results]
    for i in range(len(dists) - 1):
        assert dists[i] <= dists[i + 1], f"Distances not sorted: {dists}"

    print(f"  PASS test_basic_search (results: {[(r[0], f'{r[1]:.2f}') for r in results]})")


def test_search_empty():
    """Test that search on empty index returns empty list."""
    idx = HNSWIndex(dimension=2)
    results = idx.search([1.0, 2.0])
    assert results == []
    print("  PASS test_search_empty")


def test_higher_dimension():
    """Test with higher-dimensional vectors."""
    dim = 8
    idx = HNSWIndex(dimension=dim, M=6, ef_construction=100)

    # Generate random vectors
    import random
    random.seed(42)
    vectors = []
    for i in range(50):
        vec = [random.random() for _ in range(dim)]
        vectors.append(vec)
        idx.insert(vec, f"vec_{i}")

    # Query the first vector
    results = idx.search(vectors[0], k=5)
    assert len(results) == 5
    # The first result should be vec_0 itself (or very close)
    assert results[0][0] == "vec_0" or results[0][1] < 0.1

    print(f"  PASS test_higher_dimension (first result: {results[0][0]}, dist={results[0][1]:.4f})")


def test_euclidean_distance():
    """Test the static Euclidean distance."""
    d = HNSWIndex._euclidean_distance([0.0, 0.0], [3.0, 4.0])
    assert math.isclose(d, 5.0)
    d = HNSWIndex._euclidean_distance([1.0, 1.0, 1.0], [1.0, 1.0, 1.0])
    assert d == 0.0
    d = HNSWIndex._euclidean_distance([1.0, 2.0, 3.0], [4.0, 5.0, 6.0])
    expected = math.sqrt(27)  # 3^2 + 3^2 + 3^2
    assert math.isclose(d, expected)
    print("  PASS test_euclidean_distance")


def test_repr():
    """Test repr."""
    idx = HNSWIndex(dimension=4, M=8)
    idx.insert([0.0, 0.0, 0.0, 0.0], "test")
    r = repr(idx)
    assert "HNSWIndex" in r
    assert "dim=4" in r
    print("  PASS test_repr")


def run_all():
    print("Running HNSWIndex tests (FND-007)...")
    test_init_validation()
    test_insert_single()
    test_insert_dimension_mismatch()
    test_basic_search()
    test_search_empty()
    test_higher_dimension()
    test_euclidean_distance()
    test_repr()
    print("All HNSWIndex tests PASSED!\n")


if __name__ == "__main__":
    run_all()
