"""
Graph data structure using adjacency list representation.

Supports directed/undirected graphs with weighted edges, road type metadata,
and congestion factors. Designed as the foundation for road network modeling
in the TripSyt system.

Contract: FND-001
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple, Union


class Graph:
    """A weighted graph implemented with an adjacency list.

    Each vertex stores optional data. Edges carry weight, road_type, and
    congestion metadata. Supports both directed and undirected modes.

    Attributes:
        directed: Whether the graph edges are directed.
    """

    def __init__(self, directed: bool = False) -> None:
        """Initialize an empty graph.

        Args:
            directed: If True, edges are one-way; if False, edges are
                bidirectional. Defaults to False.
        """
        self.directed: bool = directed
        # adjacency_list: {vertex_id: [(neighbor_id, weight, road_type, congestion), ...]}
        self._adj: Dict[int, List[Tuple[int, float, str, float]]] = {}
        # vertices: {vertex_id: data}
        self._vertices: Dict[int, Any] = {}
        self._edge_count: int = 0

    # ------------------------------------------------------------------
    # Vertex operations
    # ------------------------------------------------------------------

    def add_vertex(self, vertex_id: int, data: Any = None) -> None:
        """Add a vertex to the graph.

        If the vertex already exists, its data is updated.

        Args:
            vertex_id: Unique identifier for the vertex.
            data: Optional payload associated with the vertex.
        """
        if vertex_id not in self._adj:
            self._adj[vertex_id] = []
        self._vertices[vertex_id] = data

    def get_vertex(self, vertex_id: int) -> Optional[Any]:
        """Retrieve the data associated with a vertex.

        Args:
            vertex_id: The vertex identifier.

        Returns:
            The vertex data, or None if the vertex does not exist.
        """
        return self._vertices.get(vertex_id)

    def remove_vertex(self, vertex_id: int) -> bool:
        """Remove a vertex and all its incident edges.

        Args:
            vertex_id: The vertex to remove.

        Returns:
            True if the vertex existed and was removed, False otherwise.
        """
        if vertex_id not in self._adj:
            return False

        # Remove outgoing edges
        out_degree = len(self._adj[vertex_id])
        del self._adj[vertex_id]
        self._vertices.pop(vertex_id, None)
        self._edge_count -= out_degree

        # Remove incoming edges from other vertices
        for v in self._adj:
            before = len(self._adj[v])
            self._adj[v] = [
                (n, w, rt, c)
                for n, w, rt, c in self._adj[v]
                if n != vertex_id
            ]
            self._edge_count -= before - len(self._adj[v])

        return True

    def has_vertex(self, vertex_id: int) -> bool:
        """Check if a vertex exists in the graph.

        Args:
            vertex_id: The vertex identifier.

        Returns:
            True if the vertex exists, False otherwise.
        """
        return vertex_id in self._adj

    # ------------------------------------------------------------------
    # Edge operations
    # ------------------------------------------------------------------

    def add_edge(
        self,
        from_id: int,
        to_id: int,
        weight: float = 1.0,
        road_type: str = "walk",
        congestion: float = 1.0,
    ) -> None:
        """Add a weighted edge between two vertices.

        Vertices are auto-created if they do not exist.

        Args:
            from_id: Source vertex identifier.
            to_id: Destination vertex identifier.
            weight: Edge weight (typically distance in meters).
            road_type: One of 'walk', 'bike', 'electric_car', 'mixed'.
            congestion: Congestion factor in (0, 1]. 1.0 = no congestion.
        """
        # Ensure vertices exist
        if from_id not in self._adj:
            self._adj[from_id] = []
            self._vertices[from_id] = None
        if to_id not in self._adj:
            self._adj[to_id] = []
            self._vertices[to_id] = None

        self._adj[from_id].append((to_id, weight, road_type, congestion))
        self._edge_count += 1

        if not self.directed:
            self._adj[to_id].append((from_id, weight, road_type, congestion))
            self._edge_count += 1

    def remove_edge(self, from_id: int, to_id: int) -> bool:
        """Remove an edge between two vertices.

        In undirected mode, removes the edge in both directions.

        Args:
            from_id: Source vertex identifier.
            to_id: Destination vertex identifier.

        Returns:
            True if at least one edge was removed.
        """
        removed = False
        if from_id in self._adj:
            before = len(self._adj[from_id])
            self._adj[from_id] = [
                (n, w, rt, c)
                for n, w, rt, c in self._adj[from_id]
                if n != to_id
            ]
            delta = before - len(self._adj[from_id])
            self._edge_count -= delta
            removed = delta > 0

        if not self.directed and to_id in self._adj:
            before = len(self._adj[to_id])
            self._adj[to_id] = [
                (n, w, rt, c)
                for n, w, rt, c in self._adj[to_id]
                if n != from_id
            ]
            delta = before - len(self._adj[to_id])
            self._edge_count -= delta
            removed = removed or delta > 0

        return removed

    def get_neighbors(
        self, vertex_id: int
    ) -> List[Tuple[int, float, str, float]]:
        """Return all neighbors of a vertex with edge metadata.

        Each entry is (neighbor_id, weight, road_type, congestion).

        Args:
            vertex_id: The vertex identifier.

        Returns:
            A list of neighbor tuples.  Empty list if vertex not found.
        """
        return list(self._adj.get(vertex_id, []))

    def get_edge(
        self, from_id: int, to_id: int
    ) -> Optional[Tuple[int, float, str, float]]:
        """Get the edge metadata from from_id to to_id.

        Args:
            from_id: Source vertex.
            to_id: Destination vertex.

        Returns:
            Edge tuple (neighbor_id, weight, road_type, congestion) or None.
        """
        for nbr_id, weight, road_type, congestion in self._adj.get(from_id, []):
            if nbr_id == to_id:
                return (nbr_id, weight, road_type, congestion)
        return None

    # ------------------------------------------------------------------
    # Size queries
    # ------------------------------------------------------------------

    def vertex_count(self) -> int:
        """Return the number of vertices in the graph.

        Returns:
            Count of vertices.
        """
        return len(self._adj)

    def edge_count(self) -> int:
        """Return the number of edges in the graph.

        For undirected graphs each bidirectional pair counts as 2 edges
        internally.

        Returns:
            Count of directed edge entries.
        """
        return self._edge_count

    def vertices(self) -> List[int]:
        """Return a list of all vertex IDs.

        Returns:
            List of vertex identifiers.
        """
        return list(self._adj.keys())

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the graph to a dictionary for JSON persistence.

        Returns:
            A dictionary with keys 'directed', 'vertices', and 'edges'.
        """
        vertices_data = []
        for vid in self._vertices:
            data = self._vertices[vid]
            vertices_data.append({"id": vid, "data": data})

        edges_data = []
        seen: set = set()
        for from_id in self._adj:
            for to_id, weight, road_type, congestion in self._adj[from_id]:
                if not self.directed:
                    # Avoid duplicating edges in undirected graphs
                    key = (min(from_id, to_id), max(from_id, to_id), weight)
                    if key in seen:
                        continue
                    seen.add(key)
                edges_data.append(
                    {
                        "from": from_id,
                        "to": to_id,
                        "weight": weight,
                        "road_type": road_type,
                        "congestion": congestion,
                    }
                )

        return {
            "directed": self.directed,
            "vertices": vertices_data,
            "edges": edges_data,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Graph":
        """Deserialize a graph from a dictionary.

        Args:
            data: Dictionary with 'directed', 'vertices', and 'edges' keys.

        Returns:
            A new Graph instance populated from the dictionary.
        """
        graph = cls(directed=data.get("directed", False))

        for v in data.get("vertices", []):
            graph.add_vertex(v["id"], v.get("data"))

        for e in data.get("edges", []):
            graph.add_edge(
                from_id=e["from"],
                to_id=e["to"],
                weight=e.get("weight", 1.0),
                road_type=e.get("road_type", "walk"),
                congestion=e.get("congestion", 1.0),
            )

        return graph

    def save(self, filepath: str) -> None:
        """Save the graph to a JSON file.

        Args:
            filepath: Path to the output JSON file.
        """
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "Graph":
        """Load a graph from a JSON file.

        Args:
            filepath: Path to the JSON file.

        Returns:
            A new Graph instance.
        """
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)

    # ------------------------------------------------------------------
    # Magic methods
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"Graph(directed={self.directed}, "
            f"vertices={self.vertex_count()}, edges={self.edge_count()})"
        )

    def __contains__(self, vertex_id: int) -> bool:
        return self.has_vertex(vertex_id)

    def __len__(self) -> int:
        return self.vertex_count()

    def __iter__(self):
        return iter(self._adj.keys())
