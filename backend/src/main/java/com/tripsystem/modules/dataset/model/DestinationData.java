package com.tripsystem.modules.dataset.model;

import com.tripsystem.modules.graph.model.Graph;

import java.util.Collections;
import java.util.List;

/**
 * 单个目的地（景区/校园）在内存中的数据分片。
 */
public class DestinationData {
	private final long id;
	private final String name;
	private final String category;
	private final Graph graph;
	private final List<Facility> facilities;

	public DestinationData(long id, String name, String category, Graph graph, List<Facility> facilities) {
		this.id = id;
		this.name = name;
		this.category = category;
		this.graph = graph;
		this.facilities = List.copyOf(facilities);
	}

	public long id() {
		return id;
	}

	public String name() {
		return name;
	}

	public String category() {
		return category;
	}

	public Graph graph() {
		return graph;
	}

	public List<Facility> facilities() {
		return Collections.unmodifiableList(facilities);
	}
}
