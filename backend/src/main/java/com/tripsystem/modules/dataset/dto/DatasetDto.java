package com.tripsystem.modules.dataset.dto;

import java.util.List;
import java.util.Set;

/**
 * 正式数据集 DTO。
 *
 * 注意：核心功能不依赖数据库，数据以 JSON 导入后进入内存数据结构。
 */
public record DatasetDto(
		int version,
		List<DestinationDto> destinations
) {
	public record DestinationDto(
			long id,
			String name,
			String category,
			List<NodeDto> nodes,
			List<EdgeDto> edges,
			List<FacilityDto> facilities
	) {
	}

	public record NodeDto(
			long id,
			String name,
			String category,
			double lng,
			double lat,
			Set<String> keywords
	) {
	}

	public record EdgeDto(
			long from,
			long to,
			double distanceMeters,
			double idealSpeedMps,
			double congestion,
			List<String> allowed
	) {
	}

	public record FacilityDto(
			long id,
			String name,
			String category,
			long nodeId,
			Set<String> keywords,
			Double heat,
			Double rating
	) {
	}
}
