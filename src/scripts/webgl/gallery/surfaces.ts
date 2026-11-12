import * as THREE from 'three';

/** Fine vertical grain under opaque ivory paint, rather than exposed timber. */
export function createDoorPaintTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  const pixels=ctx.createImageData(512,512);
  let seed=193;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const fiber=Math.sin(x*.75+Math.sin(y*.018)*.8)*1.8+Math.sin(x*2.8+y*.008)*.7;
    const grain=fiber+(seed/4294967296-.5)*5;
    const i=(y*512+x)*4;
    pixels.data[i]=244+grain;pixels.data[i+1]=241+grain;pixels.data[i+2]=233+grain;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}

export function createPlasterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(256, 256);
  let seed = 71;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = (seed / 4294967296 - 0.5) * 23;
    pixels.data[i] = 238 + grain; pixels.data[i+1] = 233 + grain; pixels.data[i+2] = 222 + grain; pixels.data[i+3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/** Original abstract studies, labelled as prototypes in the HTML UI. */
export function createStudyTexture(index: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  const variant=index%3;
  const background=ctx.createLinearGradient(0,0,1024,800);
  background.addColorStop(0,'#f0f0e9');background.addColorStop(1,'#c8cdc9');
  ctx.fillStyle=background;ctx.fillRect(0,0,1024,800);
  ctx.save();ctx.translate(512,400);ctx.rotate(index>2?(index%2?-.14:.12):0);ctx.scale(index>2?.86:1,index>2?.86:1);ctx.translate(-512,-400);
  ctx.shadowColor='#18201b40';ctx.shadowBlur=30;ctx.shadowOffsetX=18;ctx.shadowOffsetY=23;
  if (variant === 0) {
    for (let i = 5; i >= 0; i--) {
      const shade=ctx.createLinearGradient(260,120,760,690);
      const tones=['#39413f','#69736c','#929c92','#c3c8bc','#d5d9cc','#9da79c'];
      shade.addColorStop(0,'#eceee2');shade.addColorStop(.37,tones[i]);shade.addColorStop(.76,'#525f57');shade.addColorStop(1,tones[i]);ctx.fillStyle=shade;
      ctx.beginPath(); ctx.ellipse(512, 395, 145+i*37, 185+i*29, -0.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#dde0d4'; ctx.fillRect(467, 330, 96, 270);
  } else if (variant === 1) {
    ctx.save(); ctx.translate(510,400); ctx.rotate(-0.1);
    const face=ctx.createLinearGradient(-220,-200,180,200);face.addColorStop(0,'#e6e8de');face.addColorStop(1,'#9aa597');ctx.fillStyle=face;ctx.fillRect(-240,-240,375,490);
    ctx.fillStyle='#4f5b54'; ctx.beginPath();ctx.moveTo(135,-240);ctx.lineTo(260,-130);ctx.lineTo(260,285);ctx.lineTo(135,250);ctx.fill();
    ctx.fillStyle='#d5dccc';ctx.beginPath();ctx.moveTo(-240,-240);ctx.lineTo(-80,-310);ctx.lineTo(260,-130);ctx.lineTo(135,-240);ctx.fill();ctx.restore();
  } else {
    ctx.lineWidth = 2.7;
    for (let i=0;i<27;i++) {
      ctx.strokeStyle = i%4===0?'#4f615c':'#88988d';
      ctx.beginPath();ctx.moveTo(90, 145+i*19);
      ctx.bezierCurveTo(350,30+i*23,615,780-i*17,940,145+i*19);ctx.stroke();
    }
    const sphere=ctx.createRadialGradient(660,240,4,680,260,69);sphere.addColorStop(0,'#e4e8dc');sphere.addColorStop(.7,'#9fae9d');sphere.addColorStop(1,'#52635a');ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(680,260,64,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Fine, fixed paper grain rather than animated noise.
  let seed = 8 + index;
  for (let i=0;i<17000;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%1024;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%800;
    ctx.fillStyle = i%2?'#ffffff0b':'#302b2509';ctx.fillRect(x,y,1,1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
