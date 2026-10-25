import { useEffect, useRef } from "react";

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    const parent = canvas.parentElement;
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame = 0;
    let lastFrame = 0;
    let running = true;

    const pointer = {
      x: -1000,
      y: -1000,
      active: false,
    };

    const random = (min, max) =>
      Math.random() * (max - min) + min;

    function createParticles() {
      const area = width * height;

      // Limit particle count for smooth performance.
      const count = Math.min(
        125,
        Math.max(35, Math.floor(area / 10500))
      );

      particles = Array.from({ length: count }, () => {
        const angle = random(0, Math.PI * 2);

        return {
          x: random(0, width),
          y: random(0, height),
          homeX: random(0, width),
          homeY: random(0, height),
          vx: Math.cos(angle) * random(0.05, 0.25),
          vy: Math.sin(angle) * random(0.05, 0.25),
          radius: random(0.8, 2.1),
          phase: random(0, Math.PI * 2),
        };
      });
    }

    function resizeCanvas() {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      createParticles();
      draw(0, true);
    }

    function draw(timestamp, staticFrame = false) {
      context.clearRect(0, 0, width, height);

      const movement = staticFrame
        ? 0
        : Math.min((timestamp - lastFrame) / 16.67 || 1, 2);

      if (!staticFrame) {
        lastFrame = timestamp;
      }

      const radius = Math.min(width, height) * 0.23;
      const radiusSquared = radius * radius;

      particles.forEach((particle) => {
        if (!staticFrame) {
          // Gentle, continuous drift.
          particle.phase += 0.006 * movement;

          particle.vx += Math.sin(particle.phase) * 0.003 * movement;
          particle.vy += Math.cos(particle.phase * 0.8) * 0.003 * movement;

          // Return slowly toward the particle's natural position.
          particle.vx +=
            (particle.homeX - particle.x) * 0.000025 * movement;

          particle.vy +=
            (particle.homeY - particle.y) * 0.000025 * movement;

          // Pointer creates a soft gravitational influence.
          if (pointer.active) {
            const dx = pointer.x - particle.x;
            const dy = pointer.y - particle.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared > 1 && distanceSquared < radiusSquared) {
              const distance = Math.sqrt(distanceSquared);
              const influence = 1 - distance / radius;

              const force = influence * 0.018 * movement;

              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }

          // Damping prevents uncontrolled acceleration.
          particle.vx *= 0.985;
          particle.vy *= 0.985;

          const speed = Math.hypot(particle.vx, particle.vy);
          const maxSpeed = 1.15;

          if (speed > maxSpeed) {
            particle.vx = (particle.vx / speed) * maxSpeed;
            particle.vy = (particle.vy / speed) * maxSpeed;
          }

          particle.x += particle.vx * movement;
          particle.y += particle.vy * movement;
        }

        // Wrap particles around the field boundaries.
        if (particle.x < -5) particle.x = width + 5;
        if (particle.x > width + 5) particle.x = -5;
        if (particle.y < -5) particle.y = height + 5;
        if (particle.y > height + 5) particle.y = -5;

        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        context.fillStyle = "rgba(91, 101, 190, 0.62)";
        context.fill();
      });

      // Draw subtle connections between nearby particles.
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const first = particles[i];
          const second = particles[j];

          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distanceSquared = dx * dx + dy * dy;
          const maxDistance = 78;

          if (distanceSquared < maxDistance * maxDistance) {
            const opacity =
              (1 - Math.sqrt(distanceSquared) / maxDistance) * 0.17;

            context.beginPath();
            context.moveTo(first.x, first.y);
            context.lineTo(second.x, second.y);
            context.strokeStyle = `rgba(101, 111, 190, ${opacity})`;
            context.lineWidth = 0.7;
            context.stroke();
          }
        }
      }
    }

    function animate(timestamp) {
      if (!running) return;

      draw(timestamp);
      animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      window.cancelAnimationFrame(animationFrame);
      running = true;
      lastFrame = 0;

      if (motionQuery.matches) {
        draw(0, true);
        running = false;
        return;
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    function handlePointerMove(event) {
      const rect = canvas.getBoundingClientRect();

      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;

      pointer.active =
        pointer.x >= 0 &&
        pointer.x <= rect.width &&
        pointer.y >= 0 &&
        pointer.y <= rect.height;
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    const observer = new ResizeObserver(resizeCanvas);

    observer.observe(parent);

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    window.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) handlePointerLeave();
    });

    motionQuery.addEventListener("change", startAnimation);

    resizeCanvas();
    startAnimation();

    return () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();

      window.removeEventListener("pointermove", handlePointerMove);
      motionQuery.removeEventListener("change", startAnimation);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-field"
      aria-hidden="true"
    />
  );
}