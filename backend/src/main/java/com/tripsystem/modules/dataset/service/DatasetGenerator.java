package com.tripsystem.modules.dataset.service;

import com.tripsystem.modules.dataset.dto.DatasetDto;

import java.util.*;

/**
 * 生成满足数量要求的演示数据集（用于“一键装载”）。
 *
 * 说明：课程要求核心功能不依赖数据库，数据可来自 JSON 导入。
 * 该生成器用固定 seed 生成可复现数据，便于幂等装载与演示。
 */
public class DatasetGenerator {

	public DatasetDto generateSingleDestination(
			long destinationId,
			String destinationName,
			String destinationCategory,
			int nodeCount,
			int edgeCount,
			int facilityCount,
			long seed
	) {
		if (nodeCount < 1) throw new IllegalArgumentException("nodeCount must be >= 1");
		if (edgeCount < 1) throw new IllegalArgumentException("edgeCount must be >= 1");
		if (facilityCount < 0) throw new IllegalArgumentException("facilityCount must be >= 0");

		Random r = new Random(seed);

		// 以北京附近一个点为中心生成 GCJ-02 坐标（仅用于演示）。
		double baseLng = 116.397;
		double baseLat = 39.908;

		List<DatasetDto.NodeDto> nodes = new ArrayList<>(nodeCount);
		for (int i = 1; i <= nodeCount; i++) {
			double angle = (2.0 * Math.PI) * (i - 1) / Math.max(1, nodeCount);
			double radius = 0.001 + 0.002 * r.nextDouble();
			double lng = baseLng + radius * Math.cos(angle);
			double lat = baseLat + radius * Math.sin(angle);
			String category = (i % 7 == 0) ? "BUILDING" : (i % 5 == 0) ? "POI" : "NODE";
			Set<String> keywords = Set.of(category.toLowerCase(Locale.ROOT));
			nodes.add(new DatasetDto.NodeDto(i, "N" + i, category, lng, lat, keywords));
		}

		List<DatasetDto.EdgeDto> edges = new ArrayList<>(edgeCount);
		List<String> allowed = List.of("WALK", "BIKE");

		// 先建一个环，保证连通
		for (int i = 1; i <= nodeCount; i++) {
			int j = (i == nodeCount) ? 1 : (i + 1);
			double dist = 80 + 120 * r.nextDouble();
			edges.add(new DatasetDto.EdgeDto(i, j, dist, 1.4, 0.6 + 0.4 * r.nextDouble(), allowed));
			edges.add(new DatasetDto.EdgeDto(j, i, dist, 1.4, 0.6 + 0.4 * r.nextDouble(), allowed));
		}

		// 再随机补边到目标数量
		while (edges.size() < edgeCount) {
			long from = 1 + r.nextInt(nodeCount);
			long to = 1 + r.nextInt(nodeCount);
			if (from == to) continue;
			double dist = 50 + 450 * r.nextDouble();
			double ideal = 1.2 + 0.8 * r.nextDouble();
			double congestion = 0.4 + 0.6 * r.nextDouble();
			List<String> a = (r.nextDouble() < 0.1) ? List.of("WALK") : allowed;
			edges.add(new DatasetDto.EdgeDto(from, to, dist, ideal, congestion, a));
		}

		List<DatasetDto.FacilityDto> facilities = new ArrayList<>(facilityCount);
		String[] facilityCats = new String[]{"TOILET", "STORE", "FOOD", "HOSPITAL", "ATM", "PRINT", "PARKING", "WATER", "SECURITY", "SERVICE"};
		for (int i = 1; i <= facilityCount; i++) {
			String cat = facilityCats[i % facilityCats.length];
			long nodeId = 1 + r.nextInt(nodeCount);
			double heat = 10 + 90 * r.nextDouble();
			double rating = 2.5 + 2.5 * r.nextDouble();
			Set<String> keywords = Set.of(cat.toLowerCase(Locale.ROOT));
			facilities.add(new DatasetDto.FacilityDto(i, cat + "-" + i, cat, nodeId, keywords, heat, rating));
		}

		DatasetDto.DestinationDto d = new DatasetDto.DestinationDto(
				destinationId,
				destinationName,
				destinationCategory,
				nodes,
				edges,
				facilities
		);

		return new DatasetDto(1, List.of(d));
	}
}
