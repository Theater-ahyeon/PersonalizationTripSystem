package com.tripsystem.modules.data;

import com.tripsystem.modules.dataset.model.DestinationData;
import com.tripsystem.modules.graph.model.Graph;

import java.util.*;

/**
 * 全局内存存储。
 *
 * <p>课程约束：核心功能不依赖数据库；本 Store 为算法输入的权威来源。</p>
 * <p>按 destinationId 分片存储，便于满足“>=200目的地”的数据规模要求。</p>
 */
public class InMemoryStore {
	private static final InMemoryStore INSTANCE = new InMemoryStore();

	/**
	 * 兼容旧演示：未分片时默认使用的图（SampleDataLoader 仍会写入这里）。
	 * 后续接口将优先走 destinations 分片。
	 */
	private final Graph legacyGraph = new Graph();

	private final Map<Long, DestinationData> destinations = new HashMap<>();
	private final Map<Long, String> destinationDigest = new HashMap<>();

	private InMemoryStore() {
	}

	public static InMemoryStore get() {
		return INSTANCE;
	}

	/**
	 * 兼容旧接口：返回 legacyGraph。
	 */
	public Graph graph() {
		return legacyGraph;
	}

	public synchronized boolean replaceDestination(DestinationData data, String digest) {
		String old = destinationDigest.get(data.id());
		if (old != null && old.equals(digest)) {
			// 幂等：同一份数据重复导入，不触发替换。
			return false;
		}
		destinations.put(data.id(), data);
		destinationDigest.put(data.id(), digest);
		return true;
	}

	public synchronized Optional<DestinationData> destination(long destinationId) {
		return Optional.ofNullable(destinations.get(destinationId));
	}

	public synchronized List<DestinationData> allDestinations() {
		return new ArrayList<>(destinations.values());
	}

	public synchronized String digestOf(long destinationId) {
		return destinationDigest.getOrDefault(destinationId, "");
	}
}
