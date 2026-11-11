import assert from 'node:assert/strict';
import test from 'node:test';
import {statSync} from 'node:fs';
import {createGalleryAmbience,GALLERY_AMBIENCE_FILE,GALLERY_AMBIENCE_GAIN} from '../src/scripts/gallery/ambience.ts';

function audioEnvironment({blocked=false,deferred=false}={}) {
  const contexts=[],media=[];let finishResume;
  const parameter=()=>({value:0,events:[],cancelAndHoldAtTime(){},setValueAtTime(value){this.events.push(value);},linearRampToValueAtTime(value){this.events.push(value);}});
  function createContext(){
    const context={
      state:'suspended',currentTime:10,destination:{},nodes:[],
      async resume(){if(blocked)throw new Error('Blocked');if(deferred)await new Promise(resolve=>{finishResume=resolve;});if(this.state==='closed')throw new Error('Closed');this.state='running';},
      async suspend(){this.state='suspended';},async close(){this.state='closed';},
      node(properties={}){const node={...properties,connect(){},disconnect(){this.disconnected=true;}};this.nodes.push(node);return node;},
      createGain(){return this.node({gain:parameter()});},
      createMediaElementSource(element){return this.node({media:element});},
    };
    contexts.push(context);return context;
  }
  function createMedia(){
    const element={src:'',preload:'auto',loop:false,volume:1,paused:true,plays:0,
      async play(){this.plays++;this.paused=false;},pause(){this.paused=true;},
      removeAttribute(name){if(name==='src')this.src='';},load(){this.released=true;},
    };
    media.push(element);return element;
  }
  return {contexts,media,createContext,createMedia,finishResume:()=>finishResume?.()};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

test('gallery streams the chosen local MP3 only after consent, through a low-volume gain and a reusable graph',async()=>{
  const env=audioEnvironment(),audio=createGalleryAmbience('/portfolio/',env);
  audio.setActive(false,true);audio.setActive(true);
  assert.equal(env.contexts.length,0);assert.equal(env.media.length,0,'no audio element or media request before consent');
  assert.equal(await audio.setEnabled(true),true);
  const ctx=env.contexts[0],element=env.media[0],master=ctx.nodes[0];
  assert.equal(element.src,`/portfolio/${GALLERY_AMBIENCE_FILE}`);
  assert.equal(element.preload,'none');assert.equal(element.loop,true);assert.equal(element.paused,false);
  assert.equal(master.gain.value,0);assert.equal(master.gain.events.at(-1),.12);
  assert.equal(GALLERY_AMBIENCE_GAIN,.12);assert.equal(ctx.nodes[1].media,element);
  assert.ok(statSync(new URL(`../public/${GALLERY_AMBIENCE_FILE}`,import.meta.url)).size>0);
  await audio.setEnabled(true);assert.equal(env.contexts.length,1);assert.equal(env.media.length,1);
  audio.destroy();assert.equal(ctx.state,'closed');assert.ok(ctx.nodes.every(node=>node.disconnected));assert.equal(element.src,'');assert.equal(element.released,true);
});

test('mute fades, pauses the stream, cancels stale timers and preserves the choice across previews',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const env=audioEnvironment(),audio=createGalleryAmbience('/',env);
  try{
    await audio.setEnabled(true);const ctx=env.contexts[0],element=env.media[0],master=ctx.nodes[0];
    await audio.setEnabled(false);assert.equal(master.gain.events.at(-1),0);
    t.mock.timers.tick(800);assert.equal(ctx.state,'suspended');assert.equal(element.paused,true);
    await audio.setEnabled(true);assert.equal(ctx.state,'running');assert.equal(element.paused,false);
    audio.setActive(false);audio.setActive(true);await settle();
    t.mock.timers.tick(800);assert.equal(ctx.state,'running');assert.equal(element.paused,false);
    audio.setActive(false,true);assert.equal(ctx.state,'suspended');assert.equal(element.paused,true);
    audio.setActive(true);await settle();assert.equal(ctx.state,'running');assert.equal(element.paused,false);
    await audio.setEnabled(false);audio.setActive(false);audio.setActive(true);await settle();
    t.mock.timers.tick(800);assert.equal(master.gain.events.at(-1),0);assert.equal(element.paused,true,'closing a preview cannot undo mute');
  }finally{audio.destroy();t.mock.timers.reset();}
});

test('failed or late activation cannot override mute or disposal',async()=>{
  const blocked=audioEnvironment({blocked:true}),silent=createGalleryAmbience('/',blocked);
  assert.equal(await silent.setEnabled(true),false);assert.equal(blocked.media[0].paused,true);silent.destroy();
  const env=audioEnvironment({deferred:true}),audio=createGalleryAmbience('/',env);
  const pending=audio.setEnabled(true);await audio.setEnabled(false);env.finishResume();assert.equal(await pending,false);
  assert.equal(env.contexts[0].nodes[0].gain.events.at(-1),0);
  audio.destroy();assert.equal(await audio.setEnabled(true),false);
  const late=audioEnvironment({deferred:true}),disposing=createGalleryAmbience('/',late);
  const loading=disposing.setEnabled(true);disposing.destroy();late.finishResume();assert.equal(await loading,false);assert.equal(late.media[0].src,'');
});
