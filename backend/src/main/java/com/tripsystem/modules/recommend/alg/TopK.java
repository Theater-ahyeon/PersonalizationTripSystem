package com.tripsystem.modules.recommend.alg;

import java.util.*;

/**
 * TopK（K=10 为典型）：使用小顶堆避免全排序。
 */
public class TopK {

	public interface Scorer<T> {
		double score(T item);
	}

	private record Scored<T>(T item, double score) {
	}

	public static <T> List<T> topK(Collection<T> items, int k, Scorer<T> scorer) {
		if (k <= 0) return List.of();
		PriorityQueue<Scored<T>> heap = new PriorityQueue<>(Comparator.comparingDouble(Scored::score));

		for (T item : items) {
			double s = scorer.score(item);
			if (heap.size() < k) {
				heap.add(new Scored<>(item, s));
			} else if (s > heap.peek().score()) {
				heap.poll();
				heap.add(new Scored<>(item, s));
			}
		}

		List<Scored<T>> tmp = new ArrayList<>(heap);
		tmp.sort((a, b) -> Double.compare(b.score(), a.score()));
		List<T> res = new ArrayList<>(tmp.size());
		for (Scored<T> x : tmp) res.add(x.item());
		return res;
	}
}
