"""
PriorityQueue — a binary heap implementation.

Supports both min-heap and max-heap modes. Includes an efficient top-k
operation that does not require a full sort. Used by HuffmanCoding,
HNSWIndex, and the sort/search engines throughout TripSyt.

Contract: FND-003
"""

from __future__ import annotations

from typing import Any, Generic, List, Optional, Tuple, TypeVar

T = TypeVar("T")


class PriorityQueue(Generic[T]):
    """A binary heap priority queue.

    The heap is stored in a list where index 0 is the root. For a node at
    index i:
        - left child:  2*i + 1
        - right child: 2*i + 2
        - parent:      (i - 1) // 2

    Attributes:
        is_max_heap: If True, pop returns the *largest* priority; otherwise
            the *smallest*.
    """

    def __init__(self, is_max_heap: bool = False) -> None:
        """Initialize an empty priority queue.

        Args:
            is_max_heap: True for a max-heap (largest priority on top),
                False for a min-heap. Defaults to False.
        """
        self.is_max_heap: bool = is_max_heap
        # Each entry is (priority, item)
        self._heap: List[Tuple[float, T]] = []

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def push(self, item: T, priority: float) -> None:
        """Insert an item with a given priority.  O(log n).

        Args:
            item: The item to store.
            priority: Numeric priority (lower = higher priority in min-heap).
        """
        entry = (priority, item)
        self._heap.append(entry)
        self._heapify_up(len(self._heap) - 1)

    def pop(self) -> Optional[T]:
        """Remove and return the item with the highest priority.  O(log n).

        Returns:
            The item with the best priority, or None if the queue is empty.
        """
        if not self._heap:
            return None
        if len(self._heap) == 1:
            return self._heap.pop()[1]

        root = self._heap[0][1]
        self._heap[0] = self._heap.pop()
        self._heapify_down(0)
        return root

    def peek(self) -> Optional[T]:
        """Return the item with the highest priority without removing it. O(1).

        Returns:
            The top item, or None if the queue is empty.
        """
        if not self._heap:
            return None
        return self._heap[0][1]

    def peek_priority(self) -> Optional[float]:
        """Return the priority of the top item. O(1).

        Returns:
            The top priority, or None if empty.
        """
        if not self._heap:
            return None
        return self._heap[0][0]

    def pop_with_priority(self) -> Optional[Tuple[float, T]]:
        """Remove and return (priority, item). O(log n).

        Returns:
            A (priority, item) tuple, or None if empty.
        """
        if not self._heap:
            return None
        if len(self._heap) == 1:
            return self._heap.pop()

        root = self._heap[0]
        self._heap[0] = self._heap.pop()
        self._heapify_down(0)
        return root

    # ------------------------------------------------------------------
    # Top-K
    # ------------------------------------------------------------------

    def top_k(self, k: int) -> List[T]:
        """Return the top-k items without fully sorting. O(n log k).

        Internally builds a bounded heap to select the k best items.

        Args:
            k: Number of items to return. If k >= size, returns all items
               sorted by priority.

        Returns:
            A list of up to k items in priority order (best first).
        """
        if k <= 0 or not self._heap:
            return []

        if k >= len(self._heap):
            # Sort all entries by priority and return items
            sorted_entries = sorted(
                self._heap,
                key=lambda e: e[0],
                reverse=self.is_max_heap,
            )
            return [item for _, item in sorted_entries]

        # Use a size-k heap to track the k best candidates
        # For min-heap (our default), we want the k items with smallest priority.
        # Strategy: build a *max-heap* of size k as a filter, then collect results.
        if self.is_max_heap:
            return self._top_k_max_heap(k)
        else:
            return self._top_k_min_heap(k)

    def _top_k_min_heap(self, k: int) -> List[T]:
        """Top-k for min-heap mode (k smallest priorities)."""
        # Use a temporary max-heap of size k to hold the best candidates.
        # Because we're looking for smallest, the "worst of the best" is the
        # largest among our selected k.
        candidates: List[Tuple[float, T]] = []
        for priority, item in self._heap:
            if len(candidates) < k:
                candidates.append((priority, item))
                self._sift_up_candidates_max(candidates, len(candidates) - 1)
            else:
                # candidates[0] is the largest (worst) among our k best
                if priority < candidates[0][0]:
                    candidates[0] = (priority, item)
                    self._sift_down_candidates_max(candidates, 0, len(candidates))

        # Sort the k candidates in ascending priority order
        candidates.sort(key=lambda e: e[0])
        return [item for _, item in candidates]

    def _top_k_max_heap(self, k: int) -> List[T]:
        """Top-k for max-heap mode (k largest priorities)."""
        # Use a temporary min-heap of size k to hold the best candidates.
        candidates: List[Tuple[float, T]] = []
        for priority, item in self._heap:
            if len(candidates) < k:
                candidates.append((priority, item))
                self._sift_up_candidates_min(candidates, len(candidates) - 1)
            else:
                if priority > candidates[0][0]:
                    candidates[0] = (priority, item)
                    self._sift_down_candidates_min(candidates, 0, len(candidates))

        # Sort the k candidates in descending priority order
        candidates.sort(key=lambda e: e[0], reverse=True)
        return [item for _, item in candidates]

    # ------------------------------------------------------------------
    # Heap helpers for candidate selection
    # ------------------------------------------------------------------

    @staticmethod
    def _sift_up_candidates_max(
        heap: List[Tuple[float, T]], idx: int
    ) -> None:
        while idx > 0:
            parent = (idx - 1) // 2
            if heap[idx][0] > heap[parent][0]:
                heap[idx], heap[parent] = heap[parent], heap[idx]
                idx = parent
            else:
                break

    @staticmethod
    def _sift_down_candidates_max(
        heap: List[Tuple[float, T]], idx: int, size: int
    ) -> None:
        while True:
            largest = idx
            left = 2 * idx + 1
            right = 2 * idx + 2
            if left < size and heap[left][0] > heap[largest][0]:
                largest = left
            if right < size and heap[right][0] > heap[largest][0]:
                largest = right
            if largest == idx:
                break
            heap[idx], heap[largest] = heap[largest], heap[idx]
            idx = largest

    @staticmethod
    def _sift_up_candidates_min(
        heap: List[Tuple[float, T]], idx: int
    ) -> None:
        while idx > 0:
            parent = (idx - 1) // 2
            if heap[idx][0] < heap[parent][0]:
                heap[idx], heap[parent] = heap[parent], heap[idx]
                idx = parent
            else:
                break

    @staticmethod
    def _sift_down_candidates_min(
        heap: List[Tuple[float, T]], idx: int, size: int
    ) -> None:
        while True:
            smallest = idx
            left = 2 * idx + 1
            right = 2 * idx + 2
            if left < size and heap[left][0] < heap[smallest][0]:
                smallest = left
            if right < size and heap[right][0] < heap[smallest][0]:
                smallest = right
            if smallest == idx:
                break
            heap[idx], heap[smallest] = heap[smallest], heap[idx]
            idx = smallest

    # ------------------------------------------------------------------
    # Internal heapify
    # ------------------------------------------------------------------

    def _heapify_up(self, idx: int) -> None:
        """Bubble the element at index idx up to restore heap property."""
        if self.is_max_heap:
            while idx > 0:
                parent = (idx - 1) // 2
                if self._heap[idx][0] > self._heap[parent][0]:
                    self._heap[idx], self._heap[parent] = (
                        self._heap[parent],
                        self._heap[idx],
                    )
                    idx = parent
                else:
                    break
        else:
            while idx > 0:
                parent = (idx - 1) // 2
                if self._heap[idx][0] < self._heap[parent][0]:
                    self._heap[idx], self._heap[parent] = (
                        self._heap[parent],
                        self._heap[idx],
                    )
                    idx = parent
                else:
                    break

    def _heapify_down(self, idx: int) -> None:
        """Bubble the element at index idx down to restore heap property."""
        size = len(self._heap)
        if self.is_max_heap:
            while True:
                largest = idx
                left = 2 * idx + 1
                right = 2 * idx + 2
                if (
                    left < size
                    and self._heap[left][0] > self._heap[largest][0]
                ):
                    largest = left
                if (
                    right < size
                    and self._heap[right][0] > self._heap[largest][0]
                ):
                    largest = right
                if largest == idx:
                    break
                self._heap[idx], self._heap[largest] = (
                    self._heap[largest],
                    self._heap[idx],
                )
                idx = largest
        else:
            while True:
                smallest = idx
                left = 2 * idx + 1
                right = 2 * idx + 2
                if (
                    left < size
                    and self._heap[left][0] < self._heap[smallest][0]
                ):
                    smallest = left
                if (
                    right < size
                    and self._heap[right][0] < self._heap[smallest][0]
                ):
                    smallest = right
                if smallest == idx:
                    break
                self._heap[idx], self._heap[smallest] = (
                    self._heap[smallest],
                    self._heap[idx],
                )
                idx = smallest

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    @property
    def size(self) -> int:
        """Return the number of items in the queue.

        Returns:
            Item count.
        """
        return len(self._heap)

    def is_empty(self) -> bool:
        """Check whether the queue is empty.

        Returns:
            True if no items are queued.
        """
        return len(self._heap) == 0

    def clear(self) -> None:
        """Remove all items from the queue."""
        self._heap.clear()

    def items(self) -> List[T]:
        """Return all items in arbitrary (heap) order.

        Returns:
            List of items. Not sorted.
        """
        return [item for _, item in self._heap]

    # ------------------------------------------------------------------
    # Magic methods
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self._heap)

    def __bool__(self) -> bool:
        return not self.is_empty()

    def __repr__(self) -> str:
        mode = "max" if self.is_max_heap else "min"
        return f"PriorityQueue({mode}-heap, size={len(self._heap)})"

    def __iter__(self):
        """Iterate items in heap order (not priority-sorted)."""
        return (item for _, item in self._heap)
