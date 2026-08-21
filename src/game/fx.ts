import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CONFIG } from "./config";

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.28 },
    uHit: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uHit;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 p = vUv * 2.0 - 1.0;
      float v = dot(p, p);
      c.rgb *= 1.0 - uVignette * v;
      float rim = smoothstep(0.12, 1.15, v);
      c.rgb = mix(c.rgb, vec3(0.62, 0.04, 0.05), uHit * rim);
      c.rgb += vec3(0.28, 0.02, 0.02) * uHit * 0.45;
      gl_FragColor = c;
    }
  `,
};

export type PostStack = {
  composer: EffectComposer;
  setSize: (w: number, h: number) => void;
  setHit: (v: number) => void;
  setBloom: (strength: number) => void;
  render: () => void;
  dispose: () => void;
};

export function createPostStack(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostStack {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const ssao = new SSAOPass(scene, camera, 1, 1);
  ssao.kernelRadius = 8;
  ssao.minDistance = 0.001;
  ssao.maxDistance = 0.12;
  ssao.enabled = CONFIG.fx.ssao;
  composer.addPass(ssao);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    CONFIG.fx.bloom.strength,
    CONFIG.fx.bloom.radius,
    CONFIG.fx.bloom.threshold,
  );
  composer.addPass(bloom);

  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);
  composer.addPass(new OutputPass());

  return {
    composer,
    setSize(w, h) {
      composer.setSize(w, h);
      ssao.setSize(Math.max(1, (w * 0.5) | 0), Math.max(1, (h * 0.5) | 0));
      bloom.setSize(w, h);
    },
    setHit(v) {
      (vignette.uniforms as { uHit: { value: number } }).uHit.value = v;
    },
    setBloom(strength) {
      bloom.strength = strength;
    },
    render() {
      composer.render();
    },
    dispose() {
      composer.dispose();
    },
  };
}
