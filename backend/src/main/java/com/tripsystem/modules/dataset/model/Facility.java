package com.tripsystem.modules.dataset.model;

import java.util.Set;

/**
 * 设施（厕所/餐饮/超市/打印店/医务室等）。
 *
 * 设施位置以 nodeId 绑定到道路网络节点，便于用“道路网络最短路距离”排序。
 */
public record Facility(
		long id,
		String name,
		String category,
		long nodeId,
		Set<String> keywords,
		double heat,
		double rating
) {
}
