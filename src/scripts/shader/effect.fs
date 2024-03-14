#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uSource;
uniform vec2 uResolution;
uniform sampler2D uMap;
uniform vec2 uMapPx;

#define sat(v) clamp(v, 0.0, 1.0)

vec3 hash(vec3 v) {
  uvec3 x = floatBitsToUint(v + vec3(0.1, 0.2, 0.3));
  x = (x >> 8 ^ x.yzx) * 0x456789ABu;
  x = (x >> 8 ^ x.yzx) * 0x6789AB45u;
  x = (x >> 8 ^ x.yzx) * 0x89AB4567u;
  return vec3(x) / vec3(-1u);
}

void main() {
  vec2 uv = vUv;
  vec2 asp = uResolution / min(uResolution.x, uResolution.y);

  vec2 quv = uv * asp, fuv, iuv;
  float i, avg = 1.0;
  for(; i < 6.0; i++) {
    fuv = fract(quv);
    iuv = floor(quv) / pow(2.0, i) / asp;
    if (2.0 <= i) {
      // 代表点(4点)の輝度の分散を求める
      vec2 px = 1.0 / pow(2.0, i) / asp;
      px *= 0.5;
      vec3 c1 = texture(uSource, iuv + px * vec2(0, 0) + px * 0.5).rgb;
      vec3 c2 = texture(uSource, iuv + px * vec2(1, 0) + px * 0.5).rgb;
      vec3 c3 = texture(uSource, iuv + px * vec2(0, 1) + px * 0.5).rgb;
      vec3 c4 = texture(uSource, iuv + px * vec2(1, 1) + px * 0.5).rgb;

      vec4 g = vec4(
        dot(c1, vec3(0.299, 0.587, 0.114)),
        dot(c2, vec3(0.299, 0.587, 0.114)),
        dot(c3, vec3(0.299, 0.587, 0.114)),
        dot(c4, vec3(0.299, 0.587, 0.114))
      );

      avg = dot(vec4(1), g) / 4.0;
      vec4 d = g - avg;

      // 分散
      float disp = dot(vec4(1), d * d) / 4.0;

      if (disp < 0.001) break;
    }
    quv *= 2.0;
  }

  vec3 h = hash(vec3(iuv, i + 0.1));

  vec2 mapOffset;
  mapOffset.x = floor(avg / uMapPx.x) * uMapPx.x - uMapPx.x;
  mapOffset.y = floor(h.x / uMapPx.y) * uMapPx.y;

  // flip
  vec2 ruv = fuv;
  if (h.y < 0.3) ruv.x = 1.0 - ruv.x;
  if (h.y < 0.6) ruv.y = 1.0 - ruv.y;
  
  vec3 pattern = texture(uMap,  mapOffset + ruv * uMapPx).rgb;
  if(avg == 1.0) pattern = mix(pattern, vec3(1), 0.6);
  else pattern = mix(pattern, vec3(1), 0.15);

  // border line
  vec2 auv = abs(fuv * 2.0 - 1.0);
  float t = 0.995 - pow(i / 3.0, 2.0) * 0.02;
  float b = 1.0 - step(auv.x, t) * step(auv.y, t);

  outColor = vec4(sat(pattern + b), 1.0);
  // outColor = texture(uSource, uv);
}