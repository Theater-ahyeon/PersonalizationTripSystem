"""
Huffman coding for lossless text compression.

Builds a Huffman tree from character frequencies, generates prefix
codes, and compresses/decompresses byte data. Used for diary storage
compression in TripSyt.

Contract: FND-006
"""

from __future__ import annotations
from typing import Dict, Optional, Tuple
from core.priority_queue import PriorityQueue


class _HuffmanNode:
    __slots__ = ("char", "freq", "left", "right")
    def __init__(self, char: Optional[int], freq: int,
                 left: Optional[_HuffmanNode] = None,
                 right: Optional[_HuffmanNode] = None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right


class HuffmanCoding:
    """Huffman compression / decompression engine."""

    @staticmethod
    def compress(data: bytes) -> bytes:
        """Compress bytes using Huffman coding.

        Returns a custom binary format:
          [4 bytes: original_size]
          [2 bytes: tree_entry_count N]
          [N * (1 byte char, 1 byte code_len, 2 bytes code)]
          [padding_bits: 1 byte]
          [encoded data bytes...]
        """
        if not data:
            return b'\x00\x00\x00\x00\x00\x00\x00'

        freq = HuffmanCoding._build_frequency_table(data)
        root = HuffmanCoding._build_huffman_tree(freq)
        codes = HuffmanCoding._generate_codes(root)

        # Build header
        import struct
        header = bytearray()
        header.extend(struct.pack('>I', len(data)))
        header.extend(struct.pack('>H', len(codes)))

        for char, code_str in codes.items():
            code_val = int(code_str, 2) if code_str else 0
            code_len = len(code_str)
            header.append(char)
            header.append(code_len)
            header.extend(struct.pack('>H', code_val))

        # Encode data
        encoded_bits = []
        for byte in data:
            encoded_bits.append(codes.get(byte, ""))

        bit_string = "".join(encoded_bits)
        padding = (8 - len(bit_string) % 8) % 8
        bit_string += "0" * padding
        header.append(padding)

        # Pack bits into bytes
        encoded_bytes = bytearray()
        for i in range(0, len(bit_string), 8):
            encoded_bytes.append(int(bit_string[i:i+8], 2))

        return bytes(header) + bytes(encoded_bytes)

    @staticmethod
    def decompress(compressed: bytes) -> bytes:
        """Decompress bytes compressed with HuffmanCoding.compress."""
        if not compressed or len(compressed) < 7:
            return b''

        import struct
        pos = 0
        original_size = struct.unpack('>I', compressed[pos:pos+4])[0]
        pos += 4
        if original_size == 0:
            return b''

        code_count = struct.unpack('>H', compressed[pos:pos+2])[0]
        pos += 2

        # Read code table
        codes: Dict[str, int] = {}
        for _ in range(code_count):
            char = compressed[pos]
            code_len = compressed[pos + 1]
            code_val = struct.unpack('>H', compressed[pos+2:pos+4])[0]
            pos += 4
            code_str = format(code_val, f'0{code_len}b') if code_len > 0 else ""
            codes[code_str] = char

        padding = compressed[pos]
        pos += 1

        # Decode
        encoded_data = compressed[pos:]
        bit_string = "".join(format(b, '08b') for b in encoded_data)
        if padding > 0:
            bit_string = bit_string[:-padding]

        result = bytearray()
        current = ""
        for bit in bit_string:
            current += bit
            if current in codes:
                result.append(codes[current])
                current = ""
                if len(result) >= original_size:
                    break

        return bytes(result)

    @staticmethod
    def _build_frequency_table(data: bytes) -> Dict[int, int]:
        freq: Dict[int, int] = {}
        for byte in data:
            freq[byte] = freq.get(byte, 0) + 1
        return freq

    @staticmethod
    def _build_huffman_tree(freq: Dict[int, int]) -> _HuffmanNode:
        pq = PriorityQueue()
        for char, f in freq.items():
            pq.push(_HuffmanNode(char, f), float(f))

        while pq.size > 1:
            left = pq.pop()
            right = pq.pop()
            # left/right could be None if pq.pop() returns None (shouldn't happen)
            if left is None or right is None:
                break
            merged = _HuffmanNode(None, left.freq + right.freq, left, right)
            pq.push(merged, float(merged.freq))

        root = pq.pop()
        if root is None:
            # Single unique character case
            char = next(iter(freq))
            return _HuffmanNode(char, freq[char])
        return root

    @staticmethod
    def _generate_codes(root: _HuffmanNode) -> Dict[int, str]:
        codes: Dict[int, str] = {}
        def _dfs(node: _HuffmanNode, code: str):
            if node.char is not None:
                codes[node.char] = code if code else "0"
            else:
                if node.left:
                    _dfs(node.left, code + "0")
                if node.right:
                    _dfs(node.right, code + "1")
        _dfs(root, "")
        return codes
