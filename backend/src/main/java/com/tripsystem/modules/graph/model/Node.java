package com.tripsystem.modules.graph.model;

import java.util.Set;

/**
 * 道路图节点：景点/建筑/房间/入口/电梯等。
 */
public record Node(
		long id,
		String name,
		String category,
		GeoPoint point,
		Set<String> keywords
) {
}
