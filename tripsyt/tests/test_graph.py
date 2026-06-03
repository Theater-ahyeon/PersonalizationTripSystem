"""
Tests for the Graph data structure (FND-001).
"""

import os
import sys
import json
import tempfile

# Ensure src is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.graph import Graph


def test_add_vertex():
    """Test adding vertices."""
    g = Graph()
    g.add_vertex(1, {"name": "Gate"})
    g.add_vertex(2)

    assert g.has_vertex(1)
    assert g.has_vertex(2)
    assert not g.has_vertex(3)
    assert g.vertex_count() == 2
    assert g.get_vertex(1) == {"name": "Gate"}
    assert g.get_vertex(2) is None
    print("  PASS test_add_vertex")


def test_add_edge_directed():
    """Test adding edges to a directed graph."""
    g = Graph(directed=True)
    g.add_edge(1, 2, weight=100.0, road_type="walk", congestion=0.8)
    g.add_edge(2, 3, weight=50.0, road_type="bike", congestion=0.5)

    assert g.vertex_count() == 3
    assert g.edge_count() == 2

    n1 = g.get_neighbors(1)
    assert len(n1) == 1
    assert n1[0] == (2, 100.0, "walk", 0.8)

    n2 = g.get_neighbors(2)
    assert len(n2) == 1
    assert n2[0] == (3, 50.0, "bike", 0.5)

    # Backwards edge should not exist in directed graph
    n3 = g.get_neighbors(3)
    assert len(n3) == 0
    print("  PASS test_add_edge_directed")


def test_add_edge_undirected():
    """Test adding edges to an undirected graph."""
    g = Graph(directed=False)
    g.add_edge(1, 2, weight=100.0, road_type="walk", congestion=0.8)

    assert g.vertex_count() == 2
    # Undirected: one add_edge creates two internal entries
    assert g.edge_count() == 2

    n1 = g.get_neighbors(1)
    assert len(n1) == 1
    assert n1[0][0] == 2

    n2 = g.get_neighbors(2)
    assert len(n2) == 1
    assert n2[0][0] == 1
    print("  PASS test_add_edge_undirected")


def test_remove_vertex():
    """Test removing a vertex and its edges."""
    g = Graph(directed=False)
    g.add_edge(1, 2, weight=100.0)
    g.add_edge(2, 3, weight=50.0)
    g.add_edge(1, 3, weight=200.0)

    assert g.vertex_count() == 3
    assert g.edge_count() == 6  # 3 undirected edges = 6 entries

    result = g.remove_vertex(2)
    assert result is True
    assert g.vertex_count() == 2
    assert not g.has_vertex(2)

    # Edge (1,3) should still exist, edges involving 2 should be gone
    n1 = g.get_neighbors(1)
    assert len(n1) == 1
    assert n1[0][0] == 3
    print("  PASS test_remove_vertex")


def test_remove_edge():
    """Test removing an edge."""
    g = Graph(directed=False)
    g.add_edge(1, 2, weight=100.0)
    g.add_edge(1, 3, weight=200.0)

    assert g.edge_count() == 4

    result = g.remove_edge(1, 2)
    assert result is True
    assert g.edge_count() == 2

    n1 = g.get_neighbors(1)
    assert len(n1) == 1
    assert n1[0][0] == 3
    print("  PASS test_remove_edge")


def test_get_edge():
    """Test getting edge metadata."""
    g = Graph(directed=True)
    g.add_edge(1, 2, weight=150.0, road_type="mixed", congestion=0.6)

    edge = g.get_edge(1, 2)
    assert edge is not None
    assert edge == (2, 150.0, "mixed", 0.6)

    edge = g.get_edge(2, 1)
    assert edge is None
    print("  PASS test_get_edge")


def test_serialization():
    """Test to_dict / from_dict round-trip."""
    g = Graph(directed=True)
    g.add_vertex(1, {"name": "A"})
    g.add_vertex(2, {"name": "B"})
    g.add_edge(1, 2, weight=100.0, road_type="bike", congestion=0.5)

    d = g.to_dict()
    assert d["directed"] is True
    assert len(d["vertices"]) == 2
    assert len(d["edges"]) == 1

    g2 = Graph.from_dict(d)
    assert g2.directed == g.directed
    assert g2.vertex_count() == g.vertex_count()
    assert g2.edge_count() == g.edge_count()
    assert g2.get_vertex(1) == {"name": "A"}
    assert g2.get_vertex(2) == {"name": "B"}

    n1 = g2.get_neighbors(1)
    assert len(n1) == 1
    assert n1[0] == (2, 100.0, "bike", 0.5)
    print("  PASS test_serialization")


def test_save_load():
    """Test save/load to JSON file."""
    g = Graph(directed=False)
    g.add_edge(1, 2, weight=50.0, road_type="walk")
    g.add_edge(2, 3, weight=75.0)

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        fpath = f.name

    try:
        g.save(fpath)
        g2 = Graph.load(fpath)
        assert g2.vertex_count() == 3
        assert g2.edge_count() == g.edge_count()
    finally:
        os.unlink(fpath)
    print("  PASS test_save_load")


def test_vertices_list():
    """Test vertices() method."""
    g = Graph()
    g.add_edge(10, 20, weight=5.0)
    g.add_edge(30, 40, weight=8.0)
    v = g.vertices()
    assert sorted(v) == [10, 20, 30, 40]
    print("  PASS test_vertices_list")


def test_magic_methods():
    """Test __repr__, __contains__, __len__, __iter__."""
    g = Graph(directed=True)
    g.add_edge(1, 2, weight=50.0)

    assert 1 in g
    assert 2 in g
    assert 3 not in g
    assert len(g) == 2
    assert list(g) == [1, 2]

    rep = repr(g)
    assert "Graph" in rep
    assert "directed=True" in rep
    print("  PASS test_magic_methods")


def test_update_vertex_data():
    """Test that adding an existing vertex updates its data."""
    g = Graph()
    g.add_vertex(1, "old")
    assert g.get_vertex(1) == "old"
    g.add_vertex(1, "new")
    assert g.get_vertex(1) == "new"
    print("  PASS test_update_vertex_data")


def run_all():
    print("Running Graph tests (FND-001)...")
    test_add_vertex()
    test_add_edge_directed()
    test_add_edge_undirected()
    test_remove_vertex()
    test_remove_edge()
    test_get_edge()
    test_serialization()
    test_save_load()
    test_vertices_list()
    test_magic_methods()
    test_update_vertex_data()
    print("All Graph tests PASSED!\n")


if __name__ == "__main__":
    run_all()
