"use client";

import { useEffect } from "react";

export function VaidyaShell() {
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).THREE || !(window as any).gsap) return;
    
    const init3D = () => {
      const THREE = (window as any).THREE;
      const gsap = (window as any).gsap;
      const ScrollTrigger = (window as any).ScrollTrigger;
      if (!THREE || !gsap) return;
      
      gsap.registerPlugin(ScrollTrigger);

      const canvas = document.getElementById('canvas3d') as HTMLCanvasElement;
      if (!canvas) return;
      
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 10;

      const onResize = () => {
          // Adjust for sidebar width if window is large enough
          const width = window.innerWidth > 768 ? window.innerWidth - 280 : window.innerWidth;
          renderer.setSize(width, window.innerHeight);
          camera.aspect = width / window.innerHeight;
          camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize, false);
      // Initialize with correct size considering sidebar
      const initialWidth = window.innerWidth > 768 ? window.innerWidth - 280 : window.innerWidth;
      renderer.setSize(initialWidth, window.innerHeight);
      camera.aspect = initialWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      const particlesGeometry = new THREE.BufferGeometry();
      const count = 120;
      const positions = new Float32Array(count * 3);
      for(let i = 0; i < count * 3; i++) {
          positions[i] = (Math.random() - 0.5) * 50;
      }
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particlesMaterial = new THREE.PointsMaterial({
          color: 0xffb77e,
          size: 0.08,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending
      });
      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particles);

      const mandalaGroup = new THREE.Group();
      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffb77e, wireframe: true, transparent: true, opacity: 0.15 });
      for(let i = 0; i < 3; i++) {
          const geometry = new THREE.TorusGeometry(3 + i * 0.8, 0.01, 8, 48);
          const ring = new THREE.Mesh(geometry, ringMaterial);
          ring.rotation.x = Math.PI / 2;
          mandalaGroup.add(ring);
      }
      scene.add(mandalaGroup);

      const bookGroup = new THREE.Group();
      const pageGeom = new THREE.BoxGeometry(2, 2.8, 0.2);
      const pageMat = new THREE.MeshStandardMaterial({ color: 0xf2e5c8 });
      const book = new THREE.Mesh(pageGeom, pageMat);
      bookGroup.add(book);
      bookGroup.position.set(4, 0, 5);
      bookGroup.rotation.y = -Math.PI / 4;
      scene.add(bookGroup);

      const pillarGeom = new THREE.BoxGeometry(1.5, 12, 1.5);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x231f1a });
      const leftPillar = new THREE.Mesh(pillarGeom, pillarMat);
      leftPillar.position.set(-12, 0, 0);
      const rightPillar = new THREE.Mesh(pillarGeom, pillarMat);
      rightPillar.position.set(12, 0, 0);
      scene.add(leftPillar, rightPillar);

      const light1 = new THREE.PointLight(0xffb77e, 1.5, 20);
      light1.position.set(-8, -4, 2);
      const light2 = new THREE.PointLight(0xffb77e, 1.5, 20);
      light2.position.set(8, -4, 2);
      scene.add(light1, light2, new THREE.AmbientLight(0xffffff, 0.15));

      gsap.to([light1, light2], {
          intensity: 1.8,
          duration: 0.15,
          repeat: -1,
          yoyo: true,
          stagger: 0.1,
          ease: "none",
          repeatRefresh: true
      });

      let mouseX = 0, mouseY = 0;
      let targetMouseX = 0, targetMouseY = 0;
      const onMouseMove = (e: MouseEvent) => {
          targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
          targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMouseMove, { passive: true });

      let reqId: number;
      function animate() {
          reqId = requestAnimationFrame(animate);
          particles.rotation.y += 0.0003;
          mandalaGroup.rotation.z += 0.0008;
          mandalaGroup.rotation.x += 0.0004;
          bookGroup.position.y = Math.sin(Date.now() * 0.0008) * 0.15;
          
          mouseX += (targetMouseX - mouseX) * 0.04;
          mouseY += (targetMouseY - mouseY) * 0.04;
          
          camera.position.x = mouseX * 1.5;
          camera.position.y = -mouseY * 1.5;
          camera.lookAt(0,0,0);
          renderer.render(scene, camera);
      }
      animate();

      const tl = gsap.timeline();
      tl.from(".gsap-reveal", {
          y: 30,
          opacity: 0,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          clearProps: "all"
      });

      ScrollTrigger.batch(".gsap-stagger-card", {
          onEnter: (batch: any) => gsap.from(batch, {
              y: 40,
              opacity: 0,
              duration: 0.8,
              stagger: 0.2,
              ease: "power2.out"
          }),
          once: true
      });

      let lastEmit = 0;
      const emitInterval = 120;
      const template = document.getElementById('lotus-template')?.firstElementChild;
      
      const onMouseMoveTrail = (e: MouseEvent) => {
          if (!template) return;
          const now = Date.now();
          if (now - lastEmit < emitInterval) return;
          lastEmit = now;

          const lotus = template.cloneNode(true) as HTMLElement;
          lotus.classList.add('lotus-trail');
          lotus.style.left = `${e.clientX}px`;
          lotus.style.top = `${e.clientY}px`;
          lotus.style.transform = 'translate(-50%, -50%) scale(0.5)';
          
          document.body.appendChild(lotus);

          gsap.to(lotus, {
              y: -40,
              scale: 1.2,
              opacity: 0,
              duration: 1.2,
              ease: "power2.out",
              onComplete: () => {
                  if (lotus.parentNode) lotus.remove();
              }
          });
      };
      window.addEventListener('mousemove', onMouseMoveTrail, { passive: true });

      return () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mousemove', onMouseMoveTrail);
        cancelAnimationFrame(reqId);
        renderer.dispose();
      };
    };

    const timer = setTimeout(init3D, 500); // Give scripts time to load
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <canvas id="canvas3d" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}></canvas>
      
      <main className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden">
        {/* Hero Section */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 pt-10">
            <div className="gsap-reveal overflow-hidden">
                <span className="font-devanagari text-display-lg text-primary block mb-4">॥ ज्ञानं परमं बलम् ॥</span>
            </div>
            <h1 className="gsap-reveal font-cinzel text-[60px] md:text-[100px] font-black tracking-tighter text-primary gold-glow leading-none mb-6">
                ASHRAMA
            </h1>
            <p className="gsap-reveal font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-12 italic">
                A bridge between ancient Sanskrit manuscripts and neural intelligence. Seek clarity from the depths of Vedic wisdom, distilled through time.
            </p>
        </section>

        {/* Process Section */}
        <section className="py-section-gap px-margin-desktop bg-black/40">
            <div className="text-center mb-16">
                <span className="font-label-md text-label-md text-primary uppercase tracking-widest">Process</span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mt-2 font-cinzel">Sacred Methodology</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 max-w-container-max mx-auto">
                <div className="carved-stone p-10 flex flex-col items-center text-center gsap-stagger-card bg-[#0A0D14]/80">
                    <div className="w-16 h-16 rounded-full border border-primary flex items-center justify-center text-primary mb-8 bg-[#151A24]">
                        <span className="material-symbols-outlined text-4xl">auto_stories</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-4 font-cinzel">Ingest</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">Digitizing fragmented palm-leaf manuscripts using advanced parsing to recover lost verses from the ages.</p>
                </div>
                <div className="carved-stone p-10 flex flex-col items-center text-center gsap-stagger-card bg-[#0A0D14]/80">
                    <div className="w-16 h-16 rounded-full border border-primary flex items-center justify-center text-primary mb-8 bg-[#151A24]">
                        <span className="material-symbols-outlined text-4xl">psychology</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-4 font-cinzel">Understand</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">Neural parsing of Sanskrit grammar and contextual philosophy to preserve the original essence of the teachings.</p>
                </div>
                <div className="carved-stone p-10 flex flex-col items-center text-center gsap-stagger-card bg-[#0A0D14]/80">
                    <div className="w-16 h-16 rounded-full border border-primary flex items-center justify-center text-primary mb-8 bg-[#151A24]">
                        <span className="material-symbols-outlined text-4xl">history_edu</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-4 font-cinzel">Answer</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant italic">Providing guidance on health, ethics, and spirituality by synthesizing thousands of classical texts instantly.</p>
                </div>
            </div>
        </section>

        {/* Domains Scrolling Strip */}
        <section className="py-20 bg-surface-container-low overflow-hidden">
            <div className="scrolling-strip">
                <div className="palm-leaf font-label-md">Ayurveda</div>
                <div className="palm-leaf font-label-md">Yoga Sutras</div>
                <div className="palm-leaf font-label-md">Vastu Shastra</div>
                <div className="palm-leaf font-label-md">Jyotisha</div>
                <div className="palm-leaf font-label-md">Upanishads</div>
                <div className="palm-leaf font-label-md">Rig Veda</div>
                <div className="palm-leaf font-label-md">Arthashastra</div>
                <div className="palm-leaf font-label-md">Samkhya</div>
                {/* Duplicate for loop */}
                <div className="palm-leaf font-label-md">Ayurveda</div>
                <div className="palm-leaf font-label-md">Yoga Sutras</div>
                <div className="palm-leaf font-label-md">Vastu Shastra</div>
                <div className="palm-leaf font-label-md">Jyotisha</div>
                <div className="palm-leaf font-label-md">Upanishads</div>
                <div className="palm-leaf font-label-md">Rig Veda</div>
                <div className="palm-leaf font-label-md">Arthashastra</div>
                <div className="palm-leaf font-label-md">Samkhya</div>
            </div>
        </section>

        <footer className="w-full py-10 flex flex-col items-center gap-unit text-center">
            <p className="font-caption text-caption italic text-tertiary">
                © MMXXIV AI Vaidya — Om Shanti Shanti Shanti
            </p>
        </footer>
      </main>

      {/* Templates */}
      <div id="lotus-template" className="hidden">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary fill-current drop-shadow-[0_0_8px_rgba(255,183,126,0.8)]" xmlns="http://www.w3.org/2000/svg">
            <path d="M12,22C12,22 10,20 10,18C10,16 12,14 12,14C12,14 14,16 14,18C14,20 12,22 12,22M12,12C12,12 15,11 17,9C19,7 19,4 19,4C19,4 16,4 14,6C12,8 12,11 12,11C12,11 12,8 10,6C8,4 5,4 5,4C5,4 5,7 7,9C9,11 12,12 12,12M12,13C12,13 8,13 5,16C2,19 2,21 2,21C2,21 4,21 7,18C10,15 12,13 12,13M12,13C12,13 16,13 19,16C22,19 22,21 22,21C22,21 20,21 17,18C14,15 12,13 12,13Z" />
        </svg>
      </div>
    </>
  );
}
