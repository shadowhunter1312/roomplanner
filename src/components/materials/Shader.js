import { ShaderMaterial, Color, RepeatWrapping } from 'three';

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D colorMap;
  uniform float groutWidth;
  uniform vec3 groutColor;
  uniform vec2 repeat;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * repeat;
    vec2 grout = step(vec2(groutWidth), fract(uv));
    float groutMask = max(grout.x, grout.y);

    vec3 color = texture2D(colorMap, vUv).rgb;
    vec3 finalColor = mix(groutColor, color, groutMask);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class TiledShaderMaterial extends ShaderMaterial {
  constructor(colorTexture, groutColor, groutWidth, repeat) {
    super({
      uniforms: {
        colorMap: { value: colorTexture },
        groutWidth: { value: groutWidth },
        groutColor: { value: new Color(groutColor) },
        repeat: { value: repeat }
      },
      vertexShader,
      fragmentShader,
      transparent: false
    });

    colorTexture.wrapS = RepeatWrapping;
    colorTexture.wrapT = RepeatWrapping;
  }
}
