export const earthVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPosition = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const earthFragmentShader = /* glsl */ `
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform vec3 uLightDir;
uniform vec3 uNightColor;
uniform vec3 uAtmosphereColor;
uniform float uNightMix;
uniform float uAmbient;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 day = texture2D(uDayMap, vUv).rgb;
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uLightDir);

  float ndl = dot(N, L);
  float light = smoothstep(-0.12, 0.35, ndl);

  // Dia com sombra suave
  vec3 color = day * (uAmbient + light * 1.35);

  // Faixa dourada no terminador (amanhecer / anoitecer)
  float dusk = smoothstep(0.30, 0.0, abs(ndl)) * 0.35;
  color += uAtmosphereColor * dusk;

  // Lado noturno: luzes reais das cidades (mapa noturno NASA)
  vec3 cityGlow = texture2D(uNightMap, vUv).rgb;
  color += cityGlow * uNightColor * (1.0 - light) * uNightMix;

  // Fresnel azul nas bordas do planeta
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
  color += uAtmosphereColor * fres * 0.5;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const cloudsVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const cloudsFragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uOffset;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uMap, vec2(vUv.x - uOffset, vUv.y));
  float alpha = tex.r * uOpacity;
  gl_FragColor = vec4(vec3(1.0), alpha);
}
`;

export const atmosphereVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const atmosphereFragmentShader = /* glsl */ `
uniform vec3 uGlowColor;
uniform float uIntensity;
uniform float uPower;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(-vPosition);
  float rim = 1.0 - abs(dot(normalize(vNormal), viewDir));
  float glow = pow(rim, uPower) * uIntensity;
  gl_FragColor = vec4(uGlowColor, glow);
}
`;
