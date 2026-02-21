import { describe, expect, it } from "vitest";

import {
  defaultRendererRuntimeState,
  describeRendererFallbackReason,
  toRendererInitFailureState,
  toRendererRuntimeFailureState,
} from "@/lib/graphics/renderer-mode";

describe("renderer mode helpers", () => {
  it("defaults auto preference to WebGPU requested with WebGL fallback state", () => {
    const state = defaultRendererRuntimeState("auto");

    expect(state.preference).toBe("auto");
    expect(state.requestedMode).toBe("webgpu");
    expect(state.activeMode).toBe("webgl");
    expect(state.fallbackReason).toBe("webgpu_unsupported");
  });

  it("returns a manual-webgl runtime state for forced WebGL preference", () => {
    const state = defaultRendererRuntimeState("webgl");

    expect(state.preference).toBe("webgl");
    expect(state.requestedMode).toBe("webgl");
    expect(state.activeMode).toBe("webgl");
    expect(state.fallbackReason).toBe("forced_webgl");
  });

  it("converts init errors into explicit webgpu_renderer_init_failed fallback states", () => {
    const current = defaultRendererRuntimeState("auto");
    const next = toRendererInitFailureState("auto", current, new Error("GPU device lost"));

    expect(next.preference).toBe("auto");
    expect(next.requestedMode).toBe("webgpu");
    expect(next.activeMode).toBe("webgl");
    expect(next.fallbackReason).toBe("webgpu_renderer_init_failed");
    expect(next.detail).toContain("GPU device lost");
  });

  it("converts runtime errors into explicit webgpu_runtime_failed fallback states", () => {
    const current = defaultRendererRuntimeState("auto");
    const next = toRendererRuntimeFailureState("auto", current, new Error("Texture upload failed"));

    expect(next.preference).toBe("auto");
    expect(next.requestedMode).toBe("webgpu");
    expect(next.activeMode).toBe("webgl");
    expect(next.fallbackReason).toBe("webgpu_runtime_failed");
    expect(next.detail).toContain("Texture upload failed");
  });

  it("describes fallback reasons in human-readable labels", () => {
    expect(describeRendererFallbackReason("none")).toBe("None");
    expect(describeRendererFallbackReason("forced_webgl")).toBe("WebGL manually selected");
    expect(describeRendererFallbackReason("webgpu_renderer_init_failed")).toBe(
      "WebGPU renderer init failed",
    );
    expect(describeRendererFallbackReason("webgpu_runtime_failed")).toBe(
      "WebGPU runtime failed",
    );
  });
});
