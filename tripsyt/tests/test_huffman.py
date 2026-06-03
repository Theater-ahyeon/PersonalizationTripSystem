"""
Tests for the HuffmanCoding data structure (FND-006).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.huffman import HuffmanCoding


def _compression_ratio(original: bytes, compressed: bytes) -> float:
    """Calculate compression ratio: (1 - compressed/original) * 100."""
    if not original:
        return 0.0
    return (1.0 - len(compressed) / len(original)) * 100.0


def test_basic_roundtrip():
    """Test compress -> decompress returns original data."""
    original = b"hello world this is a test of huffman coding"
    compressed = HuffmanCoding.compress(original)
    decompressed = HuffmanCoding.decompress(compressed)
    assert decompressed == original, f"Roundtrip failed: {original!r} != {decompressed!r}"
    ratio = _compression_ratio(original, compressed)
    print(f"  PASS test_basic_roundtrip (ratio={ratio:.1f}%)")


def test_single_byte():
    """Test with a single repeated byte."""
    original = b"aaaaa"
    compressed = HuffmanCoding.compress(original)
    decompressed = HuffmanCoding.decompress(compressed)
    assert decompressed == original
    print("  PASS test_single_byte")


def test_empty_data():
    """Test that empty data is handled gracefully."""
    compressed = HuffmanCoding.compress(b"")
    decompressed = HuffmanCoding.decompress(compressed)
    assert decompressed == b""
    # Also test decompress of empty bytes
    assert HuffmanCoding.decompress(b"") == b""
    print("  PASS test_empty_data")


def test_chinese_text():
    """Test compression of Chinese text (simulating diary content)."""
    text = (
        "今天天气真好，我们去了故宫博物院参观。"
        "故宫是中国明清两代的皇家宫殿，"
        "位于北京中轴线的中心，是中国古代宫廷建筑之精华。"
        "我们在里面走了三个小时，看到了很多珍贵的文物。"
        "中午在故宫附近的餐厅吃了北京烤鸭，味道非常好。"
        "下午去了天安门广场和颐和园，游人如织。"
    )
    original = text.encode("utf-8")
    compressed = HuffmanCoding.compress(original)
    decompressed = HuffmanCoding.decompress(compressed)
    assert decompressed == original
    ratio = _compression_ratio(original, compressed)
    print(f"  PASS test_chinese_text (ratio={ratio:.1f}%)")


def test_binary_data():
    """Test with binary (non-text) data."""
    original = bytes(range(256)) * 10  # 2560 bytes of every byte value
    compressed = HuffmanCoding.compress(original)
    decompressed = HuffmanCoding.decompress(compressed)
    assert decompressed == original
    print(f"  PASS test_binary_data (size: {len(original)} -> {len(compressed)})")


def test_large_text():
    """Test with larger text data."""
    # Generate repetitive text for good compression
    words = ["the ", "and ", "that ", "with ", "from ", "this ", "have ", "they "]
    text = "".join(words * 200)
    original = text.encode("utf-8")
    compressed = HuffmanCoding.compress(original)
    decompressed = HuffmanCoding.decompress(compressed)
    assert decompressed == original
    ratio = _compression_ratio(original, compressed)
    print(f"  PASS test_large_text (ratio={ratio:.1f}%)")


def test_multiple_roundtrips():
    """Test that multiple compress/decompress cycles work independently."""
    for text in [b"hello", b"world", b"test data here", b"another one"]:
        compressed = HuffmanCoding.compress(text)
        decompressed = HuffmanCoding.decompress(compressed)
        assert decompressed == text, f"Failed for {text!r}"
    print("  PASS test_multiple_roundtrips")


def run_all():
    print("Running HuffmanCoding tests (FND-006)...")
    test_basic_roundtrip()
    test_single_byte()
    test_empty_data()
    test_chinese_text()
    test_binary_data()
    test_large_text()
    test_multiple_roundtrips()
    print("All HuffmanCoding tests PASSED!\n")


if __name__ == "__main__":
    run_all()
