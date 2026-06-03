"""
Tests for the PriorityQueue data structure (FND-003).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.priority_queue import PriorityQueue


def test_push_pop_min():
    """Test basic push/pop on min-heap."""
    pq = PriorityQueue(is_max_heap=False)
    pq.push("c", 3.0)
    pq.push("a", 1.0)
    pq.push("b", 2.0)

    assert pq.size == 3
    assert pq.pop() == "a"  # smallest priority
    assert pq.pop() == "b"
    assert pq.pop() == "c"
    assert pq.pop() is None
    assert pq.is_empty()
    print("  PASS test_push_pop_min")


def test_push_pop_max():
    """Test basic push/pop on max-heap."""
    pq = PriorityQueue(is_max_heap=True)
    pq.push("c", 3.0)
    pq.push("a", 1.0)
    pq.push("b", 2.0)

    assert pq.pop() == "c"  # largest priority
    assert pq.pop() == "b"
    assert pq.pop() == "a"
    assert pq.pop() is None
    print("  PASS test_push_pop_max")


def test_peek():
    """Test peek without removing."""
    pq = PriorityQueue()
    pq.push("x", 10.0)
    pq.push("y", 5.0)

    assert pq.peek() == "y"
    assert pq.peek_priority() == 5.0
    assert pq.size == 2  # not removed
    print("  PASS test_peek")


def test_pop_with_priority():
    """Test pop_with_priority returns both priority and item."""
    pq = PriorityQueue()
    pq.push("item", 42.0)
    result = pq.pop_with_priority()
    assert result == (42.0, "item")
    assert pq.pop_with_priority() is None
    print("  PASS test_pop_with_priority")


def test_top_k_min():
    """Test top_k on min-heap."""
    pq = PriorityQueue(is_max_heap=False)
    values = [
        ("d", 8.0),
        ("a", 2.0),
        ("e", 10.0),
        ("b", 4.0),
        ("c", 6.0),
    ]
    for item, prio in values:
        pq.push(item, prio)

    top3 = pq.top_k(3)
    assert len(top3) == 3
    assert top3 == ["a", "b", "c"]  # smallest 3 priorities
    print("  PASS test_top_k_min")


def test_top_k_max():
    """Test top_k on max-heap."""
    pq = PriorityQueue(is_max_heap=True)
    values = [
        ("d", 8.0),
        ("a", 2.0),
        ("e", 10.0),
        ("b", 4.0),
        ("c", 6.0),
    ]
    for item, prio in values:
        pq.push(item, prio)

    top3 = pq.top_k(3)
    assert len(top3) == 3
    assert top3 == ["e", "d", "c"]  # largest 3 priorities
    print("  PASS test_top_k_max")


def test_top_k_all():
    """Test top_k with k >= size returns all sorted."""
    pq = PriorityQueue()
    pq.push("b", 2.0)
    pq.push("a", 1.0)
    pq.push("c", 3.0)

    result = pq.top_k(10)
    assert len(result) == 3
    assert result == ["a", "b", "c"]
    print("  PASS test_top_k_all")


def test_top_k_zero():
    """Test top_k with k=0 returns empty."""
    pq = PriorityQueue()
    pq.push("a", 1.0)
    assert pq.top_k(0) == []
    print("  PASS test_top_k_zero")


def test_empty_operations():
    """Test operations on empty queue."""
    pq = PriorityQueue()
    assert pq.pop() is None
    assert pq.peek() is None
    assert pq.peek_priority() is None
    assert pq.is_empty()
    assert not pq  # __bool__
    assert len(pq) == 0
    assert pq.top_k(5) == []
    print("  PASS test_empty_operations")


def test_clear():
    """Test clearing the queue."""
    pq = PriorityQueue()
    pq.push("a", 1.0)
    pq.push("b", 2.0)
    pq.clear()
    assert pq.size == 0
    assert pq.is_empty()
    print("  PASS test_clear")


def test_items():
    """Test items() returns all entries."""
    pq = PriorityQueue()
    pq.push("x", 5.0)
    pq.push("y", 3.0)
    items = pq.items()
    assert "x" in items
    assert "y" in items
    assert len(items) == 2
    print("  PASS test_items")


def test_large_heap():
    """Test with many entries to stress heap properties."""
    pq = PriorityQueue()
    import random
    random.seed(42)
    n = 500
    values = list(range(n))
    random.shuffle(values)
    for v in values:
        pq.push(v, float(v))

    # Pop should return in sorted ascending order
    prev = -1
    for _ in range(n):
        cur = pq.pop()
        assert cur is not None
        assert cur >= prev
        prev = cur
    print(f"  PASS test_large_heap (n={n})")


def test_duplicate_priorities():
    """Test handling of identical priorities."""
    pq = PriorityQueue()
    pq.push("b", 1.0)
    pq.push("a", 1.0)
    pq.push("c", 1.0)

    results = []
    while not pq.is_empty():
        results.append(pq.pop())
    assert len(results) == 3
    assert set(results) == {"a", "b", "c"}
    print("  PASS test_duplicate_priorities")


def test_repr_and_iter():
    """Test repr and iteration."""
    pq = PriorityQueue(is_max_heap=True)
    pq.push("a", 1.0)
    r = repr(pq)
    assert "max-heap" in r
    assert "PriorityQueue" in r

    items = list(pq)
    assert "a" in items
    print("  PASS test_repr_and_iter")


def run_all():
    print("Running PriorityQueue tests (FND-003)...")
    test_push_pop_min()
    test_push_pop_max()
    test_peek()
    test_pop_with_priority()
    test_top_k_min()
    test_top_k_max()
    test_top_k_all()
    test_top_k_zero()
    test_empty_operations()
    test_clear()
    test_items()
    test_large_heap()
    test_duplicate_priorities()
    test_repr_and_iter()
    print("All PriorityQueue tests PASSED!\n")


if __name__ == "__main__":
    run_all()
