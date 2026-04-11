package com.tripsystem.modules.dataset.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import com.tripsystem.common.enums.ErrorCode;
import com.tripsystem.common.exception.ApiException;
import com.tripsystem.modules.data.InMemoryStore;
import com.tripsystem.modules.dataset.dto.DatasetDto;
import com.tripsystem.modules.dataset.model.DestinationData;
import com.tripsystem.modules.dataset.model.Facility;
import com.tripsystem.modules.graph.model.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/**
 * 数据集导入：JSON Schema 校验 + 语义校验 + 幂等更新（按 destinationId 分片）。
 */
@Service
public class DatasetImportService {
	public enum ImportMode {
		REPLACE
	}

	private static final int REQUIRED_MIN_NODES = 20;
	private static final int REQUIRED_MIN_EDGES = 200;
	private static final int REQUIRED_MIN_FACILITIES = 50;

	private final ObjectMapper objectMapper;
	private final JsonSchema schema;

	public DatasetImportService(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
		this.schema = loadSchema();
	}

	public ImportReport importJson(String source, JsonNode root, ImportMode mode) {
		if (root == null || root.isNull()) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "dataset json body is required");
		}
		validateBySchema(root);

		DatasetDto dto;
		try {
			dto = objectMapper.treeToValue(root, DatasetDto.class);
		} catch (Exception e) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "dataset json mapping failed: " + e.getMessage());
		}

		if (dto.destinations() == null || dto.destinations().isEmpty()) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "destinations must not be empty");
		}

		String digest = sha256Hex(root.toString());
		List<DestinationReport> destinationReports = new ArrayList<>();

		for (DatasetDto.DestinationDto d : dto.destinations()) {
			DestinationData data = buildDestinationData(d);
			boolean applied = applyToStore(mode, data, digest);
			destinationReports.add(new DestinationReport(data.id(), data.name(), applied,
					data.graph().nodes().size(), countEdges(data.graph()), data.facilities().size()));
		}

		return new ImportReport(source, digest, destinationReports);
	}

	public ImportReport importClasspath(String classpathResourceName, ImportMode mode) {
		try {
			ClassPathResource res = new ClassPathResource(classpathResourceName);
			if (!res.exists()) {
				throw new ApiException(ErrorCode.NOT_FOUND, "resource not found: " + classpathResourceName);
			}
			try (InputStream in = res.getInputStream()) {
				JsonNode root = objectMapper.readTree(in);
				return importJson("classpath:" + classpathResourceName, root, mode);
			}
		} catch (ApiException e) {
			throw e;
		} catch (Exception e) {
			throw new ApiException(ErrorCode.INTERNAL_ERROR, "load classpath dataset failed");
		}
	}

	private boolean applyToStore(ImportMode mode, DestinationData data, String digest) {
		if (mode != ImportMode.REPLACE) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "unsupported import mode: " + mode);
		}

		return InMemoryStore.get().replaceDestination(data, digest);
	}

	private DestinationData buildDestinationData(DatasetDto.DestinationDto d) {
		if (d == null) throw new ApiException(ErrorCode.BAD_REQUEST, "destination is null");
		if (d.nodes() == null || d.edges() == null || d.facilities() == null) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "destination nodes/edges/facilities must not be null");
		}

		// 数量约束（按课程最低要求）
		if (d.nodes().size() < REQUIRED_MIN_NODES) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "destination " + d.id() + " nodes must be >= " + REQUIRED_MIN_NODES);
		}
		if (d.edges().size() < REQUIRED_MIN_EDGES) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "destination " + d.id() + " edges must be >= " + REQUIRED_MIN_EDGES);
		}
		if (d.facilities().size() < REQUIRED_MIN_FACILITIES) {
			throw new ApiException(ErrorCode.BAD_REQUEST, "destination " + d.id() + " facilities must be >= " + REQUIRED_MIN_FACILITIES);
		}

		Graph g = new Graph();

		Set<Long> nodeIds = new HashSet<>();
		for (DatasetDto.NodeDto n : d.nodes()) {
			if (!nodeIds.add(n.id())) {
				throw new ApiException(ErrorCode.BAD_REQUEST, "duplicate node id: " + n.id());
			}
			Set<String> keywords = (n.keywords() == null) ? Set.of() : Set.copyOf(n.keywords());
			g.upsertNode(new Node(n.id(), n.name(), n.category(), new GeoPoint(n.lng(), n.lat()), keywords));
		}

		for (DatasetDto.EdgeDto e : d.edges()) {
			if (!nodeIds.contains(e.from()) || !nodeIds.contains(e.to())) {
				throw new ApiException(ErrorCode.BAD_REQUEST, "edge references missing node: from=" + e.from() + ", to=" + e.to());
			}
			EnumSet<TransportMode> allowed = EnumSet.noneOf(TransportMode.class);
			for (String s : e.allowed()) {
				try {
					allowed.add(TransportMode.valueOf(s));
				} catch (Exception ex) {
					throw new ApiException(ErrorCode.BAD_REQUEST, "invalid transport mode: " + s);
				}
			}
			g.addDirectedEdge(new Edge(e.from(), e.to(), e.distanceMeters(), e.idealSpeedMps(), e.congestion(), allowed));
		}

		Set<Long> facilityIds = new HashSet<>();
		List<Facility> facilities = new ArrayList<>(d.facilities().size());
		for (DatasetDto.FacilityDto f : d.facilities()) {
			if (!facilityIds.add(f.id())) {
				throw new ApiException(ErrorCode.BAD_REQUEST, "duplicate facility id: " + f.id());
			}
			if (!nodeIds.contains(f.nodeId())) {
				throw new ApiException(ErrorCode.BAD_REQUEST, "facility references missing nodeId: " + f.nodeId());
			}
			Set<String> keywords = (f.keywords() == null) ? Set.of() : Set.copyOf(f.keywords());
			double heat = (f.heat() == null) ? 0.0 : f.heat();
			double rating = (f.rating() == null) ? 0.0 : f.rating();
			facilities.add(new Facility(f.id(), f.name(), f.category(), f.nodeId(), keywords, heat, rating));
		}

		return new DestinationData(d.id(), d.name(), d.category(), g, facilities);
	}

	private void validateBySchema(JsonNode root) {
		Set<ValidationMessage> errors = schema.validate(root);
		if (!errors.isEmpty()) {
			StringBuilder sb = new StringBuilder();
			int i = 0;
			for (ValidationMessage m : errors) {
				if (i++ >= 10) {
					sb.append(" ...");
					break;
				}
				sb.append(m.getMessage()).append("; ");
			}
			throw new ApiException(ErrorCode.BAD_REQUEST, "dataset schema validation failed: " + sb);
		}
	}

	private JsonSchema loadSchema() {
		try {
			JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
			ClassPathResource res = new ClassPathResource("schema/tripsystem-dataset.schema.json");
			try (InputStream in = res.getInputStream()) {
				return factory.getSchema(in);
			}
		} catch (Exception e) {
			throw new IllegalStateException("failed to load dataset schema", e);
		}
	}

	private static String sha256Hex(String text) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			byte[] out = md.digest(text.getBytes(StandardCharsets.UTF_8));
			StringBuilder sb = new StringBuilder(out.length * 2);
			for (byte b : out) sb.append(String.format(Locale.ROOT, "%02x", b));
			return sb.toString();
		} catch (Exception e) {
			return "";
		}
	}

	private static int countEdges(Graph g) {
		int cnt = 0;
		for (Node n : g.nodes()) {
			cnt += g.edgesFrom(n.id()).size();
		}
		return cnt;
	}

	public record ImportReport(String source, String digest, List<DestinationReport> destinations) {
	}

	public record DestinationReport(long destinationId, String name, boolean applied, int nodes, int edges, int facilities) {
	}
}
