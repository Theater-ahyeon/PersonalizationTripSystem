package com.tripsystem.modules.graph;

import com.tripsystem.common.api.ApiResponse;
import com.tripsystem.common.enums.ErrorCode;
import com.tripsystem.common.exception.ApiException;
import com.tripsystem.modules.data.InMemoryStore;
import com.tripsystem.modules.graph.alg.Dijkstra;
import com.tripsystem.modules.graph.model.Graph;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/graph")
public class GraphController {

	private Graph graphOf(long destinationId) {
		// 优先使用正式导入的目的地分片；否则回退到 legacyGraph（兼容旧 demo）。
		return InMemoryStore.get().destination(destinationId)
				.map(d -> d.graph())
				.orElseGet(() -> {
					if (destinationId == 0 || destinationId == 1) return InMemoryStore.get().graph();
					throw new ApiException(ErrorCode.NOT_FOUND, "destination not loaded: " + destinationId);
				});
	}

	@GetMapping("/shortest-distance")
	public ApiResponse<?> shortestDistance(
			@RequestParam long start,
			@RequestParam long goal,
			@RequestParam(defaultValue = "1") long destinationId
	) {
		Graph g = graphOf(destinationId);
		Optional<Dijkstra.PathResult> res = Dijkstra.shortestPath(g, start, goal, e -> e.distanceMeters());
		return ApiResponse.ok(res.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "path not found")));
	}

	@GetMapping("/shortest-time")
	public ApiResponse<?> shortestTime(
			@RequestParam long start,
			@RequestParam long goal,
			@RequestParam(defaultValue = "1") long destinationId
	) {
		Graph g = graphOf(destinationId);
		Optional<Dijkstra.PathResult> res = Dijkstra.shortestPath(g, start, goal, e -> e.travelTimeSeconds());
		return ApiResponse.ok(res.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "path not found")));
	}
}
