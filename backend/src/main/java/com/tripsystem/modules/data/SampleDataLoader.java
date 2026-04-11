package com.tripsystem.modules.data;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripsystem.modules.data.dto.SampleGraphDto;
import com.tripsystem.modules.graph.model.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.EnumSet;

@Component
public class SampleDataLoader {
	private final ObjectMapper objectMapper;

	public SampleDataLoader(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public void loadSampleGraph() throws IOException {
		var res = new ClassPathResource("data/sample-graph.json");
		SampleGraphDto dto = objectMapper.readValue(res.getInputStream(), SampleGraphDto.class);

		Graph g = InMemoryStore.get().graph();
		for (SampleGraphDto.NodeDto n : dto.nodes()) {
			g.upsertNode(new Node(n.id(), n.name(), n.category(), new GeoPoint(n.lng(), n.lat()), java.util.Set.of()));
		}
		for (SampleGraphDto.EdgeDto e : dto.edges()) {
			EnumSet<TransportMode> allowed = EnumSet.noneOf(TransportMode.class);
			for (String s : e.allowed()) {
				allowed.add(TransportMode.valueOf(s));
			}
			g.addDirectedEdge(new Edge(e.from(), e.to(), e.distanceMeters(), e.idealSpeedMps(), e.congestion(), allowed));
		}
	}
}
