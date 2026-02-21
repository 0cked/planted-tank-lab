import type {
  VisualRendererFallbackReason,
  VisualRendererMode,
  VisualRendererPreference,
  VisualRendererRuntimeState,
} from "@/components/builder/visual/types";

type WebGpuSupportResult = {
  supported: boolean;
  reason:
    | "none"
    | "webgpu_unsupported"
    | "webgpu_adapter_unavailable"
    | "webgpu_device_unavailable";
  detail: string | null;
};

let cachedWebGpuSupport: Promise<WebGpuSupportResult> | null = null;

function toErrorDetail(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message.slice(0, 280);
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.slice(0, 280);
  }
  return "Unknown renderer error";
}

export function defaultRendererRuntimeState(
  preference: VisualRendererPreference,
): VisualRendererRuntimeState {
  if (preference === "webgl") {
    return {
      preference,
      requestedMode: "webgl",
      activeMode: "webgl",
      fallbackReason: "forced_webgl",
      webgpuSupported: false,
      detail: "WebGL manually selected",
    };
  }

  return {
    preference,
    requestedMode: "webgpu",
    activeMode: "webgl",
    fallbackReason: "webgpu_unsupported",
    webgpuSupported: false,
    detail: null,
  };
}

export function describeRendererFallbackReason(reason: VisualRendererFallbackReason): string {
  if (reason === "none") return "None";
  if (reason === "forced_webgl") return "WebGL manually selected";
  if (reason === "webgpu_unsupported") return "WebGPU unsupported";
  if (reason === "webgpu_adapter_unavailable") return "No GPU adapter available";
  if (reason === "webgpu_device_unavailable") return "GPU device creation failed";
  if (reason === "webgpu_runtime_failed") return "WebGPU runtime failed";
  return "WebGPU renderer init failed";
}

export async function detectWebGpuSupport(): Promise<WebGpuSupportResult> {
  if (cachedWebGpuSupport) {
    return cachedWebGpuSupport;
  }

  cachedWebGpuSupport = (async () => {
    if (typeof window === "undefined") {
      return {
        supported: false,
        reason: "webgpu_unsupported",
        detail: "Window unavailable",
      };
    }

    const nav = window.navigator as Navigator & {
      gpu?: {
        requestAdapter?: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<{
          requestDevice?: () => Promise<{ destroy?: () => void }>;
        } | null>;
      };
    };

    if (!nav.gpu?.requestAdapter) {
      return {
        supported: false,
        reason: "webgpu_unsupported",
        detail: "navigator.gpu unavailable",
      };
    }

    let adapter:
      | {
          requestDevice?: () => Promise<{ destroy?: () => void }>;
        }
      | null = null;
    try {
      adapter = await nav.gpu.requestAdapter({ powerPreference: "high-performance" });
    } catch (error) {
      return {
        supported: false,
        reason: "webgpu_adapter_unavailable",
        detail: toErrorDetail(error),
      };
    }

    if (!adapter?.requestDevice) {
      return {
        supported: false,
        reason: "webgpu_adapter_unavailable",
        detail: "requestAdapter returned null",
      };
    }

    try {
      const device = await adapter.requestDevice();
      device?.destroy?.();
      return {
        supported: true,
        reason: "none",
        detail: null,
      };
    } catch (error) {
      return {
        supported: false,
        reason: "webgpu_device_unavailable",
        detail: toErrorDetail(error),
      };
    }
  })();

  return cachedWebGpuSupport;
}

export async function resolveRendererRuntimeState(
  preference: VisualRendererPreference,
): Promise<VisualRendererRuntimeState> {
  const requestedMode: VisualRendererMode = preference === "webgl" ? "webgl" : "webgpu";

  if (preference === "webgl") {
    return {
      preference,
      requestedMode,
      activeMode: "webgl",
      fallbackReason: "forced_webgl",
      webgpuSupported: false,
      detail: "WebGL manually selected",
    };
  }

  const support = await detectWebGpuSupport();
  if (support.supported) {
    return {
      preference,
      requestedMode,
      activeMode: "webgpu",
      fallbackReason: "none",
      webgpuSupported: true,
      detail: null,
    };
  }

  return {
    preference,
    requestedMode,
    activeMode: "webgl",
    fallbackReason: support.reason,
    webgpuSupported: false,
    detail: support.detail,
  };
}

export function toRendererInitFailureState(
  preference: VisualRendererPreference,
  current: VisualRendererRuntimeState,
  error: unknown,
): VisualRendererRuntimeState {
  return {
    preference,
    requestedMode: preference === "webgl" ? "webgl" : "webgpu",
    activeMode: "webgl",
    fallbackReason: "webgpu_renderer_init_failed",
    webgpuSupported: current.webgpuSupported,
    detail: toErrorDetail(error),
  };
}

export function toRendererRuntimeFailureState(
  preference: VisualRendererPreference,
  current: VisualRendererRuntimeState,
  error: unknown,
): VisualRendererRuntimeState {
  return {
    preference,
    requestedMode: preference === "webgl" ? "webgl" : "webgpu",
    activeMode: "webgl",
    fallbackReason: "webgpu_runtime_failed",
    webgpuSupported: current.webgpuSupported,
    detail: toErrorDetail(error),
  };
}
