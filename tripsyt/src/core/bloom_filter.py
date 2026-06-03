"""
BloomFilter — a space-efficient probabilistic data structure.

Tests set membership with a configurable false-positive rate. False
negatives are impossible: if contains() returns False, the item was
definitely never added. Used for deduplication and cache filtering
in TripSyt.

Contract: FND-008
"""

from __future__ import annotations

import math
from typing import Any, List


class BloomFilter:
    """A Bloom filter using multiple hash functions with different seeds.

    The bit array is stored as an integer, with bit operations for
    setting and testing. Hash functions use DJB2-like hashing with
    varying seeds.

    Attributes:
        expected_size: Target number of elements.
        false_positive_rate: Target false-positive probability.
        bit_size: Number of bits in the array.
        hash_count: Number of hash functions used.
    """

    def __init__(
        self,
        expected_size: int = 1000,
        false_positive_rate: float = 0.01,
    ) -> None:
        """Initialize the Bloom filter.

        Args:
            expected_size: Approximate number of items to store.
                Default 1000.
            false_positive_rate: Desired false-positive probability in
                (0, 1). Default 0.01 (1%).

        Raises:
            ValueError: If expected_size <= 0 or fp rate out of (0, 1).
        """
        if expected_size <= 0:
            raise ValueError("expected_size must be positive")
        if not 0.0 < false_positive_rate < 1.0:
            raise ValueError("false_positive_rate must be in (0, 1)")

        self.expected_size: int = expected_size
        self.false_positive_rate: float = false_positive_rate

        # Optimal number of bits: m = -n * ln(p) / (ln 2)^2
        self.bit_size: int = int(
            -expected_size * math.log(false_positive_rate) / (math.log(2) ** 2)
        )
        self.bit_size = max(self.bit_size, 64)  # Minimum reasonable size

        # Optimal number of hash functions: k = (m/n) * ln 2
        self.hash_count: int = int(
            (self.bit_size / expected_size) * math.log(2)
        )
        self.hash_count = max(self.hash_count, 2)

        # Bit array stored as a Python int
        self._bits: int = 0
        self._inserted_count: int = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add(self, item: Any) -> None:
        """Add an item to the filter.

        Args:
            item: The item to add (any hashable type, converted via str).
        """
        item_str = str(item)
        for seed in range(self.hash_count):
            bit_idx = self._hash(item_str, seed) % self.bit_size
            self._bits |= 1 << bit_idx
        self._inserted_count += 1

    def contains(self, item: Any) -> bool:
        """Check whether *item* has *possibly* been added.

        Returns False only if the item was definitely never added.
        Returns True if the item may have been added (with the
        configured false-positive probability).

        Args:
            item: The item to check.

        Returns:
            True if the item might be in the set, False if definitely not.
        """
        item_str = str(item)
        for seed in range(self.hash_count):
            bit_idx = self._hash(item_str, seed) % self.bit_size
            if not (self._bits & (1 << bit_idx)):
                return False
        return True

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def estimated_size(self) -> int:
        """Estimate the number of distinct items added to the filter.

        Uses the fraction of set bits to estimate cardinality.

        Returns:
            Estimated number of inserted distinct items.
        """
        if self.bit_size == 0:
            return 0
        set_bits = self._bits.bit_count()
        fraction = set_bits / self.bit_size
        if fraction >= 1.0:
            # All bits set — can't estimate accurately
            return self.bit_size
        # n ≈ -m/k * ln(1 - X/m) where X = set bits
        try:
            estimate = -self.bit_size / self.hash_count * math.log(
                1.0 - fraction
            )
            return int(estimate)
        except (ValueError, ZeroDivisionError):
            return self._inserted_count

    def clear(self) -> None:
        """Reset the filter to empty."""
        self._bits = 0
        self._inserted_count = 0

    # ------------------------------------------------------------------
    # Internal: hash functions
    # ------------------------------------------------------------------

    @staticmethod
    def _hash(item: str, seed: int) -> int:
        """DJB2-like hash with a seed for variation between hash functions.

        Args:
            item: String to hash.
            seed: Seed value differentiating hash functions.

        Returns:
            A large integer hash.
        """
        h = 5381 + seed * 2654435761
        for ch in item:
            h = ((h << 5) + h) + ord(ch)
            h = h & 0xFFFFFFFF  # Keep within 32-bit
        # Mix with seed again for better dispersion
        h ^= seed * 0x9E3779B9
        h = h & 0xFFFFFFFF
        return h

    # ------------------------------------------------------------------
    # Magic
    # ------------------------------------------------------------------

    def __contains__(self, item: Any) -> bool:
        return self.contains(item)

    def __len__(self) -> int:
        return self._inserted_count

    def __repr__(self) -> str:
        return (
            f"BloomFilter(bits={self.bit_size}, hashes={self.hash_count}, "
            f"fp_rate={self.false_positive_rate}, items={self._inserted_count})"
        )
