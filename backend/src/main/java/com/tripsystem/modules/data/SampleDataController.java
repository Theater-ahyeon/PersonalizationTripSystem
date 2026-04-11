package com.tripsystem.modules.data;

import com.tripsystem.common.api.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/demo")
public class SampleDataController {
	private final SampleDataLoader loader;

	public SampleDataController(SampleDataLoader loader) {
		this.loader = loader;
	}

	@PostMapping("/load-sample")
	public ApiResponse<String> loadSample() throws Exception {
		loader.loadSampleGraph();
		return ApiResponse.ok("sample graph loaded");
	}
}
