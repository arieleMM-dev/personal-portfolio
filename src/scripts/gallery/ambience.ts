/** Original, quiet water/wind texture. Created only after explicit sound activation. */
export function createGalleryAmbience(createContext:()=>AudioContext=()=>new AudioContext()) {
  let context:AudioContext|undefined;
  let master:GainNode|undefined;
  let source:AudioBufferSourceNode|undefined;
  const nodes:AudioNode[]=[];
  let enabled=false, active=true, disposed=false;
  let suspension:ReturnType<typeof setTimeout>|undefined;

  function prepare() {
    context=createContext();
    master=context.createGain();master.gain.value=0;master.connect(context.destination);
    const highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=130;highpass.Q.value=.5;
    const lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=1150;lowpass.Q.value=.35;
    const buffer=context.createBuffer(2,context.sampleRate*18,context.sampleRate);
    for(let channel=0;channel<2;channel++) {
      const samples=buffer.getChannelData(channel);let drift=0;
      for(let i=0;i<samples.length;i++) {
        const noise=Math.random()*2-1;
        drift=drift*.985+noise*.065;
        const phase=i/samples.length*Math.PI*2;
        const swell=.72+.16*Math.sin(phase*3+channel*.7)+.12*Math.sin(phase*5);
        const edge=Math.min(1,i/(context.sampleRate*.35),(samples.length-1-i)/(context.sampleRate*.35));
        samples[i]=(drift*.8+noise*.025)*swell*edge;
      }
    }
    source=context.createBufferSource();source.buffer=buffer;source.loop=true;
    source.connect(highpass);highpass.connect(lowpass);lowpass.connect(master);
    nodes.push(source,highpass,lowpass,master);source.start();
  }
  function clearSuspension(){clearTimeout(suspension);suspension=undefined;}
  function fade(audible:boolean,immediate=false) {
    if(!context||!master||disposed)return;
    clearSuspension();
    const now=context.currentTime;
    master.gain.cancelAndHoldAtTime(now);
    if(immediate)master.gain.setValueAtTime(audible?.18:0,now);
    else master.gain.linearRampToValueAtTime(audible?.18:0,now+(audible?2.8:.8));
    if(!audible) {
      const suspend=()=>{if(!disposed&&(!enabled||!active))void context?.suspend().catch(()=>{});};
      if(immediate)suspend();else suspension=setTimeout(suspend,850);
    }
  }
  async function resume() {
    if(!context||disposed)return false;
    clearSuspension();
    try {
      await context.resume();
      if(disposed)return false;
      fade(enabled&&active);
      return enabled;
    }catch{enabled=false;fade(false,true);return false;}
  }
  return {
    async setEnabled(value:boolean):Promise<boolean> {
      if(disposed)return false;
      enabled=value;
      if(!value){fade(false);return false;}
      try{if(!context)prepare();}catch{enabled=false;return false;}
      if(!active){fade(false,true);return true;}
      return resume();
    },
    setActive(value:boolean,immediate=false) {
      active=value;
      if(!context||disposed)return;
      if(enabled&&active)void resume();else fade(false,immediate);
    },
    destroy() {
      if(disposed)return;
      disposed=true;enabled=false;clearSuspension();source?.stop();
      nodes.forEach(node=>node.disconnect());
      if(context)void context.close().catch(()=>{});
    },
  };
}
