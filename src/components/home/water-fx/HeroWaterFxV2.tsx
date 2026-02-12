"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, RenderTarget, Renderer, Texture, Triangle } from "ogl";

type HeroWaterFxV2Props = {
  enabled: boolean;
};

type Vec2 = { x: number; y: number };

type TextParticle = {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  detach: number;
  size: number;
  phase: number;
};

type QualityPreset = {
  name: "high" | "medium" | "low";
  dprCap: number;
  simScale: number;
  flowDissipation: number;
  dyeDissipation: number;
  splatRadius: number;
  maxParticles: number;
  enableDissolve: boolean;
  compositeAlpha: number;
};

const QUALITY_PRESETS: Record<QualityPreset["name"], QualityPreset> = {
  // Desktop: rich fluid detail, stronger dissolve envelope.
  high: {
    name: "high",
    dprCap: 1.5,
    simScale: 0.38,
    flowDissipation: 0.985,
    dyeDissipation: 0.992,
    splatRadius: 0.05,
    maxParticles: 1300,
    enableDissolve: true,
    compositeAlpha: 0.95,
  },
  // Mid-tier laptops: reduced sim resolution and particle count.
  medium: {
    name: "medium",
    dprCap: 1.25,
    simScale: 0.3,
    flowDissipation: 0.982,
    dyeDissipation: 0.99,
    splatRadius: 0.055,
    maxParticles: 850,
    enableDissolve: true,
    compositeAlpha: 0.9,
  },
  // Mobile / lower-power: subtle field, conservative dissolve.
  low: {
    name: "low",
    dprCap: 1,
    simScale: 0.24,
    flowDissipation: 0.978,
    dyeDissipation: 0.988,
    splatRadius: 0.065,
    maxParticles: 420,
    enableDissolve: false,
    compositeAlpha: 0.84,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chooseQualityPreset(viewportWidth: number): QualityPreset {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4;
  const memoryHint =
    typeof navigator !== "undefined" && "deviceMemory" in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4)
      : 4;

  if (viewportWidth < 900 || cores <= 4 || memoryHint <= 4) {
    return QUALITY_PRESETS.low;
  }

  if (viewportWidth < 1320 || cores <= 6 || memoryHint <= 8) {
    return QUALITY_PRESETS.medium;
  }

  return QUALITY_PRESETS.high;
}

class CpuFlowField {
  private cols = 0;
  private rows = 0;
  private vx: Float32Array = new Float32Array(0);
  private vy: Float32Array = new Float32Array(0);
  private tmpVx: Float32Array = new Float32Array(0);
  private tmpVy: Float32Array = new Float32Array(0);

  resize(cols: number, rows: number): void {
    const safeCols = Math.max(2, cols);
    const safeRows = Math.max(2, rows);
    const size = safeCols * safeRows;

    this.cols = safeCols;
    this.rows = safeRows;
    this.vx = new Float32Array(size);
    this.vy = new Float32Array(size);
    this.tmpVx = new Float32Array(size);
    this.tmpVy = new Float32Array(size);
  }

  step(dt: number): void {
    if (this.cols <= 1 || this.rows <= 1) return;
    const blend = clamp(dt * 14, 0.04, 0.22);
    const drag = clamp(1 - dt * 1.7, 0.88, 0.995);

    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const idx = y * this.cols + x;
        const x0 = Math.max(0, x - 1);
        const x1 = Math.min(this.cols - 1, x + 1);
        const y0 = Math.max(0, y - 1);
        const y1 = Math.min(this.rows - 1, y + 1);

        const left = y * this.cols + x0;
        const right = y * this.cols + x1;
        const up = y0 * this.cols + x;
        const down = y1 * this.cols + x;

        const avgX = (this.vx[left] + this.vx[right] + this.vx[up] + this.vx[down]) * 0.25;
        const avgY = (this.vy[left] + this.vy[right] + this.vy[up] + this.vy[down]) * 0.25;

        this.tmpVx[idx] = (this.vx[idx] + (avgX - this.vx[idx]) * blend) * drag;
        this.tmpVy[idx] = (this.vy[idx] + (avgY - this.vy[idx]) * blend) * drag;
      }
    }

    this.vx.set(this.tmpVx);
    this.vy.set(this.tmpVy);
  }

  inject(ux: number, uy: number, vx: number, vy: number, radius: number): void {
    if (this.cols <= 1 || this.rows <= 1) return;

    const cx = clamp(ux, 0, 1) * (this.cols - 1);
    const cy = clamp(uy, 0, 1) * (this.rows - 1);
    const r = Math.max(1, radius * Math.min(this.cols, this.rows));

    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(this.cols - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(this.rows - 1, Math.ceil(cy + r));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        if (dist > 1) continue;

        const falloff = Math.exp(-dist * dist * 4.5);
        const idx = y * this.cols + x;
        this.vx[idx] += vx * falloff;
        this.vy[idx] += vy * falloff;
      }
    }
  }

  sample(ux: number, uy: number): Vec2 {
    if (this.cols <= 1 || this.rows <= 1) return { x: 0, y: 0 };

    const fx = clamp(ux, 0, 1) * (this.cols - 1);
    const fy = clamp(uy, 0, 1) * (this.rows - 1);

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(this.cols - 1, x0 + 1);
    const y1 = Math.min(this.rows - 1, y0 + 1);

    const tx = fx - x0;
    const ty = fy - y0;

    const i00 = y0 * this.cols + x0;
    const i10 = y0 * this.cols + x1;
    const i01 = y1 * this.cols + x0;
    const i11 = y1 * this.cols + x1;

    const vx0 = this.vx[i00] * (1 - tx) + this.vx[i10] * tx;
    const vx1 = this.vx[i01] * (1 - tx) + this.vx[i11] * tx;
    const vy0 = this.vy[i00] * (1 - tx) + this.vy[i10] * tx;
    const vy1 = this.vy[i01] * (1 - tx) + this.vy[i11] * tx;

    return {
      x: vx0 * (1 - ty) + vx1 * ty,
      y: vy0 * (1 - ty) + vy1 * ty,
    };
  }
}

const VERT = `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const ADVECT_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tSource;
  uniform sampler2D tVelocity;
  uniform float dt;
  uniform float dissipation;
  uniform float advection;
  uniform float isVelocity;

  vec2 decodeVel(vec2 encoded) {
    return encoded * 2.0 - 1.0;
  }

  vec2 encodeVel(vec2 velocity) {
    return velocity * 0.5 + 0.5;
  }

  void main() {
    vec2 vel = decodeVel(texture2D(tVelocity, vUv).xy);
    vec2 coord = clamp(vUv - vel * dt * advection, 0.001, 0.999);
    vec4 src = texture2D(tSource, coord);

    if (isVelocity > 0.5) {
      vec2 encoded = encodeVel(decodeVel(src.xy) * dissipation);
      gl_FragColor = vec4(encoded, 0.0, 1.0);
      return;
    }

    gl_FragColor = vec4(src.rgb * dissipation, 1.0);
  }
`;

const SPLAT_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tTarget;
  uniform vec2 point;
  uniform vec2 force;
  uniform vec3 color;
  uniform float radius;
  uniform float aspect;
  uniform float mode;

  vec2 decodeVel(vec2 encoded) {
    return encoded * 2.0 - 1.0;
  }

  vec2 encodeVel(vec2 velocity) {
    return velocity * 0.5 + 0.5;
  }

  void main() {
    vec2 p = vUv - point;
    p.x *= aspect;
    float falloff = exp(-dot(p, p) / max(0.00005, radius));
    vec4 base = texture2D(tTarget, vUv);

    if (mode < 0.5) {
      vec2 vel = decodeVel(base.xy);
      vel += force * falloff;
      gl_FragColor = vec4(encodeVel(clamp(vel, vec2(-1.0), vec2(1.0))), 0.0, 1.0);
      return;
    }

    vec3 dye = base.rgb + color * falloff;
    gl_FragColor = vec4(dye, 1.0);
  }
`;

const COMPOSITE_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tVelocity;
  uniform sampler2D tDye;
  uniform sampler2D tBackground;
  uniform float hasBackground;
  uniform float intensity;
  uniform float time;
  uniform float alpha;

  vec2 decodeVel(vec2 encoded) {
    return encoded * 2.0 - 1.0;
  }

  void main() {
    vec2 flow = decodeVel(texture2D(tVelocity, vUv).xy);
    float flowMag = length(flow);

    vec2 refractUv = clamp(vUv + flow * intensity, 0.001, 0.999);

    vec3 base = vec3(0.26, 0.41, 0.34);
    if (hasBackground > 0.5) {
      base = texture2D(tBackground, refractUv).rgb;
    }

    vec3 dye = texture2D(tDye, vUv).rgb;

    float wave = sin((vUv.x + vUv.y + time * 0.1) * 28.0 + flowMag * 20.0);
    float caustic = smoothstep(0.25, 1.0, flowMag) * (0.28 + 0.22 * wave);

    vec3 tinted = base + vec3(0.06, 0.12, 0.14) * caustic + dye * 0.45;
    gl_FragColor = vec4(tinted, alpha);
  }
`;

function createTextParticles(params: {
  heading: HTMLElement;
  rootRect: DOMRect;
  maxParticles: number;
  dpr: number;
}): TextParticle[] {
  const text = (params.heading.textContent ?? "").trim();
  if (!text) return [];

  const headingRect = params.heading.getBoundingClientRect();
  const computed = window.getComputedStyle(params.heading);

  const fontSizePx = Number.parseFloat(computed.fontSize || "48") || 48;
  const lineHeightPx = Number.parseFloat(computed.lineHeight || "0") || fontSizePx * 0.95;
  const fontFamily = computed.fontFamily || "serif";
  const fontWeight = computed.fontWeight || "700";

  const maskWidth = Math.max(16, Math.floor(headingRect.width * params.dpr));
  const maskHeight = Math.max(16, Math.floor(headingRect.height * params.dpr));

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskCtx) return [];

  maskCtx.setTransform(params.dpr, 0, 0, params.dpr, 0, 0);
  maskCtx.clearRect(0, 0, headingRect.width, headingRect.height);
  maskCtx.fillStyle = "#ffffff";
  maskCtx.textBaseline = "top";
  maskCtx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const width = maskCtx.measureText(candidate).width;
    if (width > headingRect.width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  let y = 0;
  for (const currentLine of lines) {
    maskCtx.fillText(currentLine, 0, y);
    y += lineHeightPx;
  }

  const imageData = maskCtx.getImageData(0, 0, maskWidth, maskHeight);
  const data = imageData.data;

  const sampleStep = params.maxParticles > 1100 ? 4 : params.maxParticles > 700 ? 5 : 6;

  const particles: TextParticle[] = [];
  const headingOffsetX = headingRect.left - params.rootRect.left;
  const headingOffsetY = headingRect.top - params.rootRect.top;

  for (let py = 0; py < maskHeight; py += sampleStep) {
    for (let px = 0; px < maskWidth; px += sampleStep) {
      const idx = (py * maskWidth + px) * 4 + 3;
      const alpha = data[idx] ?? 0;
      if (alpha < 140) continue;
      if (particles.length >= params.maxParticles) return particles;

      const x = headingOffsetX + px / params.dpr;
      const yPos = headingOffsetY + py / params.dpr;

      particles.push({
        x,
        y: yPos,
        homeX: x,
        homeY: yPos,
        vx: 0,
        vy: 0,
        detach: 0,
        size: sampleStep <= 4 ? 1.6 : 1.9,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  return particles;
}

export function HeroWaterFxV2({ enabled }: HeroWaterFxV2Props) {
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const glCanvas = glCanvasRef.current;
    const particleCanvas = particleCanvasRef.current;
    if (!glCanvas || !particleCanvas) return;

    const root = document.getElementById("hero-water-root");
    const textRoot = document.getElementById("hero-water-text");
    const heading = document.getElementById("hero-water-heading");
    if (!root || !textRoot || !heading) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    let quality = chooseQualityPreset(window.innerWidth);
    const field = new CpuFlowField();

    const renderer = new Renderer({
      canvas: glCanvas,
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      dpr: Math.min(window.devicePixelRatio || 1, quality.dprCap),
    });

    const gl = renderer.gl;
    gl.disable(gl.DEPTH_TEST);

    const geometry = new Triangle(gl);

    const velocityA = new RenderTarget(gl, {
      width: 16,
      height: 16,
      depth: false,
      stencil: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });
    const velocityB = new RenderTarget(gl, {
      width: 16,
      height: 16,
      depth: false,
      stencil: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });

    const dyeA = new RenderTarget(gl, {
      width: 16,
      height: 16,
      depth: false,
      stencil: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });
    const dyeB = new RenderTarget(gl, {
      width: 16,
      height: 16,
      depth: false,
      stencil: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    });

    const velocity = {
      read: velocityA,
      write: velocityB,
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
    };

    const dye = {
      read: dyeA,
      write: dyeB,
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
    };

    const advectUniforms = {
      tSource: { value: velocity.read.texture },
      tVelocity: { value: velocity.read.texture },
      dt: { value: 0.016 },
      dissipation: { value: quality.flowDissipation },
      advection: { value: 0.24 },
      isVelocity: { value: 1 },
    };

    const advectProgram = new Program(gl, {
      vertex: VERT,
      fragment: ADVECT_FRAG,
      uniforms: advectUniforms,
    });

    const splatUniforms = {
      tTarget: { value: velocity.read.texture },
      point: { value: [0.5, 0.5] as [number, number] },
      force: { value: [0, 0] as [number, number] },
      color: { value: [0.2, 0.4, 0.5] as [number, number, number] },
      radius: { value: quality.splatRadius },
      aspect: { value: 1 },
      mode: { value: 0 },
    };

    const splatProgram = new Program(gl, {
      vertex: VERT,
      fragment: SPLAT_FRAG,
      uniforms: splatUniforms,
    });

    const backgroundTexture = new Texture(gl, { generateMipmaps: false });
    const compositeUniforms = {
      tVelocity: { value: velocity.read.texture },
      tDye: { value: dye.read.texture },
      tBackground: { value: backgroundTexture },
      hasBackground: { value: 0 },
      intensity: { value: 0.028 },
      time: { value: 0 },
      alpha: { value: quality.compositeAlpha },
    };

    const compositeProgram = new Program(gl, {
      vertex: VERT,
      fragment: COMPOSITE_FRAG,
      uniforms: compositeUniforms,
      transparent: true,
    });

    const blit = new Mesh(gl, { geometry, program: compositeProgram });
    const pCtx = particleCanvas.getContext("2d", { alpha: true });
    if (!pCtx) return;

    const pendingSplats: Array<{ x: number; y: number; fx: number; fy: number; strength: number }> = [];
    let particles: TextParticle[] = [];
    let lastPointer = { x: -1, y: -1 };
    let raf = 0;
    let running = true;
    let lastTime = performance.now();
    let idlePulseTimer = 0;
    let lastInteractionAt = performance.now();
    let idlePhase = Math.random() * Math.PI * 2;
    let textDx = 0;
    let textDy = 0;
    let textVx = 0;
    let textVy = 0;
    let paused = document.hidden;

    const onVisibility = () => {
      paused = document.hidden;
    };

    const clearRenderTarget = (target: RenderTarget, color: [number, number, number, number]) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.buffer);
      gl.clearColor(color[0], color[1], color[2], color[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const resize = () => {
      quality = chooseQualityPreset(window.innerWidth);

      const rootRect = root.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rootRect.width));
      const height = Math.max(1, Math.floor(rootRect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, quality.dprCap);

      renderer.dpr = dpr;
      renderer.setSize(width, height);

      glCanvas.style.width = `${width}px`;
      glCanvas.style.height = `${height}px`;

      particleCanvas.width = Math.max(1, Math.floor(width * dpr));
      particleCanvas.height = Math.max(1, Math.floor(height * dpr));
      particleCanvas.style.width = `${width}px`;
      particleCanvas.style.height = `${height}px`;
      pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const simWidth = Math.max(20, Math.floor(width * quality.simScale));
      const simHeight = Math.max(20, Math.floor(height * quality.simScale));

      velocity.read.setSize(simWidth, simHeight);
      velocity.write.setSize(simWidth, simHeight);
      dye.read.setSize(simWidth, simHeight);
      dye.write.setSize(simWidth, simHeight);

      clearRenderTarget(velocity.read, [0.5, 0.5, 0, 1]);
      clearRenderTarget(velocity.write, [0.5, 0.5, 0, 1]);
      clearRenderTarget(dye.read, [0, 0, 0, 1]);
      clearRenderTarget(dye.write, [0, 0, 0, 1]);

      field.resize(Math.floor(width * 0.1), Math.floor(height * 0.1));
      particles = createTextParticles({
        heading,
        rootRect,
        maxParticles: quality.maxParticles,
        dpr,
      });

      splatUniforms.radius.value = quality.splatRadius;
      compositeUniforms.alpha.value = quality.compositeAlpha;
    };

    const applySplat = (params: {
      x: number;
      y: number;
      fx: number;
      fy: number;
      strength: number;
      width: number;
      height: number;
    }) => {
      splatUniforms.aspect.value = params.width / Math.max(1, params.height);
      splatUniforms.point.value[0] = params.x;
      splatUniforms.point.value[1] = 1 - params.y;

      const boost = clamp(params.strength * 0.0023, 0.03, 0.24);
      splatUniforms.force.value[0] = clamp(params.fx * boost, -0.7, 0.7);
      splatUniforms.force.value[1] = clamp(-params.fy * boost, -0.7, 0.7);

      splatUniforms.mode.value = 0;
      splatUniforms.tTarget.value = velocity.read.texture;
      blit.program = splatProgram;
      renderer.render({ scene: blit, target: velocity.write });
      velocity.swap();

      splatUniforms.mode.value = 1;
      splatUniforms.tTarget.value = dye.read.texture;

      const baseTint = clamp(params.strength * 0.003, 0.04, 0.34);
      splatUniforms.color.value[0] = 0.06 + baseTint * 0.2;
      splatUniforms.color.value[1] = 0.15 + baseTint * 0.6;
      splatUniforms.color.value[2] = 0.18 + baseTint;

      renderer.render({ scene: blit, target: dye.write });
      dye.swap();
    };

    const stepFluid = (dt: number) => {
      advectUniforms.dt.value = dt;

      // Velocity advection
      advectUniforms.tSource.value = velocity.read.texture;
      advectUniforms.tVelocity.value = velocity.read.texture;
      advectUniforms.dissipation.value = quality.flowDissipation;
      advectUniforms.advection.value = 0.21;
      advectUniforms.isVelocity.value = 1;
      blit.program = advectProgram;
      renderer.render({ scene: blit, target: velocity.write });
      velocity.swap();

      // Dye advection
      advectUniforms.tSource.value = dye.read.texture;
      advectUniforms.tVelocity.value = velocity.read.texture;
      advectUniforms.dissipation.value = quality.dyeDissipation;
      advectUniforms.advection.value = 0.18;
      advectUniforms.isVelocity.value = 0;
      renderer.render({ scene: blit, target: dye.write });
      dye.swap();
    };

    const drawComposite = (elapsed: number) => {
      compositeUniforms.tVelocity.value = velocity.read.texture;
      compositeUniforms.tDye.value = dye.read.texture;
      compositeUniforms.time.value = elapsed;
      compositeUniforms.intensity.value = quality.name === "low" ? 0.016 : quality.name === "medium" ? 0.022 : 0.028;

      blit.program = compositeProgram;
      renderer.render({ scene: blit });
    };

    const updateText = (dt: number, width: number, height: number) => {
      const textRect = textRoot.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();

      const cx = textRect.left - rootRect.left + textRect.width * 0.42;
      const cy = textRect.top - rootRect.top + textRect.height * 0.4;

      const flow = field.sample(cx / Math.max(1, width), cy / Math.max(1, height));
      const targetDx = clamp(flow.x * 72, -22, 22);
      const targetDy = clamp(flow.y * 56, -16, 16);

      const spring = clamp(dt * 7.5, 0.06, 0.24);
      textVx += (targetDx - textDx) * spring;
      textVy += (targetDy - textDy) * spring;
      textVx *= 0.8;
      textVy *= 0.8;
      textDx = clamp(textDx + textVx, -24, 24);
      textDy = clamp(textDy + textVy, -18, 18);

      const skew = clamp(textDx * 0.32, -8.5, 8.5);
      textRoot.style.transform = `translate3d(${textDx.toFixed(2)}px, ${textDy.toFixed(2)}px, 0px) skewX(${skew.toFixed(2)}deg)`;

      const activity = clamp(Math.hypot(flow.x, flow.y) * 18, 0, 1);
      heading.style.opacity = `${clamp(1 - activity * 0.26, 0.74, 1).toFixed(3)}`;
      heading.style.filter = `drop-shadow(${(flow.x * 8.4).toFixed(2)}px ${(flow.y * 9.6).toFixed(2)}px ${(2.2 + activity * 10).toFixed(2)}px rgba(130, 231, 240, ${clamp(activity * 0.58, 0, 0.38).toFixed(3)}))`;
    };

    const drawParticles = (dt: number, width: number, height: number) => {
      pCtx.clearRect(0, 0, width, height);

      if (!quality.enableDissolve || particles.length === 0) return;

      pCtx.globalCompositeOperation = "source-over";

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i]!;
        const flow = field.sample(particle.x / Math.max(1, width), particle.y / Math.max(1, height));
        const speed = Math.hypot(flow.x, flow.y);

        const detachTarget = clamp((speed - 0.011) * 42, 0, 1);
        particle.detach += (detachTarget - particle.detach) * clamp(dt * 8.5, 0.04, 0.18);

        const advect = 1.25 + particle.detach * 2.4;
        const spring = 0.012 + (1 - particle.detach) * 0.11;

        particle.vx += flow.x * advect + (particle.homeX - particle.x) * spring;
        particle.vy += flow.y * advect + (particle.homeY - particle.y) * spring;

        const wobble = Math.sin(performance.now() * 0.0014 + particle.phase) * 0.08;
        particle.vx += wobble * dt;

        const damping = 0.78 + (1 - particle.detach) * 0.16;
        particle.vx *= damping;
        particle.vy *= damping;

        particle.x += particle.vx;
        particle.y += particle.vy;

        const alpha = clamp(0.06 + particle.detach * 0.66, 0.06, 0.74);
        const size = particle.size + particle.detach * 0.8;

        pCtx.fillStyle = `rgba(218, 248, 236, ${alpha.toFixed(3)})`;
        pCtx.fillRect(particle.x, particle.y, size, size);

        if (particle.detach > 0.35) {
          pCtx.strokeStyle = `rgba(197, 241, 233, ${(alpha * 0.45).toFixed(3)})`;
          pCtx.lineWidth = 0.9;
          pCtx.beginPath();
          pCtx.moveTo(particle.x, particle.y);
          pCtx.lineTo(particle.x - particle.vx * 1.8, particle.y - particle.vy * 1.8);
          pCtx.stroke();
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      if (lastPointer.x < 0) {
        lastPointer = { x, y };
        return;
      }

      const dx = x - lastPointer.x;
      const dy = y - lastPointer.y;
      const speed = Math.hypot(dx, dy);
      if (speed < 0.6) return;

      lastPointer = { x, y };
      lastInteractionAt = performance.now();

      const nx = x / Math.max(1, rect.width);
      const ny = y / Math.max(1, rect.height);

      field.inject(nx, ny, dx * 0.055, dy * 0.055, quality.splatRadius * 1.5);
      pendingSplats.push({
        x: nx,
        y: ny,
        fx: dx,
        fy: dy,
        strength: speed,
      });

      if (pendingSplats.length > 12) {
        pendingSplats.splice(0, pendingSplats.length - 12);
      }
    };

    const onPointerLeave = () => {
      lastPointer = { x: -1, y: -1 };
    };

    const loop = (time: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (paused) return;

      const dt = clamp((time - lastTime) / 1000, 1 / 120, 1 / 20);
      lastTime = time;

      const rect = root.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      // Keep a subtle baseline current so the hero feels alive on first paint.
      // This intentionally stays gentle and pauses during active interaction.
      idlePulseTimer += dt;
      if (time - lastInteractionAt > 1200 && idlePulseTimer > 0.95) {
        idlePulseTimer = 0;
        idlePhase += 0.38;
        const nx = clamp(0.32 + Math.sin(idlePhase) * 0.06, 0.2, 0.46);
        const ny = clamp(0.34 + Math.cos(idlePhase * 0.9) * 0.05, 0.22, 0.48);
        const fx = Math.cos(idlePhase * 1.4) * 12;
        const fy = Math.sin(idlePhase * 1.2) * 9.5;
        field.inject(nx, ny, fx * 0.03, fy * 0.03, quality.splatRadius * 1.25);
        pendingSplats.push({
          x: nx,
          y: ny,
          fx,
          fy,
          strength: 14,
        });
      }

      field.step(dt);
      stepFluid(dt);

      while (pendingSplats.length > 0) {
        const splat = pendingSplats.shift();
        if (!splat) continue;
        applySplat({ ...splat, width, height });
      }

      drawComposite(time * 0.001);
      updateText(dt, width, height);
      drawParticles(dt, width, height);
    };

    const image = new window.Image();
    image.decoding = "async";
    image.src = "/images/home-hero-2560.jpg";
    image.onload = () => {
      backgroundTexture.image = image;
      compositeUniforms.hasBackground.value = 1;
    };

    resize();
    raf = requestAnimationFrame(loop);

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });

    resizeObserver.observe(root);
    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      textRoot.style.transform = "";
      heading.style.opacity = "";
      heading.style.filter = "";
      pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas
        ref={glCanvasRef}
        className="hero-water-fx-v2-layer absolute inset-0 z-[1] h-full w-full"
      />
      <canvas
        ref={particleCanvasRef}
        className="hero-water-fx-v2-particles absolute inset-0 z-[9] h-full w-full"
      />
    </div>
  );
}
