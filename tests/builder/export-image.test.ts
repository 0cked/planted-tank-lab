import { describe, expect, it } from "vitest";

import { buildImageExportFileName } from "@/components/builder/visual/export";

describe("buildImageExportFileName", () => {
  it("formats build name in the required export pattern", () => {
    expect(buildImageExportFileName("My Dutch Style Build")).toBe("my-dutch-style-build-plantedtanklab.png");
  });

  it("falls back to a default build slug when the name is empty", () => {
    expect(buildImageExportFileName("")).toBe("visual-build-plantedtanklab.png");
    expect(buildImageExportFileName(null)).toBe("visual-build-plantedtanklab.png");
  });

  it("strips unsupported filename characters", () => {
    expect(buildImageExportFileName("  ADA 60-P / Iwagumi #1 ")).toBe("ada-60-p-iwagumi-1-plantedtanklab.png");
  });
});
