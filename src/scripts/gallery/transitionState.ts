export const GALLERY_HANDOFF_KEY='portfolio-gallery-handoff';
export const GALLERY_HANDOFF_TTL=12000;
export type GalleryTransitionMode='enter'|'return';
export interface GalleryHandoff {mode:GalleryTransitionMode;path:string;time:number;focus:boolean;}
const pathKey=(path:string)=>path.replace(/\/+$/,'')||'/';

export function parseGalleryHandoff(raw:string|null,path:string,now=Date.now()):GalleryHandoff|null {
  if(!raw)return null;
  try {
    const value=JSON.parse(raw) as Partial<GalleryHandoff>;
    if((value.mode!=='enter'&&value.mode!=='return')||typeof value.path!=='string'||typeof value.time!=='number')return null;
    if(!Number.isFinite(value.time)||now-value.time<0||now-value.time>GALLERY_HANDOFF_TTL)return null;
    if(pathKey(value.path)!==pathKey(path))return null;
    return {mode:value.mode,path:value.path,time:value.time,focus:value.focus===true};
  }catch{return null;}
}

/** Custom animation is restricted to these two same-origin documents. */
export function galleryTransitionDestination(href:string,current:string,base:string,mode:GalleryTransitionMode):URL|null {
  try {
    const url=new URL(href,current),home=new URL(base,new URL(current).origin);
    const gallery=new URL('experiencias/',home);
    if(url.origin!==home.origin||url.search)return null;
    if(mode==='enter'&&(pathKey(url.pathname)!==pathKey(gallery.pathname)||url.hash))return null;
    if(mode==='return'&&(pathKey(url.pathname)!==pathKey(home.pathname)||url.hash!=='#web-experiences'))return null;
    return url;
  }catch{return null;}
}
