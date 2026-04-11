package com.tripsystem.modules.graph.model;

import java.util.*;

/**
 * 内存道路图（邻接表）。
 */
public class Graph {
	private final Map<Long, Node> nodes = new HashMap<>();
	private final Map<Long, List<Edge>> adj = new HashMap<>();

	public void upsertNode(Node node) {
		nodes.put(node.id(), node);
		adj.computeIfAbsent(node.id(), k -> new ArrayList<>());
	}

	public void addDirectedEdge(Edge edge) {
		adj.computeIfAbsent(edge.from(), k -> new ArrayList<>()).add(edge);
	}

	public Optional<Node> node(long id) {
		return Optional.ofNullable(nodes.get(id));
	}

	public Collection<Node> nodes() {
		return Collections.unmodifiableCollection(nodes.values());
	}

	public List<Edge> edgesFrom(long from) {
		return adj.getOrDefault(from, List.of());
	}
}
