export const GALLERY_AMBIENCE_FILE='assets/audio/lachm-sound-ambience-sonido-ambiente-23-14211.mp3';
export const GALLERY_AMBIENCE_GAIN=.12;
interface AmbienceEnvironment {createContext?:()=>AudioContext;createMedia?:()=>HTMLAudioElement;}

/** The selected local recording streams only after explicit sound activation. */
export function createGalleryAmbience(baseUrl='/',environment:AmbienceEnvironment={}) {
  let context:AudioContext|undefined,master:GainNode|undefined,source:MediaElementAudioSourceNode|undefined;
  let media:HTMLAudioElement|undefined;
  let enabled=false,active=true,disposed=false,request=0;
  let suspension:ReturnType<typeof setTimeout>|undefined;
  function clearSuspension(){clearTimeout(suspension);suspension=undefined;}
  function prepare(){
    context=environment.createContext?.()??new AudioContext();
    media=environment.createMedia?.()??new Audio();
    media.preload='none';media.loop=true;media.volume=1;
    media.src=`${baseUrl.replace(/\/?$/,'/')}${GALLERY_AMBIENCE_FILE}`;
    master=context.createGain();master.gain.value=0;master.connect(context.destination);
    source=context.createMediaElementSource(media);source.connect(master);
  }
  function stop(){
    if(disposed||enabled&&active)return;
    media?.pause();void context?.suspend().catch(()=>{});
  }
  function fade(audible:boolean,immediate=false){
    if(!context||!master||disposed)return;
    clearSuspension();const now=context.currentTime;
    master.gain.cancelAndHoldAtTime(now);
    if(immediate)master.gain.setValueAtTime(audible?GALLERY_AMBIENCE_GAIN:0,now);
    else master.gain.linearRampToValueAtTime(audible?GALLERY_AMBIENCE_GAIN:0,now+(audible?2.2:.65));
    if(!audible){if(immediate)stop();else suspension=setTimeout(stop,700);}
  }
  async function resume(){
    if(!context||!media||disposed)return false;
    const pending=++request;clearSuspension();
    try {
      // Both calls occur in the visitor's activation event, before awaiting.
      await Promise.all([context.resume(),media.play()]);
      if(disposed)return false;
      if(pending!==request)return enabled;
      fade(enabled&&active);return enabled;
    }catch{
      if(disposed||pending!==request)return enabled&&!disposed;
      enabled=false;fade(false,true);return false;
    }
  }
  return {
    async setEnabled(value:boolean):Promise<boolean>{
      if(disposed)return false;
      enabled=value;
      if(!value){++request;fade(false);return false;}
      try{if(!context)prepare();}catch{enabled=false;media?.pause();return false;}
      if(!active){fade(false,true);return true;}
      return resume();
    },
    setActive(value:boolean,immediate=false){
      active=value;if(!context||disposed)return;
      if(enabled&&active)void resume();else{++request;fade(false,immediate);}
    },
    destroy(){
      if(disposed)return;
      disposed=true;enabled=false;++request;clearSuspension();
      media?.pause();media?.removeAttribute('src');media?.load();
      source?.disconnect();master?.disconnect();void context?.close().catch(()=>{});
    },
  };
}
