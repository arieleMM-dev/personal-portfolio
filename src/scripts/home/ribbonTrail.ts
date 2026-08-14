export function initRibbonTrail() {
  const canvas = document.getElementById('ribbon-trail') as HTMLCanvasElement;
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  let mouse = { x: width / 2, y: height / 2 };
  let points: { x: number, y: number, life: number }[] = [];
  let isDrawing = false;
  let rafId: number;

  const config = {
    friction: 0.5,
    trails: 20,
    size: 50,
    dampening: 0.25,
    tension: 0.98,
  };

  class Oscillator {
    phase = Math.random() * Math.PI * 2;
    amplitude = Math.random() * config.size;
    speed = 0.02 + Math.random() * 0.04;
    update() {
      this.phase += this.speed;
      return Math.sin(this.phase) * this.amplitude;
    }
  }

  class Node {
    x = mouse.x;
    y = mouse.y;
    vx = 0;
    vy = 0;
  }

  class Line {
    nodes: Node[] = [];
    osc = new Oscillator();
    color: string;

    constructor(color: string) {
      this.color = color;
      for (let i = 0; i < config.trails; i++) {
        this.nodes.push(new Node());
      }
    }

    update() {
      let oscOffset = this.osc.update();
      
      this.nodes[0].x = mouse.x + oscOffset;
      this.nodes[0].y = mouse.y + oscOffset;

      for (let i = 1; i < config.trails; i++) {
        let node = this.nodes[i];
        let prev = this.nodes[i - 1];

        node.vx += (prev.x - node.x) * config.tension;
        node.vy += (prev.y - node.y) * config.tension;
        
        node.vx *= config.friction;
        node.vy *= config.friction;
        
        node.x += node.vx;
        node.y += node.vy;
      }
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.beginPath();
      ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
      for (let i = 1; i < config.trails - 1; i++) {
        let xc = (this.nodes[i].x + this.nodes[i + 1].x) / 2;
        let yc = (this.nodes[i].y + this.nodes[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.nodes[i].x, this.nodes[i].y, xc, yc);
      }
      ctx.lineTo(this.nodes[config.trails - 1].x, this.nodes[config.trails - 1].y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const lines = [
    new Line('rgba(249, 115, 22, 0.6)'), // Orange
    new Line('rgba(255, 255, 255, 0.4)'), // White
    new Line('rgba(249, 115, 22, 0.3)') // Darker orange
  ];

  function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  function onMouseMove(e: MouseEvent) {
    // Critical Condition: Check scroll height to limit effect to Hero and About Me sections
    const heroHeight = document.getElementById('home')?.offsetHeight || window.innerHeight;
    const aboutHeight = document.getElementById('about')?.offsetHeight || window.innerHeight;
    const maxScroll = heroHeight + aboutHeight;

    if (window.scrollY <= maxScroll) {
      isDrawing = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    } else {
      isDrawing = false;
      ctx!.clearRect(0, 0, width, height);
    }
  }

  function render() {
    if (isDrawing) {
      ctx!.clearRect(0, 0, width, height);
      lines.forEach(line => {
        line.update();
        line.draw(ctx!);
      });
    }
    rafId = requestAnimationFrame(render);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);

  // Handle scroll to instantly clear if scrolling fast past the limit
  window.addEventListener('scroll', () => {
    const heroHeight = document.getElementById('home')?.offsetHeight || window.innerHeight;
    const aboutHeight = document.getElementById('about')?.offsetHeight || window.innerHeight;
    const maxScroll = heroHeight + aboutHeight;
    
    if (window.scrollY > maxScroll) {
      isDrawing = false;
      ctx!.clearRect(0, 0, width, height);
    }
  });

  render();

  return {
    destroy: () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    }
  };
}
