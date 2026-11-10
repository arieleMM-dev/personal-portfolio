import assert from 'node:assert/strict';
import test from 'node:test';
import { createGalleryAmbience } from '../src/scripts/gallery/ambience.ts';

function audioEnvironment({blocked=false,deferred=false}={}) {
  const contexts=[];let finishResume;
  const parameter=()=>({value:0,events:[],cancelAndHoldAtTime(){},setValueAtTime(value){this.events.push(value);},linearRampToValueAtTime(value){this.events.push(value);}});
  function createContext(){
    const context={
      state:'suspended',sampleRate:1000,currentTime:10,destination:{},nodes:[],
      async resume(){if(blocked)throw new Error('Blocked');if(deferred)await new Promise(resolve=>{finishResume=resolve;});this.state='running';},
      async suspend(){this.state='suspended';},async close(){this.state='closed';},
      node(properties={}){const node={...properties,connect(){},disconnect(){this.disconnected=true;}};this.nodes.push(node);return node;},
      createGain(){return this.node({gain:parameter()});},
      createBiquadFilter(){return this.node({frequency:parameter(),Q:parameter()});},
      createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:channel=>data[channel],numberOfChannels:channels};},
      createBufferSource(){return this.node({start(){this.started=true;},stop(){this.stopped=true;}});},
    };
    contexts.push(context);return context;
  }
  return {contexts,createContext,finishResume:()=>finishResume?.()};
}

test('gallery ambience is opt-in, quiet, stereo and smoothly looped',async()=>{
  const env=audioEnvironment(),audio=createGalleryAmbience(env.createContext);
  audio.setActive(false,true);audio.setActive(true);
  assert.equal(env.contexts.length,0,'visibility cannot create sound without consent');
  assert.equal(await audio.setEnabled(true),true);
  const ctx=env.contexts[0],master=ctx.nodes[0],source=ctx.nodes.find(node=>node.buffer);
  assert.equal(master.gain.value,0);assert.equal(master.gain.events.at(-1),.18);
  assert.equal(source.loop,true);assert.equal(source.buffer.numberOfChannels,2);
  for(let channel=0;channel<2;channel++){
    const samples=source.buffer.getChannelData(channel);
    assert.equal(Math.abs(samples[0]),0);assert.equal(Math.abs(samples.at(-1)),0);
    assert.ok(samples.every(Number.isFinite));assert.ok(samples.some(sample=>Math.abs(sample)>.01));
  }
  await audio.setEnabled(true);assert.equal(env.contexts.length,1,'reactivation reuses the audio graph');
  audio.destroy();assert.equal(ctx.state,'closed');assert.ok(ctx.nodes.every(node=>node.disconnected));assert.equal(source.stopped,true);
});

test('sound mute and preview suspension preserve consent and cancel stale timers',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const env=audioEnvironment(),audio=createGalleryAmbience(env.createContext);
  try{
    await audio.setEnabled(true);const ctx=env.contexts[0],master=ctx.nodes[0];
    await audio.setEnabled(false);assert.equal(master.gain.events.at(-1),0);
    t.mock.timers.tick(900);assert.equal(ctx.state,'suspended');
    await audio.setEnabled(true);assert.equal(ctx.state,'running');
    audio.setActive(false);audio.setActive(true);await Promise.resolve();
    t.mock.timers.tick(900);assert.equal(ctx.state,'running');
    audio.setActive(false,true);assert.equal(ctx.state,'suspended','background tabs stop immediately');
    audio.setActive(true);await Promise.resolve();assert.equal(ctx.state,'running','returning from preview restores enabled sound');
    await audio.setEnabled(false);audio.setActive(false);audio.setActive(true);await Promise.resolve();
    assert.equal(master.gain.events.at(-1),0,'opening and closing a preview cannot unmute the visitor');
  }finally{audio.destroy();t.mock.timers.reset();}
});

test('blocked playback fails quietly and pending activation cannot undo mute or cleanup',async()=>{
  const blocked=audioEnvironment({blocked:true}),silent=createGalleryAmbience(blocked.createContext);
  assert.equal(await silent.setEnabled(true),false);silent.destroy();
  const env=audioEnvironment({deferred:true}),audio=createGalleryAmbience(env.createContext);
  const pending=audio.setEnabled(true);
  await audio.setEnabled(false);env.finishResume();assert.equal(await pending,false);
  assert.equal(env.contexts[0].nodes[0].gain.events.at(-1),0);
  audio.destroy();assert.equal(await audio.setEnabled(true),false);
});
