export type KnowledgePoint = [number, number, number];

function grid(i: number, count: number, columns: number): [number, number] {
  return [(i % columns) / (columns - 1), Math.floor(i / columns) / Math.max(1, Math.ceil(count / columns) - 1)];
}

/** Three authored point models. Stable indices preserve each dot during a morph. */
export function getKnowledgePoint(shape: number, i: number, count: number): KnowledgePoint {
  if (shape === 0) {
    const screen = Math.floor(count * .72);
    if (i < screen) { const [u,v] = grid(i,screen,46); return [(u-.5)*1.48,(v-.5)*.94-.17,-.12-v*.09]; }
    const [u,v] = grid(i-screen,count-screen,46);
    return [(u-.5)*(1.48+v*.25),.31+v*.25,-.21+v*.82];
  }
  if (shape === 1) {
    const [u,v] = grid(i,count,32), corner = Math.max(0,Math.abs(v-.5)-.42)/.08;
    return [(u-.5)*(.76-corner*corner*.12),(v-.5)*1.55,u<.07||u>.93?.075:-.035];
  }
  const rack=i%3,n=Math.floor(i/3),size=Math.ceil((count-rack)/3);
  const front=Math.floor(size*.68),side=Math.floor(size*.18);
  const width=[.34,.41,.34][rack],height=[.82,1.28,1][rack];
  const cx=(rack-1)*.53,cy=[.09,-.08,.07][rack],cz=[.06,-.14,.12][rack];
  if(n<front){const [u,v]=grid(n,front,16);return [cx+(u-.5)*width,cy+(v-.5)*height,cz+.16];}
  if(n<front+side){const [u,v]=grid(n-front,side,7);return [cx+width/2,cy+(v-.5)*height,cz+.16-u*.29];}
  const [u,v]=grid(n-front-side,size-front-side,12);
  return [cx+(u-.5)*width,cy-height/2,cz-.13+v*.29];
}

export function getKnowledgeColor(shape: number,i: number,count: number): string {
  if(shape===0){
    const screen=Math.floor(count*.72);
    if(i>=screen)return i%7<2?'#a0c4dc':'#628da9';
    const [u,v]=grid(i,screen,46);
    if(u<.04||u>.96||v<.05||v>.95)return '#e0f1fc';
    if(v<.16)return '#9dcfe5';
    if(u<.2)return '#587f9c';
    if(v>.29&&v<.49)return u<.5?'#77c4dd':'#b5d4e4';
    if(v>.58&&v<.87&&u>.3&&u<.9)return v>.85-Math.floor(u*8)%3*.08?'#b5e7f2':'#4f7793';
    return '#365c79';
  }
  if(shape===1){
    const [u,v]=grid(i,count,32);
    if(u<.07||u>.93||v<.04||v>.96)return '#d9ecf9';
    if(v<.1&&u>.3&&u<.7)return '#365570';
    if(v>.22&&v<.43)return '#79c1db';
    if(v>.5&&v<.83)return Math.floor(v*30)%3?'#aac9df':'#527d9b';
    if(v>.87&&v<.92)return '#9bd9eb';
    return '#567e9b';
  }
  const rack=i%3,n=Math.floor(i/3),size=Math.ceil((count-rack)/3),front=Math.floor(size*.68);
  if(n>=front)return n%3===0?'#d9ebf8':'#6e95b0';
  const [u,v]=grid(n,front,16);
  if(u<.08||u>.92||v<.04||v>.96)return '#c5dfed';
  if(Math.floor(v*16)%4===1)return u<.2?'#a5e7ed':'#6594b2';
  return '#426c8a';
}
