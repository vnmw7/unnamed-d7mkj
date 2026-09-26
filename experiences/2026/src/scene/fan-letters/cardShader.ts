import { ShaderMaterial, type Texture } from 'three'

export const cardVertexShader = /* glsl */ `
attribute vec4 aUvRect;
attribute float aOpacity;

varying vec2 vAtlasUv;
varying float vOpacity;

void main() {
  vAtlasUv = aUvRect.xy + uv * aUvRect.zw;
  vOpacity = aOpacity;

  #ifdef USE_INSTANCING
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #endif
}
`

export const cardFragmentShader = /* glsl */ `
uniform sampler2D uAtlas;

varying vec2 vAtlasUv;
varying float vOpacity;

void main() {
  vec4 texel = texture2D(uAtlas, vAtlasUv);
  gl_FragColor = vec4(texel.rgb, texel.a * vOpacity);

  #include <colorspace_fragment>
}
`

export function createCardMaterial(
  texture: Texture,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uAtlas: { value: texture },
    },
    vertexShader: cardVertexShader,
    fragmentShader: cardFragmentShader,
    transparent: true,
    depthWrite: false,
  })
}
