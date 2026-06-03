"""
HashMap data structure using chaining for collision resolution.

A self-implemented hash table that stores key-value pairs in linked-list
buckets. Supports automatic resizing when the load factor threshold is
exceeded. Used for O(1) lookups throughout TripSyt.

Contract: FND-002
"""

from __future__ import annotations

from typing import Any, List, Optional, Tuple


class _HashMapNode:
    """A node in the hash map's linked-list chain.

    Attributes:
        key: The lookup key.
        value: The value associated with the key.
        next: Reference to the next node in the chain, or None.
    """

    __slots__ = ("key", "value", "next")

    def __init__(self, key: Any, value: Any) -> None:
        self.key: Any = key
        self.value: Any = value
        self.next: Optional["_HashMapNode"] = None


class HashMap:
    """A hash table using chaining (linked lists) for collision resolution.

    The table automatically resizes when the load factor exceeds the
    configured threshold. Supports string and integer keys via a custom
    hash function.

    Attributes:
        size: Number of key-value pairs currently stored.
        capacity: Current number of buckets.
        load_factor: Threshold for resizing (default 0.75).
    """

    def __init__(
        self, initial_capacity: int = 16, load_factor: float = 0.75
    ) -> None:
        """Initialize the hash map.

        Args:
            initial_capacity: Starting number of buckets. Must be positive.
            load_factor: Resize threshold as a ratio of size to capacity.
                Defaults to 0.75.

        Raises:
            ValueError: If initial_capacity <= 0 or load_factor not in (0, 1].
        """
        if initial_capacity <= 0:
            raise ValueError("initial_capacity must be positive")
        if not 0.0 < load_factor <= 1.0:
            raise ValueError("load_factor must be in (0, 1]")

        self._capacity: int = initial_capacity
        self._load_factor: float = load_factor
        self._size: int = 0
        # Each bucket is the head of a singly linked list
        self._buckets: List[Optional[_HashMapNode]] = [
            None
        ] * initial_capacity

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def put(self, key: Any, value: Any) -> None:
        """Insert or update a key-value pair.

        Args:
            key: The lookup key (str or int is recommended).
            value: The value to associate with the key.
        """
        idx = self._hash(key)
        node = self._buckets[idx]

        # Traverse the chain to find existing key
        while node is not None:
            if node.key == key:
                node.value = value
                return
            node = node.next

        # Key not found — insert at head of chain
        new_node = _HashMapNode(key, value)
        new_node.next = self._buckets[idx]
        self._buckets[idx] = new_node
        self._size += 1

        # Check load factor
        if self._size / self._capacity > self._load_factor:
            self._resize()

    def get(self, key: Any) -> Optional[Any]:
        """Retrieve the value associated with a key.

        Args:
            key: The lookup key.

        Returns:
            The associated value, or None if the key is not present.
        """
        idx = self._hash(key)
        node = self._buckets[idx]
        while node is not None:
            if node.key == key:
                return node.value
            node = node.next
        return None

    def remove(self, key: Any) -> bool:
        """Remove a key-value pair from the map.

        Args:
            key: The key to remove.

        Returns:
            True if the key was found and removed, False otherwise.
        """
        idx = self._hash(key)
        node = self._buckets[idx]
        prev: Optional[_HashMapNode] = None

        while node is not None:
            if node.key == key:
                if prev is None:
                    # Removing head of chain
                    self._buckets[idx] = node.next
                else:
                    prev.next = node.next
                self._size -= 1
                return True
            prev = node
            node = node.next

        return False

    def contains(self, key: Any) -> bool:
        """Check whether a key exists in the map.

        Args:
            key: The key to check.

        Returns:
            True if the key is present, False otherwise.
        """
        return self.get(key) is not None

    # ------------------------------------------------------------------
    # Size
    # ------------------------------------------------------------------

    @property
    def size(self) -> int:
        """Return the number of key-value pairs.

        Returns:
            Current count of entries.
        """
        return self._size

    @property
    def capacity(self) -> int:
        """Return the current bucket capacity.

        Returns:
            Number of buckets.
        """
        return self._capacity

    # ------------------------------------------------------------------
    # Convenience / bulk
    # ------------------------------------------------------------------

    def keys(self) -> List[Any]:
        """Return a list of all keys in the map.

        Returns:
            List of keys (order not guaranteed).
        """
        result: List[Any] = []
        for bucket in self._buckets:
            node = bucket
            while node is not None:
                result.append(node.key)
                node = node.next
        return result

    def values(self) -> List[Any]:
        """Return a list of all values in the map.

        Returns:
            List of values (order not guaranteed).
        """
        result: List[Any] = []
        for bucket in self._buckets:
            node = bucket
            while node is not None:
                result.append(node.value)
                node = node.next
        return result

    def items(self) -> List[Tuple[Any, Any]]:
        """Return a list of all (key, value) pairs.

        Returns:
            List of tuples.
        """
        result: List[Tuple[Any, Any]] = []
        for bucket in self._buckets:
            node = bucket
            while node is not None:
                result.append((node.key, node.value))
                node = node.next
        return result

    def clear(self) -> None:
        """Remove all entries from the map."""
        self._buckets = [None] * self._capacity
        self._size = 0

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _hash(self, key: Any) -> int:
        """Compute the bucket index for a key.

        Uses DJB2-like hashing for strings and multiplicative hashing
        for integers.  The result is always modulo the current capacity.

        Args:
            key: The key to hash.

        Returns:
            A bucket index in [0, capacity).
        """
        if isinstance(key, str):
            h = 5381
            for ch in key:
                h = ((h << 5) + h) + ord(ch)  # h * 33 + ord(ch)
            return h % self._capacity
        elif isinstance(key, int):
            # Fibonacci hashing — good dispersion
            h = key
            h ^= (h >> 16)
            h = (h * 0x45D9F3B) & 0xFFFFFFFF
            h ^= (h >> 16)
            return h % self._capacity
        elif isinstance(key, float):
            return self._hash(str(key))
        else:
            return self._hash(str(key))

    def _resize(self) -> None:
        """Double the capacity and rehash all entries."""
        old_buckets = self._buckets
        old_capacity = self._capacity

        self._capacity = old_capacity * 2
        self._buckets = [None] * self._capacity
        self._size = 0  # Will be rebuilt by put()

        for bucket in old_buckets:
            node = bucket
            while node is not None:
                # Re-insert with new capacity-based hashing
                self._put_no_resize(node.key, node.value)
                node = node.next

    def _put_no_resize(self, key: Any, value: Any) -> None:
        """Insert without triggering a resize (used during rehashing)."""
        idx = self._hash(key)
        node = self._buckets[idx]
        while node is not None:
            if node.key == key:
                node.value = value
                return
            node = node.next
        new_node = _HashMapNode(key, value)
        new_node.next = self._buckets[idx]
        self._buckets[idx] = new_node
        self._size += 1

    # ------------------------------------------------------------------
    # Magic methods
    # ------------------------------------------------------------------

    def __getitem__(self, key: Any) -> Any:
        value = self.get(key)
        if value is None and not self.contains(key):
            raise KeyError(key)
        return value

    def __setitem__(self, key: Any, value: Any) -> None:
        self.put(key, value)

    def __delitem__(self, key: Any) -> None:
        if not self.remove(key):
            raise KeyError(key)

    def __contains__(self, key: Any) -> bool:
        return self.contains(key)

    def __len__(self) -> int:
        return self._size

    def __repr__(self) -> str:
        pairs = ", ".join(
            f"{k!r}: {v!r}" for k, v in self.items()
        )
        return f"HashMap({{{pairs}}})"

    def __iter__(self):
        return iter(self.keys())
