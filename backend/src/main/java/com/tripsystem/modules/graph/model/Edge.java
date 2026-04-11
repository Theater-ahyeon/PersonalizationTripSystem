package com.tripsystem.modules.graph.model;

import java.util.EnumSet;

/**
 * 道路图边。
 *
 * distanceMeters：用于最短距离
 * idealSpeedMps：理想速度（米/秒）
 * congestion：拥挤度 (0,1]，真实速度 = congestion * idealSpeedMps
 * allowed：允许通行的交通工具集合
 */
public record Edge(
		long from,
		long to,
		double distanceMeters,
		double idealSpeedMps,
		double congestion,
		EnumSet<TransportMode> allowed
) {
	public double travelTimeSeconds() {
		double speed = Math.max(0.0001, congestion * idealSpeedMps);
		return distanceMeters / speed;
	}
}
