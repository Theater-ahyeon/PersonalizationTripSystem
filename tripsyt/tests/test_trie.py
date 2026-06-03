"""
Tests for the Trie data structure (FND-004).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.trie import Trie


def test_insert_search():
    """Test basic insert and exact search."""
    trie = Trie()
    trie.insert("故宫", {"id": 1, "name": "故宫"})
    trie.insert("长城", {"id": 2, "name": "长城"})
    trie.insert("故宫博物院", {"id": 3, "name": "故宫博物院"})

    assert trie.search("故宫") == {"id": 1, "name": "故宫"}
    assert trie.search("长城") == {"id": 2, "name": "长城"}
    assert trie.search("故宫博物院") == {"id": 3, "name": "故宫博物院"}
    assert trie.search("天安门") is None
    assert trie.word_count == 3
    print("  PASS test_insert_search")


def test_insert_update():
    """Test that inserting an existing word updates data."""
    trie = Trie()
    trie.insert("test", "old")
    assert trie.search("test") == "old"
    trie.insert("test", "new")
    assert trie.search("test") == "new"
    assert trie.word_count == 1  # count shouldn't double
    print("  PASS test_insert_update")


def test_prefix_search():
    """Test prefix-based autocomplete."""
    trie = Trie()
    words = ["故宫", "故宫博物院", "长城", "长白山", "天安门"]
    for w in words:
        trie.insert(w, w)

    r1 = trie.prefix_search("故")
    assert len(r1) == 2
    assert "故宫" in r1
    assert "故宫博物院" in r1

    r2 = trie.prefix_search("长")
    assert len(r2) == 2
    assert "长城" in r2
    assert "长白山" in r2

    r3 = trie.prefix_search("天")
    assert len(r3) == 1
    assert "天安门" in r3

    r4 = trie.prefix_search("不存在的")
    assert len(r4) == 0
    print("  PASS test_prefix_search")


def test_prefix_search_limit():
    """Test prefix search respects the limit parameter."""
    trie = Trie()
    for i in range(50):
        trie.insert(f"item_{i:03d}", i)

    results = trie.prefix_search("item_", limit=5)
    assert len(results) == 5
    print("  PASS test_prefix_search_limit")


def test_fuzzy_search_exact():
    """Test fuzzy search with max_distance=0 (exact only)."""
    trie = Trie()
    trie.insert("hello", "world")
    results = trie.fuzzy_search("hello", max_distance=0)
    assert len(results) == 1
    assert results[0] == ("hello", "world", 0)
    print("  PASS test_fuzzy_search_exact")


def test_fuzzy_search_near():
    """Test fuzzy search with non-zero distance."""
    trie = Trie()
    trie.insert("故宫", "data_gugong")
    trie.insert("长城", "data_changcheng")
    trie.insert("天安门", "data_tiananmen")

    # One substitution
    results = trie.fuzzy_search("古宫", max_distance=1)
    assert len(results) >= 1
    matched_words = [r[0] for r in results]
    assert "故宫" in matched_words

    # One insertion
    results = trie.fuzzy_search("长程", max_distance=1)
    matched_words = [r[0] for r in results]
    # "长程" -> "长城" is 1 substitution
    assert "长城" in matched_words

    print("  PASS test_fuzzy_search_near")


def test_edit_distance():
    """Test the standalone Levenshtein distance."""
    assert Trie._edit_distance("abc", "abc") == 0
    assert Trie._edit_distance("abc", "abd") == 1
    assert Trie._edit_distance("abc", "ab") == 1
    assert Trie._edit_distance("abc", "abcd") == 1
    assert Trie._edit_distance("kitten", "sitting") == 3
    assert Trie._edit_distance("", "") == 0
    assert Trie._edit_distance("abc", "") == 3
    print("  PASS test_edit_distance")


def test_delete():
    """Test word deletion."""
    trie = Trie()
    trie.insert("abc", 1)
    trie.insert("abd", 2)
    trie.insert("xyz", 3)

    assert trie.delete("abc") is True
    assert trie.search("abc") is None
    assert trie.word_count == 2

    # "abd" should still exist (shared prefix "ab" shouldn't be removed)
    assert trie.search("abd") == 2

    # Delete non-existent
    assert trie.delete("zzz") is False
    print("  PASS test_delete")


def test_contains_magic():
    """Test __contains__."""
    trie = Trie()
    trie.insert("test", 1)
    assert "test" in trie
    assert "missing" not in trie
    print("  PASS test_contains_magic")


def test_len_and_repr():
    """Test __len__ and __repr__."""
    trie = Trie()
    trie.insert("a", 1)
    trie.insert("b", 2)
    assert len(trie) == 2
    assert "Trie" in repr(trie)
    print("  PASS test_len_and_repr")


def test_fuzzy_empty_trie():
    """Test fuzzy search on empty trie."""
    trie = Trie()
    results = trie.fuzzy_search("anything", max_distance=2)
    assert results == []
    print("  PASS test_fuzzy_empty_trie")


def test_large_dataset():
    """Test with many Chinese words for realistic usage."""
    trie = Trie()
    spots = [
        "故宫", "长城", "天安门", "颐和园", "天坛",
        "北海公园", "圆明园", "雍和宫", "景山公园", "中山公园",
        "故宫博物院", "长城八达岭", "长城慕田峪", "天安门广场",
        "颐和园昆明湖", "天坛祈年殿",
    ]
    for name in spots:
        trie.insert(name, {"name": name})

    assert trie.word_count == len(spots)

    # Prefix search
    gu = trie.prefix_search("故")
    assert len(gu) == 2

    chang = trie.prefix_search("长")
    assert len(chang) == 3

    print(f"  PASS test_large_dataset ({len(spots)} words)")


def run_all():
    print("Running Trie tests (FND-004)...")
    test_insert_search()
    test_insert_update()
    test_prefix_search()
    test_prefix_search_limit()
    test_fuzzy_search_exact()
    test_fuzzy_search_near()
    test_edit_distance()
    test_delete()
    test_contains_magic()
    test_len_and_repr()
    test_fuzzy_empty_trie()
    test_large_dataset()
    print("All Trie tests PASSED!\n")


if __name__ == "__main__":
    run_all()
