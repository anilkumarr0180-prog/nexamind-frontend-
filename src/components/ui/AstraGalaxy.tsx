import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface NexusRibbonProps {
  /**
   * Mode:
   * - 'auto': ribbon when idle/empty, smoothly disperses/fades when messages present
   * - 'spiral' | 'ribbon': keeps the iconic Quantum Nexus Ribbon form
   * - 'dispersed': expanded deep-space starfield
   */
  mode?: "auto" | "spiral" | "dispersed" | "ribbon";
  /**
   * Whether the AI agent is currently reasoning / streaming tokens
   */
  isStreaming?: boolean;
  /**
   * Whether the conversation has messages (used when mode === 'auto')
   */
  hasMessages?: boolean;
  /**
   * Overall opacity of the canvas (0 to 1)
   */
  opacity?: number;
  /**
   * Enables interactive 3D parallax on mouse move
   */
  interactive?: boolean;
  /**
   * Optional custom CSS class name for the wrapper
   */
  className?: string;
  /**
   * Particle density preset
   */
  particleDensity?: "normal" | "high" | "cinematic";
}

/**
 * NexusRibbon (Quantum Nexus Flow & Cognitive Synapse)
 *
 * Proprietary signature visual identity for NexaMind:
 * - Continuous 3D topological Möbius Ribbon with streaming liquid-light particles
 * - Central Luminous Cognitive Synapse Spark (The "Mind" core from the Nexa logo)
 * - NexaMind chromatic gradient: Electric Cyan -> Radiant Violet -> Royal Indigo -> Amber Spark
 * - GPU-driven streaming flow and 3D pointer parallax
 */
export const NexusRibbon: React.FC<NexusRibbonProps> = ({
  mode = "auto",
  isStreaming = false,
  hasMessages = false,
  opacity = 0.92,
  interactive = true,
  className = "",
  particleDensity = "high",
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    targetMorph: 0.0,
    currentMorph: 0.0,
    targetSpeed: 0.16,
    currentSpeed: 0.16,
    targetIntensity: 1.0,
    currentIntensity: 1.0,
    mouseTarget: { x: 0, y: 0 },
    mouseCurrent: { x: 0, y: 0 },
  });

  useEffect(() => {
    let morph = 0.0;
    if (mode === "spiral" || mode === "ribbon") {
      morph = 0.0;
    } else if (mode === "dispersed") {
      morph = 1.0;
    } else {
      morph = hasMessages ? 1.0 : 0.0;
    }

    stateRef.current.targetMorph = morph;
    stateRef.current.targetSpeed = isStreaming ? 0.38 : 0.16;
    stateRef.current.targetIntensity = isStreaming ? 1.5 : 1.0;
  }, [mode, hasMessages, isStreaming]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let particleCount = 22000;
    if (particleDensity === "normal") particleCount = 14000;
    if (particleDensity === "cinematic") particleCount = 32000;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("WebGL not supported for NexusRibbon:", err);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      46,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0, 5.2);
    camera.lookAt(0, 0, 0);

    // ── Coordinate Arrays ──
    const positions = new Float32Array(particleCount * 3);
    const dispersedPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const ribbonData = new Float32Array(particleCount * 3); // [u0, lateralOffset, speedRate]
    const twinkles = new Float32Array(particleCount * 2);

    // NexaMind Brand Palette
    const cCyan = new THREE.Color("#38bdf8"); // Electric Cyan
    const cBlue = new THREE.Color("#60a5fa"); // Quantum Blue
    const cViolet = new THREE.Color("#a855f7"); // Radiant Violet
    const cIndigo = new THREE.Color("#4f46e5"); // Royal Indigo
    const cAmber = new THREE.Color("#f59e0b"); // Cognitive Synapse Spark
    const cGold = new THREE.Color("#fbbf24"); // Amber Gold
    const cWhite = new THREE.Color("#ffffff"); // Luminous Highlight

    // Particle distribution:
    // ~75% streaming on the 3D Nexus Ribbon
    // ~12% concentrated in the central Cognitive Synapse Spark
    // ~13% ambient floating quantum stardust
    const numRibbon = Math.floor(particleCount * 0.75);
    const numSynapse = Math.floor(particleCount * 0.12);

    // Parametric scale for the 3D Nexus Ribbon
    const scaleX = 2.45;
    const scaleY = 1.35;
    const scaleZ = 1.05;
    const ribbonWidth = 0.32;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      let x = 0;
      let y = 0;
      let z = 0;
      let pColor = new THREE.Color();
      let pSize = 1.0;
      let u0 = 0.0;
      let lateral = 0.0;
      let speedRate = 1.0;

      if (i < numRibbon) {
        // ── 1. The 3D Quantum Nexus Ribbon (Möbius Flow) ──
        u0 = Math.random(); // Longitudinal position along ribbon loop [0, 1]
        const angle = u0 * Math.PI * 2;

        // Base 3D figure-8 Lemniscate curve (echoes the "N" and infinity flow)
        const spineX = Math.sin(angle) * scaleX;
        const spineY = Math.sin(angle * 2.0) * 0.5 * scaleY;
        const spineZ = Math.cos(angle) * scaleZ;

        // Tangent vector
        const tx = Math.cos(angle) * scaleX;
        const ty = Math.cos(angle * 2.0) * scaleY;
        const tz = -Math.sin(angle) * scaleZ;
        const tLen = Math.hypot(tx, ty, tz) || 1.0;

        // Normal approximation
        const nx = -spineZ / scaleZ;
        const ny = 0.0;
        const nz = spineX / scaleX;
        const nLen = Math.hypot(nx, ny, nz) || 1.0;

        // Binormal vector (tangent x normal)
        const bx = (ty * (nz / nLen) - tz * (ny / nLen)) / tLen;
        const by = (tz * (nx / nLen) - tx * (nz / nLen)) / tLen;
        const bz = (tx * (ny / nLen) - ty * (nx / nLen)) / tLen;

        // Möbius half-twist angle along the loop
        const twistAngle = angle * 0.5;
        const cosTwist = Math.cos(twistAngle);
        const sinTwist = Math.sin(twistAngle);

        // Gaussian lateral spread across ribbon width
        const lateralSpread = (Math.random() + Math.random() - 1.0) * ribbonWidth;
        lateral = lateralSpread;
        speedRate = 0.85 + Math.random() * 0.3;

        // Final ribbon particle position
        x = spineX + (nx * cosTwist + bx * sinTwist) * lateralSpread;
        y = spineY + (ny * cosTwist + by * sinTwist) * lateralSpread;
        z = spineZ + (nz * cosTwist + bz * sinTwist) * lateralSpread;

        // Chromatic flow along the ribbon (Cyan -> Blue -> Violet -> Indigo -> Cyan)
        if (u0 < 0.25) {
          pColor.lerpColors(cCyan, cBlue, u0 / 0.25);
        } else if (u0 < 0.55) {
          pColor.lerpColors(cBlue, cViolet, (u0 - 0.25) / 0.3);
        } else if (u0 < 0.82) {
          pColor.lerpColors(cViolet, cIndigo, (u0 - 0.55) / 0.27);
        } else {
          pColor.lerpColors(cIndigo, cCyan, (u0 - 0.82) / 0.18);
        }

        // ~12% are amber/gold starlight surges streaming through
        if (Math.random() < 0.12) {
          pColor.lerpColors(cAmber, cGold, Math.random());
          pSize = 1.8 + Math.random() * 1.6;
        } else {
          pSize = Math.random() < 0.8 ? 0.9 + Math.random() * 0.8 : 1.8 + Math.random() * 1.2;
        }
      } else if (i < numRibbon + numSynapse) {
        // ── 2. The Cognitive Synapse Spark (Central "Mind" Core) ──
        const r = Math.pow(Math.random(), 2.2) * 0.48;
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi) * 0.75;

        u0 = 0.0;
        lateral = 0.0;
        speedRate = 0.0;

        // Radiant amber-gold nucleus with white-hot center
        const rNorm = r / 0.48;
        if (rNorm < 0.28) {
          pColor.copy(cWhite);
        } else if (rNorm < 0.65) {
          pColor.lerpColors(cGold, cAmber, (rNorm - 0.28) / 0.37);
        } else {
          pColor.lerpColors(cAmber, cViolet, (rNorm - 0.65) / 0.35);
        }

        pSize = Math.random() < 0.2 ? 2.4 + Math.random() * 1.6 : 1.1 + Math.random() * 1.0;
      } else {
        // ── 3. Ambient Floating Quantum Stardust ──
        const ambR = 0.8 + Math.pow(Math.random(), 0.85) * 4.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        x = ambR * Math.sin(phi) * Math.cos(theta);
        y = ambR * Math.sin(phi) * Math.sin(theta) * 0.8;
        z = ambR * Math.cos(phi) * 0.9;

        u0 = Math.random();
        lateral = 0.0;
        speedRate = 0.05;

        if (Math.random() < 0.25) {
          pColor.copy(cAmber);
        } else {
          pColor.lerpColors(cCyan, cViolet, Math.random());
        }
        pColor.multiplyScalar(0.65);
        pSize = 0.6 + Math.random() * 0.7;
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Dispersed Coordinates (for smooth state morphing)
      const dispR = 1.2 + Math.pow(Math.random(), 0.8) * 5.2;
      const dPhi = Math.acos(2 * Math.random() - 1);
      const dTheta = Math.random() * Math.PI * 2;
      dispersedPositions[i3] = dispR * Math.sin(dPhi) * Math.cos(dTheta);
      dispersedPositions[i3 + 1] = dispR * Math.sin(dPhi) * Math.sin(dTheta);
      dispersedPositions[i3 + 2] = dispR * Math.cos(dPhi) - 0.4;

      colors[i3] = pColor.r;
      colors[i3 + 1] = pColor.g;
      colors[i3 + 2] = pColor.b;

      sizes[i] = pSize;
      ribbonData[i3] = u0;
      ribbonData[i3 + 1] = lateral;
      ribbonData[i3 + 2] = speedRate;

      twinkles[i * 2] = Math.random() * Math.PI * 2;
      twinkles[i * 2 + 1] = 0.6 + Math.random() * 2.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aDispersedPos", new THREE.BufferAttribute(dispersedPositions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aRibbonData", new THREE.BufferAttribute(ribbonData, 3));
    geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinkles, 2));

    // ── Custom GLSL Photonic Flow Shader ──
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uIntensity: { value: 1.0 },
        uPixelRatio: { value: dpr },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uMorph;
        uniform float uIntensity;
        uniform float uPixelRatio;
        uniform vec2 uMouse;

        attribute vec3 aDispersedPos;
        attribute float aSize;
        attribute vec3 aRibbonData; // [u0, lateralOffset, speedRate]
        attribute vec2 aTwinkle;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;

          // 1. Dynamic Liquid-Light Flow on Ribbon
          vec3 currentPos = position;
          float isRibbon = step(0.1, aRibbonData.z);

          if (isRibbon > 0.5) {
            // Stream particles along the continuous Möbius curve
            float flowU = fract(aRibbonData.x + uTime * 0.08 * aRibbonData.z);
            float angle = flowU * 6.2831853;

            // Parametric Lemniscate formula
            float sx = sin(angle) * 2.45;
            float sy = sin(angle * 2.0) * 0.67;
            float sz = cos(angle) * 1.05;

            // Lateral offset with continuous Möbius twist
            float twist = angle * 0.5;
            vec3 offsetVec = vec3(cos(twist) * aRibbonData.y, sin(twist) * aRibbonData.y * 0.7, sin(twist) * aRibbonData.y);
            currentPos = vec3(sx, sy, sz) + offsetVec;
          }

          // 2. State Morphing (Ribbon <-> Dispersed Starfield)
          vec3 mixedPos = mix(currentPos, aDispersedPos, uMorph);

          // 3. 3D Perspective Tilt & Fluid Pointer Parallax
          float dist = length(mixedPos.xy);
          mixedPos.x += uMouse.x * 0.28 * (1.0 + dist * 0.08);
          mixedPos.y += uMouse.y * 0.24 * (1.0 + dist * 0.08);
          mixedPos.z += (uMouse.x * mixedPos.y - uMouse.y * mixedPos.x) * 0.12;

          vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // 4. Starlight Twinkle & Perspective Scale
          float twinkle = sin(uTime * aTwinkle.y + aTwinkle.x) * 0.22 + 0.78;
          gl_PointSize = (aSize * twinkle * uPixelRatio * (34.0 / -mvPosition.z)) * uIntensity;
          gl_PointSize = clamp(gl_PointSize, 1.0, 18.0);

          vAlpha = clamp(1.2 - (length(mvPosition.xyz) / 14.0), 0.2, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          // Crisp, luminous photonic disc optics
          float core = exp(-dist * 13.0) * 1.25;
          float halo = exp(-dist * 5.2) * 0.6;

          vec3 finalColor = vColor * halo * uIntensity + vec3(core * 1.15);
          float finalAlpha = (core * 0.95 + halo * 0.65) * vAlpha;

          gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
        }
      `,
    });

    const ribbon = new THREE.Points(geometry, material);
    // Subtle 10-degree tilt for sculptural 3D presence
    ribbon.rotation.x = -0.16;
    ribbon.rotation.y = 0.18;
    scene.add(ribbon);

    // ── Pointer / Mouse Parallax ──
    const handlePointerMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      stateRef.current.mouseTarget.x = x * 0.5;
      stateRef.current.mouseTarget.y = y * 0.5;
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });

    // ── Resize Observer ──
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // ── Visibility & Animation Loop ──
    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && !document.hidden;
    });
    visibilityObserver.observe(container);

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const state = stateRef.current;

      state.currentMorph += (state.targetMorph - state.currentMorph) * (delta * 3.5);
      state.currentSpeed += (state.targetSpeed - state.currentSpeed) * (delta * 4.0);
      state.currentIntensity += (state.targetIntensity - state.currentIntensity) * (delta * 4.0);

      state.mouseCurrent.x += (state.mouseTarget.x - state.mouseCurrent.x) * (delta * 2.8);
      state.mouseCurrent.y += (state.mouseTarget.y - state.mouseCurrent.y) * (delta * 2.8);

      material.uniforms.uTime.value += delta * state.currentSpeed;
      material.uniforms.uMorph.value = state.currentMorph;
      material.uniforms.uIntensity.value = state.currentIntensity;
      material.uniforms.uMouse.value.set(state.mouseCurrent.x, state.mouseCurrent.y);

      // Gentle floating breathing oscillation
      ribbon.position.y = Math.sin(material.uniforms.uTime.value * 0.45) * 0.04;
      ribbon.rotation.z = Math.sin(material.uniforms.uTime.value * 0.25) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [particleDensity, interactive]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ opacity }}
      className={`pointer-events-none select-none overflow-hidden transition-opacity duration-700 ${className}`}
    />
  );
};

// Also export as AstraGalaxy so all existing references and imports continue to work seamlessly
export const AstraGalaxy = NexusRibbon;
export type AstraGalaxyProps = NexusRibbonProps;
