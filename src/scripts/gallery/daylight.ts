export const GALLERY_DAY_SECONDS = 240;

// Enter at the same quiet sunset as the door, then continue through one solar day.
const moments = [0,40,75,105,150,210,240];
const hours = [16.5,18.5,29.6,32.5,35.5,39,40.5];
const slopes = moments.slice(1).map((time,i)=>(hours[i+1]-hours[i])/(time-moments[i]));
const tangents = moments.map((_,i)=>{
  const before=(i+slopes.length-1)%slopes.length,after=i%slopes.length;
  const previousWidth=moments[before+1]-moments[before],nextWidth=moments[after+1]-moments[after];
  const a=2*nextWidth+previousWidth,b=nextWidth+2*previousWidth;
  return (a+b)/(a/slopes[before]+b/slopes[after]);
});
const clamp=(value:number)=>Math.min(1,Math.max(0,value));
function smooth(from:number,to:number,value:number){const t=clamp((value-from)/(to-from));return t*t*(3-2*t);}

/** A continuous solar arc for a south-facing, late-season exhibition room. */
export function getGalleryDaylight(seconds:number) {
  const phase=((Number.isFinite(seconds)?seconds:0)%GALLERY_DAY_SECONDS+GALLERY_DAY_SECONDS)%GALLERY_DAY_SECONDS;
  let index=moments.length-2;
  for(let i=0;i<moments.length-1;i++)if(phase<moments[i+1]){index=i;break;}
  const width=moments[index+1]-moments[index],t=(phase-moments[index])/width;
  const hour=(2*t**3-3*t*t+1)*hours[index]+(t**3-2*t*t+t)*width*tangents[index]
    +(-2*t**3+3*t*t)*hours[index+1]+(t**3-t*t)*width*tangents[index+1];
  const latitude=48*Math.PI/180,declination=-8*Math.PI/180,angle=(hour-12)*Math.PI/12;
  const x=Math.sin(latitude)*Math.cos(declination)*Math.cos(angle)-Math.cos(latitude)*Math.sin(declination);
  const y=Math.sin(latitude)*Math.sin(declination)+Math.cos(latitude)*Math.cos(declination)*Math.cos(angle);
  const z=Math.cos(declination)*Math.sin(angle);
  const daylight=smooth(-.12,.22,y);
  const direct=smooth(0,.09,y);
  const warmth=1-smooth(.07,.48,y);
  const lamps=1-smooth(-.075,.15,y);
  const pastel=smooth(-.19,-.035,y)*(1-smooth(.12,.42,y));
  return {phase,hour,sunDirection:[x,y,z] as const,daylight,direct,warmth,lamps,pastel,
    sunIntensity:3.6*direct*Math.pow(Math.max(0,y)/.56,.3),
    twilight:smooth(-.19,-.035,y)*(1-smooth(.04,.18,y)),
  };
}

/** Advance only while this room is visible and motion is permitted. */
export function createGalleryDayClock(){
  let elapsed=0;
  return {advance(delta:number,playing:boolean){
    if(playing&&Number.isFinite(delta)&&delta>0)elapsed+=delta;
    return elapsed;
  }};
}
