export function initOrbitalDance() {
  const canvas = document.getElementById('orbital-canvas') as HTMLCanvasElement;
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let width = 0;
  let height = 0;

  // Center of gravity (mouse or center screen)
  const center = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0 };
  
  // External scroll attractor
  let useScrollAttractor = false;
  let swarmMode = false;
  let heroMode = true; // Empieza en modo hero

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Initial center is center of screen
    if (mouse.x === 0 && mouse.y === 0 && !useScrollAttractor) {
      center.x = width / 2;
      center.y = height / 2;
    }
  };

  window.addEventListener('resize', resize);
  resize();

  // Update center based on mouse (only if not using scroll attractor OR in hero mode)
  const onMouseMove = (e: MouseEvent) => {
    if (!useScrollAttractor || heroMode) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
  };
  window.addEventListener('mousemove', onMouseMove);

  // Entities
  const CONFIG = {
    historyLen: 40,
    speeds: {
      hero: { prey: 6.0, predator: 8.0 },
      burst: { prey: 25.0, predator: 28.0 },
      scroll: { prey: 1.8, predator: 2.4 },
      swarm: { prey: 1.0, predator: 1.2 }
    },
    friction: {
      burst: 0.95,
      normal: 0.92
    },
    trails: {
      prey: { width: 2.5, blur: 12, color: '#00ffff' },
      predator: { width: 7, blur: 28 }
    }
  };

  class Entity {
    x: number;
    y: number;
    vx: number;
    vy: number;
    history: { x: number, y: number }[];
    maxSpeed: number;

    constructor(x: number, y: number, maxSpeed: number) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 5;
      this.vy = (Math.random() - 0.5) * 5;
      this.history = [];
      this.maxSpeed = maxSpeed;
    }

    updateHistory() {
      this.history.unshift({ x: this.x, y: this.y });
      if (this.history.length > CONFIG.historyLen) {
        this.history.pop();
      }
    }
  }

  // Empieza con la velocidad rápida del Hero
  const prey = new Entity(width * 0.4, height * 0.5, CONFIG.speeds.hero.prey);
  const predator = new Entity(width * 0.6, height * 0.5, CONFIG.speeds.hero.predator);

  let preyWanderAngle = Math.random() * Math.PI * 2;

  // Chaotic Burst mechanics
  let isBursting = false;
  let isActive = true;

  const triggerBurst = () => {
    if (!isActive) return;

    isBursting = true;
    preyWanderAngle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * Math.PI);

    if (heroMode) {
      prey.maxSpeed = CONFIG.speeds.burst.prey;
      predator.maxSpeed = CONFIG.speeds.burst.predator;
    } else {
      prey.maxSpeed = 7.5;
      predator.maxSpeed = 8.4;
    }

    setTimeout(() => {
      isBursting = false;
      if (heroMode) {
        prey.maxSpeed = CONFIG.speeds.hero.prey;
        predator.maxSpeed = CONFIG.speeds.hero.predator;
      } else {
        prey.maxSpeed = CONFIG.speeds.scroll.prey;
        predator.maxSpeed = CONFIG.speeds.scroll.predator;
      }
    }, 400 + Math.random() * 600);

    setTimeout(triggerBurst, 1500 + Math.random() * 2500);
  };

  triggerBurst();

  let rafId = 0;

  const loop = () => {
    if (!isActive) return;

    // Smooth lerp center to target
    if ((!useScrollAttractor || heroMode) && (mouse.x !== 0 || mouse.y !== 0)) {
      center.x += (mouse.x - center.x) * 0.05;
      center.y += (mouse.y - center.y) * 0.05;
    }

    let targetX = center.x;
    let targetY = center.y;
    let currentSteerX = heroMode ? 0.4 : 0.8;
    let currentSteerY = heroMode ? 0.4 : 0.8;

    // Distancia al objetivo general
    const distToCenter = Math.sqrt(Math.pow(targetX - prey.x, 2) + Math.pow(targetY - prey.y, 2));

    // Lógica de Viaje vs Micro-Órbita
    if (useScrollAttractor && !heroMode) {
      const time = performance.now() * 0.005;
      
      // Interpolador de velocidad (1.0 = lejos, 0.0 = muy cerca)
      const speedFactor = Math.min(1, Math.max(0, distToCenter / 200));
      
      // Velocidad dinámica: Rápido en el viaje, lento en el objetivo
      prey.maxSpeed = 1.0 + (5.0 * speedFactor);
      predator.maxSpeed = 1.5 + (6.5 * speedFactor);

      // Micro-órbita oscilante alrededor del target invisible (efecto zumbido vibrante)
      // Solo es perceptible cuando llega al punto (speedFactor se acerca a 0)
      targetX = center.x + Math.cos(time) * 4;
      targetY = center.y + Math.sin(time * 2) * 4;
      
      // Fuerza magnética altísima para que no se escapen
      currentSteerX = 2.0;
      currentSteerY = 2.0;
    } else if (heroMode) {
      prey.maxSpeed = isBursting ? CONFIG.speeds.burst.prey : CONFIG.speeds.hero.prey;
      predator.maxSpeed = isBursting ? CONFIG.speeds.burst.predator : CONFIG.speeds.hero.predator;
    }

    // --- Prey Logic (Erratic Wandering + Seek Center) ---
    // Wandering
    preyWanderAngle += (Math.random() - 0.5) * (isBursting && heroMode ? 1.5 : 0.4);
    const wanderForce = {
      x: Math.cos(preyWanderAngle) * (useScrollAttractor && !heroMode ? 0.5 : 2),
      y: Math.sin(preyWanderAngle) * (useScrollAttractor && !heroMode ? 0.5 : 2)
    };

    // 1. Soft Bounding Box (Arena Invisible) - Solo en Hero Mode para permitir el viaje a los bordes
    const margin = window.innerWidth * 0.1;
    const turnFactor = 1.5;
    let containmentForce = { x: 0, y: 0 };

    if (heroMode) {
      if (prey.x < margin) containmentForce.x += turnFactor;
      if (prey.x > width - margin) containmentForce.x -= turnFactor;
      if (prey.y < margin) containmentForce.y += turnFactor;
      if (prey.y > height - margin) containmentForce.y -= turnFactor;
    }

    // 2. Gravedad Central Exacta (Center Attractor)
    const exactCenterX = width / 2;
    const exactCenterY = height / 2;
    const dxExactCenter = exactCenterX - prey.x;
    const dyExactCenter = exactCenterY - prey.y;
    const distExactCenter = Math.sqrt(dxExactCenter * dxExactCenter + dyExactCenter * dyExactCenter);
    const absoluteCenterForce = {
      x: distExactCenter > 0 ? (dxExactCenter / distExactCenter) * 0.3 : 0,
      y: distExactCenter > 0 ? (dyExactCenter / distExactCenter) * 0.3 : 0
    };

    // Seek target
    const dxCenter = targetX - prey.x;
    const dyCenter = targetY - prey.y;
    const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
    const targetForce = {
      x: distCenter > 0 ? (dxCenter / distCenter) * currentSteerX : 0,
      y: distCenter > 0 ? (dyCenter / distCenter) * currentSteerY : 0
    };

    // Flee Predator if too close
    const dxPred = prey.x - predator.x;
    const dyPred = prey.y - predator.y;
    const distPred = Math.sqrt(dxPred * dxPred + dyPred * dyPred);
    let fleeForce = { x: 0, y: 0 };
    if (distPred < 200 && heroMode) { // Menos pánico en scroll mode
      fleeForce = {
        x: (dxPred / distPred) * (isBursting ? 4 : 1.5),
        y: (dyPred / distPred) * (isBursting ? 4 : 1.5)
      };
    } else if (distPred < 50 && !heroMode) {
      fleeForce = {
        x: (dxPred / distPred) * 0.5,
        y: (dyPred / distPred) * 0.5
      };
    }

    prey.vx += wanderForce.x + targetForce.x + (heroMode ? absoluteCenterForce.x : 0) + containmentForce.x + fleeForce.x;
    prey.vy += wanderForce.y + targetForce.y + (heroMode ? absoluteCenterForce.y : 0) + containmentForce.y + fleeForce.y;

    // --- Predator Logic (Seek Prey) ---
    const dxPrey = prey.x - predator.x;
    const dyPrey = prey.y - predator.y;
    const distToPrey = Math.sqrt(dxPrey * dxPrey + dyPrey * dyPrey);

    // Seek force
    const seekForce = {
      x: (dxPrey / distToPrey) * (isBursting && heroMode ? 3 : (heroMode ? 0.8 : 1.5)),
      y: (dyPrey / distToPrey) * (isBursting && heroMode ? 3 : (heroMode ? 0.8 : 1.5))
    };

    predator.vx += seekForce.x;
    predator.vy += seekForce.y;

    // Friction and Speed Limit
    const applyPhysics = (ent: Entity, friction: number) => {
      ent.vx *= friction;
      ent.vy *= friction;
      const speed = Math.sqrt(ent.vx * ent.vx + ent.vy * ent.vy);
      if (speed > ent.maxSpeed) {
        ent.vx = (ent.vx / speed) * ent.maxSpeed;
        ent.vy = (ent.vy / speed) * ent.maxSpeed;
      }
      ent.x += ent.vx;
      ent.y += ent.vy;

      // Wrap-Around Seguro solo si no estamos yendo a un objetivo fijo en scroll
      if (heroMode) {
        const buffer = 100;
        let wrapped = false;
        if (ent.x < -buffer || ent.x > width + buffer || ent.y < -buffer || ent.y > height + buffer) {
          ent.x = width / 2 + (Math.random() - 0.5) * 100;
          ent.y = height / 2 + (Math.random() - 0.5) * 100;
          wrapped = true;
        }

        if (wrapped) {
          ent.history = []; // Clean history to avoid cross-screen lines
        } else {
          ent.updateHistory();
        }
      } else {
         ent.updateHistory();
      }
    };

    // Friction is lower during burst for wilder turns
    const friction = (isBursting && heroMode) ? CONFIG.friction.burst : CONFIG.friction.normal;
    applyPhysics(prey, friction);
    applyPhysics(predator, friction);

    // Render
    ctx.clearRect(0, 0, width, height);

    const drawTrail = (ent: Entity, colorStr: string, blurColor: string, baseWidth: number, maxShadowBlur: number, isPredator: boolean) => {
      if (ent.history.length < 2) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw trail segments
      for (let i = 0; i < ent.history.length - 1; i++) {
        const p1 = ent.history[i];
        const p2 = ent.history[i + 1];
        const progress = i / ent.history.length; // 0 at head, 1 at tail
        const opacity = 1.0 - progress;
        const w = baseWidth * (1.0 - progress);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        ctx.strokeStyle = `${colorStr}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = w;
        ctx.shadowBlur = maxShadowBlur * (1 - progress);
        ctx.shadowColor = blurColor;
        ctx.stroke();
      }

      // El "Núcleo" (Cabeza) - Dibujado al final para que quede por encima de la estela
      ctx.beginPath();
      if (isPredator) {
        // Cazador: Cometa pesado, masivo y amenazante
        ctx.arc(ent.x, ent.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = maxShadowBlur;
        ctx.shadowColor = blurColor;
      } else {
        // Presa: Frágil y ligera
        ctx.arc(ent.x, ent.y, baseWidth * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#e0ffff';
        ctx.shadowBlur = maxShadowBlur;
        ctx.shadowColor = blurColor;
      }
      ctx.fill();

      ctx.shadowBlur = 0; // Reset
    };

    // Get dynamic color from CSS variable or fallback
    const rootStyle = getComputedStyle(document.documentElement);
    let dynColor = rootStyle.getPropertyValue('--dynamic-glow-color').trim();
    if (!dynColor) dynColor = 'rgb(239, 68, 68)';

    // Convert rgb(r, g, b) to hex for easy alpha appending
    let predColorHex = '#ef4444';
    const rgbMatch = dynColor.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      predColorHex = '#' + rgbMatch.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }

    // Prey is Cyan (#00ffff), delicate line, moderate blur
    drawTrail(prey, CONFIG.trails.prey.color, CONFIG.trails.prey.color, CONFIG.trails.prey.width, CONFIG.trails.prey.blur, false);
    // Predator uses dynamic color, massive line, intense blur, with core
    drawTrail(predator, predColorHex, dynColor, CONFIG.trails.predator.width, CONFIG.trails.predator.blur, true);

    rafId = requestAnimationFrame(loop);
  };

  loop();

  return {
    destroy: () => {
      isActive = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
    },
    setAttractorTarget: (x: number, y: number) => {
      useScrollAttractor = true;
      center.x += (x - center.x) * 0.1;
      center.y += (y - center.y) * 0.1;
    },
    setHeroMode: (active: boolean) => {
      heroMode = active;
      if (active) {
        prey.maxSpeed = CONFIG.speeds.hero.prey;
        predator.maxSpeed = CONFIG.speeds.hero.predator;
      } else {
        prey.maxSpeed = CONFIG.speeds.scroll.prey;
        predator.maxSpeed = CONFIG.speeds.scroll.predator;
      }
    },
    setSwarmMode: (active: boolean) => {
      swarmMode = active;
      if (active && !heroMode) {
        prey.maxSpeed = CONFIG.speeds.swarm.prey;
        predator.maxSpeed = CONFIG.speeds.swarm.predator;
      } else if (!heroMode) {
        prey.maxSpeed = CONFIG.speeds.scroll.prey;
        predator.maxSpeed = CONFIG.speeds.scroll.predator;
      }
    }
  };
}
