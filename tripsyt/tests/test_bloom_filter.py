"""
Tests for the BloomFilter data structure (FND-008).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.bloom_filter import BloomFilter


def test_add_contains():
    """Test basic add and contains."""
    bf = BloomFilter(expected_size=100, false_positive_rate=0.01)
    bf.add("hello")
    bf.add("world")

    assert bf.contains("hello") is True
    assert bf.contains("world") is True
    assert bf.contains("missing") is False
    print("  PASS test_add_contains")


def test_no_false_negatives():
    """Test that contains never returns False for added items."""
    bf = BloomFilter(expected_size=500, false_positive_rate=0.01)
    items = [f"item_{i}" for i in range(200)]
    for item in items:
        bf.add(item)

    for item in items:
        assert bf.contains(item) is True, f"False negative for {item}"
    print("  PASS test_no_false_negatives")


def test_false_positive_rate():
    """Test that false positive rate is within expected bounds."""
    bf = BloomFilter(expected_size=500, false_positive_rate=0.01)
    # Add 500 items
    for i in range(500):
        bf.add(f"real_{i}")

    # Check 1000 items that were never added
    false_positives = 0
    test_count = 1000
    for i in range(test_count):
        if bf.contains(f"fake_{i}"):
            false_positives += 1

    fp_rate = false_positives / test_count
    # Should be reasonably close to 0.01 (generous bounds)
    assert fp_rate < 0.1, f"FP rate {fp_rate} too high"
    print(f"  PASS test_false_positive_rate (observed={fp_rate:.4f})")


def test_estimated_size():
    """Test the estimated_size property."""
    bf = BloomFilter(expected_size=100, false_positive_rate=0.01)
    for i in range(50):
        bf.add(f"item_{i}")

    est = bf.estimated_size
    # Should be approximately 50 (within an order of magnitude)
    assert 10 < est < 500, f"Estimated size {est} unreasonable"
    print(f"  PASS test_estimated_size (inserted=50, estimated={est})")


def test_clear():
    """Test clearing the filter."""
    bf = BloomFilter(expected_size=100)
    bf.add("test")
    assert bf.contains("test") is True
    bf.clear()
    assert bf.contains("test") is False
    assert len(bf) == 0
    print("  PASS test_clear")


def test_init_validation():
    """Test constructor validation."""
    try:
        BloomFilter(expected_size=0)
        assert False, "Expected ValueError"
    except ValueError:
        pass

    try:
        BloomFilter(false_positive_rate=0.0)
        assert False, "Expected ValueError"
    except ValueError:
        pass

    try:
        BloomFilter(false_positive_rate=1.0)
        assert False, "Expected ValueError"
    except ValueError:
        pass
    print("  PASS test_init_validation")


def test_magic_methods():
    """Test __contains__, __len__, __repr__."""
    bf = BloomFilter(expected_size=50)
    bf.add("x")
    assert "x" in bf
    assert "y" not in bf
    assert len(bf) == 1

    r = repr(bf)
    assert "BloomFilter" in r
    assert "bits=" in r
    print("  PASS test_magic_methods")


def test_different_types():
    """Test that int and other types work (converted via str)."""
    bf = BloomFilter(expected_size=100)
    bf.add(42)
    bf.add(3.14)
    bf.add(True)

    assert bf.contains(42) is True
    assert bf.contains(3.14) is True
    assert bf.contains(True) is True
    assert bf.contains(99) is False
    print("  PASS test_different_types")


def test_duplicate_adds():
    """Test adding the same item multiple times."""
    bf = BloomFilter(expected_size=100)
    for _ in range(10):
        bf.add("duplicate")
    # Should still only count as present
    assert bf.contains("duplicate") is True
    print("  PASS test_duplicate_adds")


def run_all():
    print("Running BloomFilter tests (FND-008)...")
    test_add_contains()
    test_no_false_negatives()
    test_false_positive_rate()
    test_estimated_size()
    test_clear()
    test_init_validation()
    test_magic_methods()
    test_different_types()
    test_duplicate_adds()
    print("All BloomFilter tests PASSED!\n")


if __name__ == "__main__":
    run_all()
