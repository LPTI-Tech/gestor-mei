import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  alpha: number;
}

export const ConstellationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Configurações inspiradas no visual sobre.lptitech.com.br
    const MAX_DISTANCE = 140; // Distância máxima para conexão entre partículas
    const MOUSE_RADIUS = 140; // Raio de influência suave do mouse

    // Paleta de partículas: variações entre Ciano (#38bdf8 / #06b6d4) e Esmeralda (#34d399 / #10b981)
    const particleColors = [
      { fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.6)' },
      { fill: '#06b6d4', glow: 'rgba(6, 182, 212, 0.6)' },
      { fill: '#34d399', glow: 'rgba(52, 211, 153, 0.6)' },
      { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' },
    ];

    const mouse = {
      x: null as number | null,
      y: null as number | null,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Ajuste responsivo de densidade: 65 partículas em telas grandes (requisito: entre 60 e 70)
    // Reduz para 36 em mobile para garantir 60 FPS estáveis e baixo consumo de CPU
    const getTargetParticleCount = (w: number) => {
      return w < 768 ? 36 : 65;
    };

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      const count = getTargetParticleCount(width);
      for (let i = 0; i < count; i++) {
        const colorSet = particleColors[Math.floor(Math.random() * particleColors.length)];
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          // Movimento lento e fluído
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1.5 + 1.2,
          color: colorSet.fill,
          glowColor: colorSet.glow,
          alpha: Math.random() * 0.4 + 0.6,
        });
      }
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);
    initParticles();

    // Loop de animação via requestAnimationFrame
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const pLength = particles.length;

      // 1. Conexões de constelação (Linhas conectando partículas próximas)
      for (let i = 0; i < pLength; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < pLength; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < MAX_DISTANCE) {
            // Opacidade da linha proporcional à proximidade (< 140px)
            const proximity = 1 - dist / MAX_DISTANCE;
            const lineOpacity = proximity * 0.22;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${lineOpacity})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      // 2. Atualização e renderização das partículas
      for (let i = 0; i < pLength; i++) {
        const p = particles[i];

        // Atualização contínua de posição
        p.x += p.vx;
        p.y += p.vy;

        // Rebater nas bordas da tela
        if (p.x < 0 || p.x > width) p.vx = -p.vx;
        if (p.y < 0 || p.y > height) p.vy = -p.vy;

        // Interação sutil com o ponteiro do mouse
        if (mouse.x !== null && mouse.y !== null) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mDist = Math.hypot(mdx, mdy);

          if (mDist < MOUSE_RADIUS) {
            const angle = Math.atan2(mdy, mdx);
            const force = (MOUSE_RADIUS - mDist) / MOUSE_RADIUS;
            // Repulsão suave e orgânica
            p.x -= Math.cos(angle) * force * 1.4;
            p.y -= Math.sin(angle) * force * 1.4;
          }
        }

        // Renderização com glow suave
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.glowColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup completo de listeners e animationFrames
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        backgroundColor: '#030712', // Fundo base #030712
      }}
    >
      {/* Aurora Ciano Difusa: rgba(6,182,212,0.15) */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '60vw',
          height: '60vh',
          minWidth: 420,
          minHeight: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0) 70%)',
          filter: 'blur(75px)',
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Aurora Esmeralda Difusa: rgba(16,185,129,0.12) */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '55vw',
          height: '55vh',
          minWidth: 380,
          minHeight: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 70%)',
          filter: 'blur(80px)',
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Grid Tecnológica Extremamente Discreta */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Canvas HTML5 das 60-70 Partículas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};

export default ConstellationBackground;
