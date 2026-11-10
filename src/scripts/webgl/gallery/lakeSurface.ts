import type { ShaderMaterial } from 'three';

// Height and its exact X/Z derivatives. Opposing waves form several overlapping
// standing modes: the water rises and settles without a prevailing current.
const lakeSurfaceGLSL=`
  vec3 lakeSurface(vec2 p) {
    vec2 a=vec2(1.34,.62),b=vec2(-.93,1.72),c=vec2(.48,2.35),d=vec2(2.8,-1.1);
    vec4 phase=vec4(dot(p,a)+.4,dot(p,b)+1.8,dot(p,c)+3.1,dot(p,d)+.9);
    vec4 amplitude=vec4(.026,.021,.014,.006)*sin(time*vec4(1.55,1.91,2.23,2.64)+vec4(0.,1.7,3.2,.6));
    vec4 heights=sin(phase)*amplitude;
    vec4 slopes=cos(phase)*amplitude;
    return vec3(dot(heights,vec4(1.)),a*slopes.x+b*slopes.y+c*slopes.z+d*slopes.w);
  }
`;

export function applyLakeSurface(material:ShaderMaterial) {
  material.vertexShader=material.vertexShader
    .replace('uniform float time;',`uniform float time;\n${lakeSurfaceGLSL}`)
    .replace('void main() {',`void main() {
      vec3 surfacePosition=position;
      vec2 restXZ=(modelMatrix*vec4(position,1.)).xz;
      surfacePosition.z+=lakeSurface(restXZ).x;
    `)
    .replaceAll('vec4( position, 1.0 )','vec4( surfacePosition, 1.0 )');

  material.fragmentShader=material.fragmentShader
    .replace('uniform float time;',`uniform float time;\n${lakeSurfaceGLSL}`)
    .replace(/vec4 getNoise\( vec2 uv \) \{[\s\S]*?\n\s*\}/,`vec4 getNoise(vec2 uv) {
      // Paired, bounded oscillations stir the fine ripples in opposing directions.
      // They return around their origin instead of drifting across the lake.
      vec2 stir=vec2(sin(time*.63),cos(time*.51))*.018;
      vec2 gust=vec2(cos(time*.47+1.2),sin(time*.71))*.003;
      vec4 fine=texture2D(normalSampler,uv/103.+stir)+texture2D(normalSampler,uv/107.-stir);
      vec4 broad=texture2D(normalSampler,uv/vec2(8907.,9803.)+gust)+texture2D(normalSampler,uv/vec2(1091.,1027.)-gust);
      return (fine+broad)*.5-1.;
    }`)
    .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`
      vec3 lake=lakeSurface(worldPosition.xz);
      float breeze=.75+.25*sin(time*1.3+noise.z*2.);
      vec3 surfaceNormal=normalize(vec3(-lake.y,1.,-lake.z)+vec3(noise.x,0.,noise.y)*.25*breeze);
    `);
}
