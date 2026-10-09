// WebGL2 post-process: takes the 2D scene canvas and applies the glitch/CRT stack.
// Every uniform is set from seek(t), so the output is a pure function of time.

const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uT, uSeed, uSlice, uBlock, uChroma, uZoomBlur, uNoise, uScan, uInvert, uBright, uCurve, uPoster, uFlash;
uniform vec2 uZoomC, uCollapse;

float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

vec3 samp(vec2 uv){
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) return vec3(0.);
  return texture(uTex, uv).rgb;
}

void main(){
  vec2 uv = vUv;

  // CRT collapse: squash the picture into a line, then a dot
  vec2 cuv = (uv-0.5)/max(uCollapse,vec2(1e-4))+0.5;
  float collapsing = step(uCollapse.y, 0.999);

  // barrel curvature
  vec2 cc = cuv-0.5;
  cuv = 0.5 + cc*(1.0 + uCurve*dot(cc,cc));

  // horizontal band slicing
  float bands = mix(6., 42., h1(uSeed+0.37));
  float band = floor(cuv.y*bands);
  if(h1(band*1.93+uSeed*7.1) < uSlice){
    cuv.x += (h1(band*7.31+uSeed*3.3)-0.5)*0.32*uSlice;
  }
  // thin tear lines
  float tear = step(0.985, h1(floor(cuv.y*uRes.y/3.)+uSeed*11.))*uSlice;
  cuv.x += tear*(h1(uSeed+cuv.y)-0.5)*0.08;

  // macroblock datamosh: blocks sample from elsewhere
  vec2 grid = floor(cuv*vec2(24.,13.5));
  if(h2(grid+uSeed*1.7) < uBlock*0.45){
    cuv += (vec2(h2(grid+3.1+uSeed), h2(grid+7.7+uSeed))-0.5)*vec2(0.22,0.12);
  }

  // RGB split + radial zoom blur toward uZoomC
  float ca = uChroma/uRes.x;
  vec3 col = vec3(0.);
  const int N = 14;
  float wsum = 0.;
  for(int i=0;i<N;i++){
    float k = float(i)/float(N-1);
    float s = 1.0 - uZoomBlur*k;
    vec2 p = uZoomC + (cuv-uZoomC)*s;
    vec2 dir = normalize(p-uZoomC+1e-5)*ca*(1.0+uZoomBlur*4.);
    vec2 off = vec2(ca,0.)*(1.-uZoomBlur) + dir*uZoomBlur;
    float w = 1.0 - k*0.6;
    col.r += samp(p+off).r*w;
    col.g += samp(p).g*w;
    col.b += samp(p-off).b*w;
    wsum += w;
    if(uZoomBlur<0.001) break;
  }
  col /= (uZoomBlur<0.001) ? 1.0 : wsum;

  // posterize (crushed digital look)
  if(uPoster>0.){ float lv = mix(64., 4., uPoster); col = floor(col*lv)/lv; }

  // static
  float n = h2(floor(vUv*uRes*0.5)+fract(uT*7.13)*91.7);
  col = mix(col, vec3(n), uNoise);

  // scanlines + slow rolling bar
  float line = 0.5+0.5*sin(vUv.y*uRes.y*3.14159);
  col *= 1.0 - uScan*0.35*line;
  col *= 1.0 - uScan*0.06*smoothstep(0.,1.,sin((vUv.y - uT*0.35)*6.2831)*0.5+0.5);

  // vignette
  vec2 vv = vUv-0.5;
  col *= 1.0 - dot(vv,vv)*0.55*uScan;

  col = mix(col, 1.0-col, uInvert);
  col = mix(col, vec3(1.), uFlash);
  col *= uBright;

  // outside the collapsed raster: black, plus the bright CRT line/dot
  vec2 a = abs(vUv-0.5);
  if(collapsing>0.5){
    vec2 ext = 0.5*uCollapse;
    float inside = step(a.x, ext.x)*step(a.y, ext.y);
    float glow = exp(-pow(a.y/max(ext.y,0.0015),2.)*0.7)*exp(-pow(a.x/max(ext.x,0.002),8.));
    col = col*inside + vec3(0.92,0.96,1.)*glow*(1.0-inside)*uBright;
  }
  o = vec4(clamp(col,0.,1.),1.);
}`;

export function createGlitch(canvas) {
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const U = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(prog, i); U[u.name] = gl.getUniformLocation(prog, u.name); }

  return function render(source, fx) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(U.uTex, 0);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    const f = (k, d) => (fx[k] ?? d);
    gl.uniform1f(U.uT, f('t', 0));
    gl.uniform1f(U.uSeed, f('seed', 0));
    gl.uniform1f(U.uSlice, f('slice', 0));
    gl.uniform1f(U.uBlock, f('block', 0));
    gl.uniform1f(U.uChroma, f('chroma', 0));
    gl.uniform1f(U.uZoomBlur, f('zoomBlur', 0));
    gl.uniform2f(U.uZoomC, f('zoomCx', 0.5), f('zoomCy', 0.5));
    gl.uniform1f(U.uNoise, f('noise', 0));
    gl.uniform1f(U.uScan, f('scan', 1));
    gl.uniform1f(U.uInvert, f('invert', 0));
    gl.uniform1f(U.uBright, f('bright', 1));
    gl.uniform1f(U.uCurve, f('curve', 0.06));
    gl.uniform1f(U.uPoster, f('poster', 0));
    gl.uniform1f(U.uFlash, f('flash', 0));
    gl.uniform2f(U.uCollapse, f('collapseX', 1), f('collapseY', 1));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}
