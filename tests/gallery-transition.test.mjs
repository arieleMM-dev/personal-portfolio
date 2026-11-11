import assert from 'node:assert/strict';
import test from 'node:test';
import {parseGalleryHandoff,galleryTransitionDestination,GALLERY_HANDOFF_TTL} from '../src/scripts/gallery/transitionState.ts';

test('gallery handoff expires and cannot replay on another page, malformed storage or a future clock',()=>{
  const now=50000,value={mode:'enter',path:'/experiencias/',time:now-1000,focus:true};
  assert.deepEqual(parseGalleryHandoff(JSON.stringify(value),'/experiencias',now),value);
  for(const input of [null,'bad','{}',JSON.stringify({...value,mode:'other'}),JSON.stringify({...value,time:now+1}),JSON.stringify({...value,time:now-GALLERY_HANDOFF_TTL-1})])assert.equal(parseGalleryHandoff(input,'/experiencias/',now),null);
  assert.equal(parseGalleryHandoff(JSON.stringify(value),'/',now),null);
  assert.equal(parseGalleryHandoff(JSON.stringify({...value,focus:'true'}),'/experiencias/',now).focus,false);
});

test('custom navigation preserves ordinary links outside the two allowed same-origin routes',()=>{
  const main='https://example.test/portfolio/#web-experiences',base='/portfolio/';
  assert.equal(galleryTransitionDestination('/portfolio/experiencias/',main,base,'enter')?.pathname,'/portfolio/experiencias/');
  assert.equal(galleryTransitionDestination('/portfolio/#web-experiences',main,base,'return')?.hash,'#web-experiences');
  for(const href of ['https://another.test/portfolio/experiencias/','javascript:alert(1)','/portfolio/experiencias/?next=elsewhere','/portfolio/experiencias/#obra-materia','/experiencias/'])assert.equal(galleryTransitionDestination(href,main,base,'enter'),null);
  assert.equal(galleryTransitionDestination('/portfolio/#contact',main,base,'return'),null);
});

