"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";

export interface StreamTicket {
  name: string;
  color: string;
  subject: string;
  tag?: string;
  status: "draft" | "agent";
  ago: string;
  /** The ticket the rest of the page follows: drawn with the orange edge. */
  featured?: boolean;
}

const W = 1000;
const H = 300;
const TAG_COLORS: Record<string, [string, string]> = {
  "Delivery delay": ["#fef3c7", "#92400e"],
  Exchange: ["#eff6ff", "#1d4ed8"],
  Cancellation: ["#eff6ff", "#1d4ed8"],
  Billing: ["#fff7ed", "#c2410c"],
  Damage: ["#fff7ed", "#c2410c"],
};

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, bg: string, fg: string, font: string) {
  ctx.font = `700 24px ${font}`;
  const w = ctx.measureText(label).width + 28;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 42, 8);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(label, x + 14, y + 30);
  return w;
}

/** Paint one inbox row (avatar, name, subject, tags) the way the real inbox shows it. */
function drawTicket(t: StreamTicket, font: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = t.featured ? "#fff4ef" : "#ffffff";
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 28);
  ctx.fill();
  if (t.featured) {
    ctx.fillStyle = "#f26b3a";
    ctx.fillRect(0, 40, 10, H - 80);
  }

  ctx.fillStyle = t.color;
  ctx.beginPath();
  ctx.arc(110, 108, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 34px ${font}`;
  ctx.textAlign = "center";
  ctx.fillText(t.name.split(" ").map((p) => p[0]).join("").slice(0, 2), 110, 121);
  ctx.textAlign = "left";

  ctx.fillStyle = "#111827";
  ctx.font = `700 40px ${font}`;
  ctx.fillText(t.name, 190, 96);
  ctx.fillStyle = "#9ca3af";
  ctx.font = `400 30px ${font}`;
  ctx.textAlign = "right";
  ctx.fillText(t.ago, W - 56, 94);
  ctx.textAlign = "left";
  ctx.fillStyle = "#374151";
  ctx.font = `400 34px ${font}`;
  ctx.fillText(t.subject, 190, 148, W - 260);

  let x = 190;
  if (t.tag) {
    const [bg, fg] = TAG_COLORS[t.tag] ?? ["#f3f4f6", "#374151"];
    x += pill(ctx, x, 186, t.tag, bg, fg, font) + 12;
  }
  if (t.status === "draft") pill(ctx, x, 186, "AI draft", "#ecfdf5", "#047857", font);
  else pill(ctx, x, 186, "Needs agent", "#f3f4f6", "#374151", font);
  return canvas;
}

/**
 * Hero scene: the demo inbox's real tickets as cards hanging in a loose column.
 * They drift, tilt with the pointer, and scrolling pulls the featured ticket
 * forward while the others fall back: the page then follows that ticket.
 */
export function TicketStream({ tickets, className = "" }: { tickets: StreamTicket[]; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    const reduced = prefersReducedMotion();
    const cleanups: (() => void)[] = [];

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    scene.add(new THREE.AmbientLight(0xffffff, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(-4, 4, 6);
    scene.add(key);

    const group = new THREE.Group();
    group.rotation.set(0.04, -0.32, 0.02);
    scene.add(group);

    const font = getComputedStyle(document.body).fontFamily;
    const n = tickets.length;
    const featured = Math.max(0, tickets.findIndex((t) => t.featured));
    const meshes: THREE.Mesh[] = [];
    const rest = tickets.map((_, i) => {
      const t = i - (n - 1) / 2;
      return { x: Math.sin(i * 1.3) * 0.35, y: -t * 0.92, z: -Math.abs(t) * 0.35 + Math.cos(i * 2.1) * 0.25 };
    });
    const focus = tickets.map((_, i) => {
      const t = i - featured;
      return i === featured ? { x: -0.2, y: 0.2, z: 2.6 } : { x: Math.sign(t || 1) * 2.4 + t * 0.2, y: -t * 0.8, z: -2.5 - Math.abs(t) * 0.4 };
    });

    tickets.forEach((ticket, i) => {
      const geometry = new THREE.PlaneGeometry(3.4, 3.4 * (H / W));
      const texture = new THREE.CanvasTexture(drawTicket(ticket, font));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9 });
      const mesh = new THREE.Mesh(geometry, material);
      const r = rest[i];
      mesh.position.set(r.x, r.y, r.z);
      mesh.userData = { phase: i * 1.9, target: r };
      group.add(mesh);
      meshes.push(mesh);
    });

    if (!reduced) {
      meshes.forEach((m, i) => {
        gsap.from(m.position, { x: m.position.x + 3.5, duration: 1.5, delay: 0.25 + i * 0.08, ease: "expo.out" });
        gsap.from(m.material, { opacity: 0, duration: 1, delay: 0.25 + i * 0.08 });
      });
      const state = { p: 0 };
      const tween = gsap.to(state, {
        p: 1,
        ease: "none",
        scrollTrigger: { trigger: host, start: "top top+=60", end: "bottom top", scrub: 0.8 },
        onUpdate: () => {
          const e = gsap.parseEase("power2.inOut")(state.p);
          meshes.forEach((m, i) => {
            const a = rest[i];
            const b = focus[i];
            m.userData.target = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: a.z + (b.z - a.z) * e };
          });
        },
      });
      cleanups.push(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    }

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);
    cleanups.push(() => window.removeEventListener("pointermove", onMove));

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
      camera.aspect = width / Math.max(1, height);
      camera.position.z = camera.aspect < 1 ? 11 : 10;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    cleanups.push(() => ro.disconnect());

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) loop();
    });
    io.observe(host);
    cleanups.push(() => io.disconnect());

    const clock = new THREE.Clock();
    function loop() {
      cancelAnimationFrame(frame);
      if (disposed || !visible) return;
      const t = clock.getElapsedTime();
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      group.rotation.y = -0.32 + pointer.x * 0.12;
      group.rotation.x = 0.04 + pointer.y * 0.06;
      for (const m of meshes) {
        const target = m.userData.target as { x: number; y: number; z: number };
        m.position.x += (target.x - m.position.x) * 0.1;
        m.position.z += (target.z - m.position.z) * 0.1;
        m.position.y += (target.y + Math.sin(t * 0.8 + m.userData.phase) * 0.05 - m.position.y) * 0.1;
        m.rotation.z = Math.sin(t * 0.5 + m.userData.phase) * 0.015;
      }
      render();
      frame = requestAnimationFrame(loop);
    }
    resize();
    if (!reduced) loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanups.forEach((fn) => fn());
      gsap.killTweensOf(meshes.flatMap((m) => [m.position, m.material]));
      for (const m of meshes) {
        m.geometry.dispose();
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
      ScrollTrigger.refresh();
    };
  }, [tickets]);

  return <div ref={hostRef} className={className} aria-hidden />;
}
