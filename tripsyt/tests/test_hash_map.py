"""
Tests for the HashMap data structure (FND-002).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.hash_map import HashMap


def test_put_get():
    """Test basic put and get operations."""
    hm = HashMap()
    hm.put("name", "TripSyt")
    hm.put("version", 1)
    hm.put("active", True)

    assert hm.get("name") == "TripSyt"
    assert hm.get("version") == 1
    assert hm.get("active") is True
    assert hm.get("missing") is None
    assert hm.size == 3
    print("  PASS test_put_get")


def test_put_update():
    """Test that put updates existing keys."""
    hm = HashMap()
    hm.put("x", 10)
    hm.put("x", 20)
    assert hm.get("x") == 20
    assert hm.size == 1
    print("  PASS test_put_update")


def test_remove():
    """Test remove operations."""
    hm = HashMap()
    hm.put("a", 1)
    hm.put("b", 2)
    hm.put("c", 3)

    assert hm.remove("b") is True
    assert hm.get("b") is None
    assert hm.size == 2
    assert hm.contains("a") is True
    assert hm.contains("b") is False

    # Removing non-existent key
    assert hm.remove("missing") is False
    print("  PASS test_remove")


def test_contains():
    """Test contains checks."""
    hm = HashMap()
    hm.put("key1", "val1")

    assert hm.contains("key1") is True
    assert hm.contains("key2") is False
    print("  PASS test_contains")


def test_resize():
    """Test that the map auto-resizes when load factor exceeded."""
    hm = HashMap(initial_capacity=4, load_factor=0.5)
    # load factor 0.5 means resize at size > 2
    hm.put("a", 1)
    hm.put("b", 2)
    assert hm.capacity == 4
    hm.put("c", 3)  # size becomes 3, 3/4 > 0.5
    assert hm.capacity == 8

    # All data should survive resize
    assert hm.get("a") == 1
    assert hm.get("b") == 2
    assert hm.get("c") == 3
    assert hm.size == 3
    print("  PASS test_resize")


def test_keys_values_items():
    """Test bulk retrieval methods."""
    hm = HashMap()
    hm.put("x", 10)
    hm.put("y", 20)

    keys = hm.keys()
    assert sorted(keys) == ["x", "y"]

    values = hm.values()
    assert sorted(values) == [10, 20]

    items = hm.items()
    assert len(items) == 2
    assert ("x", 10) in items
    print("  PASS test_keys_values_items")


def test_clear():
    """Test clearing the map."""
    hm = HashMap()
    hm.put("a", 1)
    hm.put("b", 2)
    hm.clear()
    assert hm.size == 0
    assert hm.get("a") is None
    assert len(hm) == 0
    print("  PASS test_clear")


def test_integer_keys():
    """Test that integer keys work correctly."""
    hm = HashMap()
    hm.put(1, "one")
    hm.put(2, "two")
    hm.put(100, "hundred")

    assert hm.get(1) == "one"
    assert hm.get(100) == "hundred"
    assert hm.contains(2) is True
    hm.remove(2)
    assert hm.get(2) is None
    assert hm.size == 2
    print("  PASS test_integer_keys")


def test_magic_methods():
    """Test __getitem__, __setitem__, __delitem__, __contains__, __len__, __iter__."""
    hm = HashMap()
    hm["name"] = "TripSyt"
    hm["version"] = 2

    assert hm["name"] == "TripSyt"
    assert "name" in hm
    assert "missing" not in hm
    assert len(hm) == 2

    del hm["version"]
    assert "version" not in hm
    assert len(hm) == 1

    # KeyError on missing get
    try:
        _ = hm["missing_key"]
        assert False, "Expected KeyError"
    except KeyError:
        pass

    # KeyError on missing delete
    try:
        del hm["missing_key"]
        assert False, "Expected KeyError"
    except KeyError:
        pass

    keys = list(hm)
    assert keys == ["name"] or "name" in keys
    print("  PASS test_magic_methods")


def test_collision_handling():
    """Test that chaining handles collisions correctly."""
    hm = HashMap(initial_capacity=1)  # Force all entries into one bucket
    for i in range(100):
        hm.put(f"key_{i}", i)

    assert hm.size == 100
    for i in range(100):
        assert hm.get(f"key_{i}") == i

    # Remove half
    for i in range(50):
        assert hm.remove(f"key_{i}") is True

    assert hm.size == 50
    for i in range(50, 100):
        assert hm.get(f"key_{i}") == i
    print("  PASS test_collision_handling")


def test_large_dataset():
    """Test with a larger dataset to verify performance characteristics."""
    hm = HashMap(initial_capacity=32)
    n = 1000
    for i in range(n):
        hm.put(f"item_{i}", i * 2)

    assert hm.size == n
    assert hm.get("item_0") == 0
    assert hm.get(f"item_{n - 1}") == (n - 1) * 2

    # Verify all entries
    for i in range(n):
        assert hm.get(f"item_{i}") == i * 2

    print(f"  PASS test_large_dataset (n={n}, capacity={hm.capacity})")


def test_init_validation():
    """Test constructor validation."""
    try:
        HashMap(initial_capacity=0)
        assert False, "Expected ValueError"
    except ValueError:
        pass

    try:
        HashMap(load_factor=0.0)
        assert False, "Expected ValueError"
    except ValueError:
        pass

    try:
        HashMap(load_factor=1.5)
        assert False, "Expected ValueError"
    except ValueError:
        pass
    print("  PASS test_init_validation")


def test_repr():
    """Test repr contains meaningful information."""
    hm = HashMap()
    hm.put("k", "v")
    r = repr(hm)
    assert "HashMap" in r
    assert "k" in r
    print("  PASS test_repr")


def run_all():
    print("Running HashMap tests (FND-002)...")
    test_put_get()
    test_put_update()
    test_remove()
    test_contains()
    test_resize()
    test_keys_values_items()
    test_clear()
    test_integer_keys()
    test_magic_methods()
    test_collision_handling()
    test_large_dataset()
    test_init_validation()
    test_repr()
    print("All HashMap tests PASSED!\n")


if __name__ == "__main__":
    run_all()
