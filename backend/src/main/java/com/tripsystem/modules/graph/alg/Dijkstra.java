package com.tripsystem.modules.graph.alg;

import com.tripsystem.modules.graph.model.Edge;
import com.tripsystem.modules.graph.model.Graph;

import java.util.*;

/**
 * Dijkstra：最短距离/最短时间等可通过 weightFn 指定。
 */
public class Dijkstra {

	public interface WeightFn {
		double weight(Edge e);
	}

	public record PathResult(double totalWeight, List<Long> pathNodeIds) {
	}

	private record State(long nodeId, double dist) {
	}

	public static Optional<PathResult> shortestPath(Graph g, long start, long goal, WeightFn weightFn) {
		if (start == goal) {
			return Optional.of(new PathResult(0.0, List.of(start)));
		}

		Map<Long, Double> dist = new HashMap<>();
		Map<Long, Long> prev = new HashMap<>();
		PriorityQueue<State> pq = new PriorityQueue<>(Comparator.comparingDouble(State::dist));

		dist.put(start, 0.0);
		pq.add(new State(start, 0.0));

		while (!pq.isEmpty()) {
			State cur = pq.poll();
			if (cur.dist() != dist.getOrDefault(cur.nodeId(), Double.POSITIVE_INFINITY)) {
				continue;
			}
			if (cur.nodeId() == goal) {
				break;
			}

			for (Edge e : g.edgesFrom(cur.nodeId())) {
				double w = weightFn.weight(e);
				if (w < 0) continue;
				double nd = cur.dist() + w;
				if (nd < dist.getOrDefault(e.to(), Double.POSITIVE_INFINITY)) {
					dist.put(e.to(), nd);
					prev.put(e.to(), cur.nodeId());
					pq.add(new State(e.to(), nd));
				}
			}
		}

		Double best = dist.get(goal);
		if (best == null) return Optional.empty();

		LinkedList<Long> path = new LinkedList<>();
		long x = goal;
		path.addFirst(x);
		while (prev.containsKey(x)) {
			x = prev.get(x);
			path.addFirst(x);
			if (x == start) break;
		}
		if (path.getFirst() != start) return Optional.empty();
		return Optional.of(new PathResult(best, path));
	}
}
