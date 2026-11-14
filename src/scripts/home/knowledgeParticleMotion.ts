export interface ParticleOffset { x: number; y: number; vx: number; vy: number }

/** Screen-space spring: local repulsion, then a damped return to the authored model. */
export function advanceParticleOffset(state: ParticleOffset,dx: number,dy: number,radius: number,strength: number,delta: number) {
  const distance=Math.hypot(dx,dy),safe=Math.max(distance,.001);
  const influence=Math.max(0,1-distance/radius)**2;
  const tx=dx/safe*influence*strength,ty=dy/safe*influence*strength;
  const dt=Math.max(0,Math.min(delta,.05)),damping=Math.exp(-15*dt);
  state.vx=(state.vx+(tx-state.x)*115*dt)*damping;
  state.vy=(state.vy+(ty-state.y)*115*dt)*damping;
  state.x+=state.vx*dt;state.y+=state.vy*dt;
}
