"""
HNSWIndex — Hierarchical Navigable Small World graph for approximate
nearest-neighbor search.

Based on the paper "Efficient and robust approximate nearest neighbor
search using Hierarchical Navigable Small World graphs" by Malkov &
Yashunin (2016). Used for interest-vector similarity matching in
TripSyt's recommendation engine.

Contract: FND-007
"""

from __future__ import annotations

import math
import random
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from core.priority_queue import PriorityQueue


class HNSWIndex:
    """Hierarchical Navigable Small World (HNSW) index for vector search.

    Stores high-dimensional vectors and supports approximate k-nearest
    neighbor queries via a multi-layer graph structure.

    Attributes:
        dimension: Dimensionality of stored vectors.
        M: Number of bi-directional links per node per layer.
        ef_construction: Beam width during insertion (higher = more accurate).
        entry_point: ID of the top-layer entry point, or None if empty.
    """

    def __init__(
        self,
        dimension: int,
        M: int = 16,
        ef_construction: int = 200,
    ) -> None:
        """Initialize an empty HNSW index.

        Args:
            dimension: Number of elements in each vector.
            M: Max out-degree per node per layer. Default 16.
            ef_construction: Search beam width during insertion.
                Default 200. Higher values improve recall at the cost
                of slower insertion.

        Raises:
            ValueError: If dimension < 1 or M < 2.
        """
        if dimension < 1:
            raise ValueError("dimension must be >= 1")
        if M < 2:
            raise ValueError("M must be >= 2")

        self.dimension: int = dimension
        self.M: int = M
        self.M_max: int = M
        self.M_max0: int = M * 2  # Layer 0 has denser connections
        self.ef_construction: int = ef_construction
        self._ml: float = 1.0 / math.log(M)  # Level-generation normalizer

        # Per-node data: id -> {vector, data_ref, layer, neighbors_by_layer}
        # neighbors_by_layer: {layer: List[int]}
        self._nodes: Dict[int, dict] = {}

        # Complete graph at each layer: {layer: {node_id: Set[neighbor_ids]}}
        self._layers: Dict[int, Dict[int, Set[int]]] = {0: {}}

        self.entry_point: Optional[int] = None
        self._max_layer: int = -1
        self._next_id: int = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def insert(self, vector: List[float], data_ref: Any = None) -> int:
        """Insert a vector and return its assigned ID.

        Args:
            vector: List of floats (must match dimension).
            data_ref: Arbitrary data associated with this vector.

        Returns:
            The integer ID assigned to the inserted node.

        Raises:
            ValueError: If vector length != dimension.
        """
        if len(vector) != self.dimension:
            raise ValueError(
                f"Vector length {len(vector)} != dimension {self.dimension}"
            )

        node_id = self._next_id
        self._next_id += 1

        # Determine the level for this node
        level = self._random_level()

        # Store node data
        self._nodes[node_id] = {
            "vector": list(vector),
            "data_ref": data_ref,
            "layer": level,
            "neighbors": {l: set() for l in range(level + 1)},
        }

        # If this is the first node, set as entry point
        if self.entry_point is None:
            self.entry_point = node_id
            self._max_layer = level
            for l in range(level + 1):
                self._layers[l] = {node_id: set()}
            return node_id

        # --- Greedy descent from top layer to level+1 ---
        ep = self.entry_point
        for lc in range(self._max_layer, level, -1):
            ep = self._greedy_search_layer(vector, ep, 1, lc)[0][0]

        # --- Insert at each layer from min(level, max_layer) down to 0 ---
        for lc in range(min(level, self._max_layer), -1, -1):
            # Search for ef_construction nearest neighbors at this layer
            candidates = self._search_layer(
                vector, ep, self.ef_construction, lc
            )

            # Select M (or M_max0 for layer 0) nearest as neighbors
            m_connect = self.M_max0 if lc == 0 else self.M_max
            neighbors = self._select_neighbors(vector, candidates, m_connect)

            # Add bidirectional connections
            if lc not in self._layers:
                self._layers[lc] = {}
            self._layers[lc][node_id] = set(neighbors)

            for neighbor_id in neighbors:
                if neighbor_id not in self._layers[lc]:
                    self._layers[lc][neighbor_id] = set()
                self._layers[lc][neighbor_id].add(node_id)

                # Shrink neighbor's connections if exceeding M
                max_conn = self.M_max0 if lc == 0 else self.M_max
                if len(self._layers[lc][neighbor_id]) > max_conn:
                    self._prune_connections(
                        neighbor_id, lc, max_conn
                    )

            ep = neighbors[0] if neighbors else ep

        # Update global entry point if this node's level is higher
        if level > self._max_layer:
            self._max_layer = level
            self.entry_point = node_id
            for l in range(level + 1):
                if l not in self._layers:
                    self._layers[l] = {}
            self._layers[level][node_id] = set()

        return node_id

    def search(
        self, query_vector: List[float], k: int = 10, ef: int = 64
    ) -> List[Tuple[Any, float]]:
        """Search for the k nearest neighbors to *query_vector*.

        Args:
            query_vector: The query vector.
            k: Number of results to return. Default 10.
            ef: Beam width during search (higher = more accurate).
                Default 64.

        Returns:
            List of (data_ref, distance) tuples sorted by ascending
            distance (closest first).

        Raises:
            ValueError: If vector length != dimension or index is empty.
        """
        if len(query_vector) != self.dimension:
            raise ValueError(
                f"Query length {len(query_vector)} != dimension {self.dimension}"
            )
        if self.entry_point is None:
            return []

        ef = max(ef, k)

        # Greedy descent to layer 1
        ep = self.entry_point
        for lc in range(self._max_layer, 0, -1):
            ep = self._greedy_search_layer(query_vector, ep, 1, lc)[0][0]

        # Search layer 0 with beam width ef
        candidates = self._search_layer(query_vector, ep, ef, 0)

        # Return top-k
        results = []
        for node_id, dist in candidates[:k]:
            results.append((self._nodes[node_id]["data_ref"], dist))
        return results

    # ------------------------------------------------------------------
    # Internal: distance
    # ------------------------------------------------------------------

    @staticmethod
    def _euclidean_distance(v1: List[float], v2: List[float]) -> float:
        """Compute Euclidean (L2) distance between two vectors.

        Args:
            v1: First vector.
            v2: Second vector.

        Returns:
            Euclidean distance.
        """
        total = 0.0
        for a, b in zip(v1, v2):
            diff = a - b
            total += diff * diff
        return math.sqrt(total)

    # ------------------------------------------------------------------
    # Internal: layer search
    # ------------------------------------------------------------------

    def _search_layer(
        self,
        query: List[float],
        entry: int,
        ef: int,
        layer: int,
    ) -> List[Tuple[int, float]]:
        """Search within *layer* for up to *ef* nearest neighbors.

        Returns candidates sorted by ascending distance.
        """
        visited: Set[int] = {entry}
        # Min-heap of (distance, node_id) for candidates
        candidates = PriorityQueue(is_max_heap=False)
        # Max-heap of (distance, node_id) for results (keep best ef)
        results = PriorityQueue(is_max_heap=True)

        dist_entry = self._euclidean_distance(
            query, self._nodes[entry]["vector"]
        )
        candidates.push(entry, dist_entry)
        results.push(entry, dist_entry)

        while not candidates.is_empty():
            c_id = candidates.pop()
            c_dist = candidates.peek_priority()
            # We pushed with distance as priority; peek retrieves the min distance
            # Actually, let me re-check the logic...

            # Get current worst in results
            worst_dist = results.peek_priority()
            if worst_dist is not None and c_id is not None:
                c_dist = self._euclidean_distance(
                    query, self._nodes[c_id]["vector"]
                )
                if c_dist > worst_dist:
                    break

            if c_id is None:
                continue

            # Explore neighbors
            layer_graph = self._layers.get(layer, {})
            neighbors = layer_graph.get(c_id, set())
            for n_id in neighbors:
                if n_id in visited:
                    continue
                visited.add(n_id)
                n_dist = self._euclidean_distance(
                    query, self._nodes[n_id]["vector"]
                )

                # Check if this neighbor should be in results
                worst_r_dist = results.peek_priority()
                if results.size < ef or n_dist < (worst_r_dist or float("inf")):
                    candidates.push(n_id, n_dist)
                    results.push(n_id, n_dist)
                    # Trim results if over ef
                    while results.size > ef:
                        results.pop()

        # Collect and sort results
        collected: List[Tuple[int, float]] = []
        while not results.is_empty():
            node_id = results.pop()
            if node_id is not None:
                dist = self._euclidean_distance(
                    query, self._nodes[node_id]["vector"]
                )
                collected.append((node_id, dist))

        collected.sort(key=lambda x: x[1])
        return collected

    def _greedy_search_layer(
        self,
        query: List[float],
        entry: int,
        ef: int,
        layer: int,
    ) -> List[Tuple[int, float]]:
        """Simplified greedy search — keep only the closest node."""
        visited: Set[int] = set()
        current = entry
        current_dist = self._euclidean_distance(
            query, self._nodes[current]["vector"]
        )

        while True:
            visited.add(current)
            best = current
            best_dist = current_dist

            layer_graph = self._layers.get(layer, {})
            for n_id in layer_graph.get(current, set()):
                if n_id in visited:
                    continue
                n_dist = self._euclidean_distance(
                    query, self._nodes[n_id]["vector"]
                )
                if n_dist < best_dist:
                    best = n_id
                    best_dist = n_dist

            if best == current:
                break
            current = best
            current_dist = best_dist

        return [(current, current_dist)]

    # ------------------------------------------------------------------
    # Internal: neighbor selection
    # ------------------------------------------------------------------

    def _select_neighbors(
        self,
        query: List[float],
        candidates: List[Tuple[int, float]],
        m: int,
    ) -> List[int]:
        """Select up to *m* nearest neighbors from *candidates*."""
        selected = []
        for node_id, _ in candidates:
            if node_id in selected:
                continue
            selected.append(node_id)
            if len(selected) >= m:
                break
        return selected

    def _prune_connections(
        self, node_id: int, layer: int, max_conn: int
    ) -> None:
        """Prune a node's connections to at most *max_conn* nearest."""
        if layer not in self._layers or node_id not in self._layers[layer]:
            return
        conns = self._layers[layer][node_id]
        if len(conns) <= max_conn:
            return

        vec = self._nodes[node_id]["vector"]
        scored = []
        for n_id in conns:
            dist = self._euclidean_distance(vec, self._nodes[n_id]["vector"])
            scored.append((n_id, dist))
        scored.sort(key=lambda x: x[1])

        # Keep the closest max_conn
        keep = {n_id for n_id, _ in scored[:max_conn]}
        removed = conns - keep

        # Remove reverse links
        for r_id in removed:
            if r_id in self._layers.get(layer, {}):
                self._layers[layer][r_id].discard(node_id)

        self._layers[layer][node_id] = keep

    # ------------------------------------------------------------------
    # Internal: level generation
    # ------------------------------------------------------------------

    def _random_level(self) -> int:
        """Generate a random level using the exponential decay distribution."""
        r = random.random()
        return int(-math.log(r) * self._ml)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def node_count(self) -> int:
        """Return the number of stored vectors.

        Returns:
            Count of inserted nodes.
        """
        return len(self._nodes)

    # ------------------------------------------------------------------
    # Magic
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self._nodes)

    def __repr__(self) -> str:
        return (
            f"HNSWIndex(dim={self.dimension}, M={self.M}, "
            f"nodes={len(self._nodes)}, max_layer={self._max_layer})"
        )
