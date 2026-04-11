package com.tripsystem.modules.data.dto;

import java.util.List;

/**
 * 示例导入 DTO（后续会替换为正式 JSON Schema）。
 */
public record SampleGraphDto(
		List<NodeDto> nodes,
		List<EdgeDto> edges
) {
	public record NodeDto(long id, String name, String category, double lng, double lat) {
	}

	public record EdgeDto(long from, long to, double distanceMeters, double idealSpeedMps, double congestion, List<String> allowed) {
	}
}
