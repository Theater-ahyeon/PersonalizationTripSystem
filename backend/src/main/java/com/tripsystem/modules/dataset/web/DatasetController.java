package com.tripsystem.modules.dataset.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripsystem.common.api.ApiResponse;
import com.tripsystem.modules.data.InMemoryStore;
import com.tripsystem.modules.dataset.dto.DatasetDto;
import com.tripsystem.modules.dataset.model.DestinationData;
import com.tripsystem.modules.dataset.service.DatasetGenerator;
import com.tripsystem.modules.dataset.service.DatasetImportService;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 数据集导入与一键装载。
 */
@RestController
@RequestMapping("/api")
public class DatasetController {
	private final DatasetImportService importService;
	private final DatasetGenerator generator = new DatasetGenerator();
	private final ObjectMapper objectMapper;

	public DatasetController(DatasetImportService importService, ObjectMapper objectMapper) {
		this.importService = importService;
		this.objectMapper = objectMapper;
	}

	/**
	 * 正式导入入口：前端/脚本直接 POST JSON 数据集。
	 */
	@PostMapping("/admin/dataset/import")
	public ApiResponse<DatasetImportService.ImportReport> importDataset(
			@RequestBody JsonNode body,
			@RequestParam(defaultValue = "REPLACE") DatasetImportService.ImportMode mode,
			@RequestParam(defaultValue = "body") String source
	) {
		return ApiResponse.ok(importService.importJson(source, body, mode));
	}

	/**
	 * 一键装载：从 classpath 加载数据集文件（建议使用带足量 edges/facilities 的文件）。
	 */
	@PostMapping("/demo/dataset/load-classpath")
	public ApiResponse<DatasetImportService.ImportReport> loadClasspath(
			@RequestParam(defaultValue = "data/dataset-generated.json") String name,
			@RequestParam(defaultValue = "REPLACE") DatasetImportService.ImportMode mode
	) {
		return ApiResponse.ok(importService.importClasspath(name, mode));
	}

	/**
	 * 一键装载：生成满足数量要求的数据集并导入（可复现）。
	 */
	@PostMapping("/demo/dataset/load-generated")
	public ApiResponse<DatasetImportService.ImportReport> loadGenerated(
			@RequestParam(defaultValue = "1") long destinationId,
			@RequestParam(defaultValue = "演示校园") String destinationName,
			@RequestParam(defaultValue = "CAMPUS") String destinationCategory,
			@RequestParam(defaultValue = "25") int nodes,
			@RequestParam(defaultValue = "220") int edges,
			@RequestParam(defaultValue = "60") int facilities,
			@RequestParam(defaultValue = "1") long seed,
			@RequestParam(defaultValue = "REPLACE") DatasetImportService.ImportMode mode
	) {
		DatasetDto dataset = generator.generateSingleDestination(destinationId, destinationName, destinationCategory, nodes, edges, facilities, seed);
		JsonNode root = objectMapper.valueToTree(dataset);
		return ApiResponse.ok(importService.importJson("generated(seed=" + seed + ")", root, mode));
	}

	/**
	 * 查看当前已装载数据概况。
	 */
	@GetMapping("/admin/dataset/stats")
	public ApiResponse<List<DestinationStats>> stats() {
		List<DestinationStats> res = new ArrayList<>();
		for (DestinationData d : InMemoryStore.get().allDestinations()) {
			res.add(new DestinationStats(d.id(), d.name(), d.category(), d.graph().nodes().size(), countEdges(d), d.facilities().size(), InMemoryStore.get().digestOf(d.id())));
		}
		return ApiResponse.ok(res);
	}

	private static int countEdges(DestinationData d) {
		int cnt = 0;
		for (var n : d.graph().nodes()) {
			cnt += d.graph().edgesFrom(n.id()).size();
		}
		return cnt;
	}

	public record DestinationStats(long destinationId, String name, String category, int nodes, int edges, int facilities, String digest) {
	}
}
