import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __resetWebGpuSupportCacheForTests,
  detectWebGpuSupport,
  defaultRendererRuntimeState,
  describeRendererFallbackReason,
  resolveRendererRuntimeState,
  toRendererInitFailureState,
  toRendererRuntimeFailureState,
} from "@/lib/graphics/renderer-mode";

afterEach(() => {
  vi.unstubAllGlobals();
  __resetWebGpuSupportCacheForTests();
});

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

  it("reports unsupported when navigator.gpu is unavailable", async () => {
    vi.stubGlobal("window", { navigator: {} });

    const support = await detectWebGpuSupport();
    expect(support).toEqual({
      supported: false,
      reason: "webgpu_unsupported",
      detail: "navigator.gpu unavailable",
    });
  });

  it("uses WebGPU mode when adapter and device are available", async () => {
    const requestDevice = vi.fn(async () => ({ destroy: vi.fn() }));
    const requestAdapter = vi.fn(async () => ({ requestDevice }));
    vi.stubGlobal("window", {
      navigator: {
        gpu: {
          requestAdapter,
        },
      },
    });

    const state = await resolveRendererRuntimeState("auto");
    expect(requestAdapter).toHaveBeenCalledWith({ powerPreference: "high-performance" });
    expect(requestDevice).toHaveBeenCalledTimes(1);
    expect(state.activeMode).toBe("webgpu");
    expect(state.fallbackReason).toBe("none");
    expect(state.webgpuSupported).toBe(true);
  });

  it("falls back to WebGL when adapter cannot be acquired", async () => {
    const requestAdapter = vi.fn(async () => null);
    vi.stubGlobal("window", {
      navigator: {
        gpu: {
          requestAdapter,
        },
      },
    });

    const state = await resolveRendererRuntimeState("auto");
    expect(state.activeMode).toBe("webgl");
    expect(state.fallbackReason).toBe("webgpu_adapter_unavailable");
    expect(state.detail).toBe("requestAdapter returned null");
  });

  it("falls back to WebGL when device creation fails", async () => {
    const requestAdapter = vi.fn(async () => ({
      requestDevice: async () => {
        throw new Error("No compatible WebGPU device");
      },
    }));
    vi.stubGlobal("window", {
      navigator: {
        gpu: {
          requestAdapter,
        },
      },
    });

    const state = await resolveRendererRuntimeState("auto");
    expect(state.activeMode).toBe("webgl");
    expect(state.fallbackReason).toBe("webgpu_device_unavailable");
    expect(state.detail).toContain("No compatible WebGPU device");
  });
});
