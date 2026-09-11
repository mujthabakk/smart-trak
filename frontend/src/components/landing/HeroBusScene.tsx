import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Float, useFBX, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import busModelUrl from '@/assets/school+bus+1st.fbx?url'

/** Raw scroll position, read straight off `window` in a ref (never React
 * state) — this feeds a per-frame rotation inside the Canvas, and a state
 * update on every scroll event would re-render the whole scene 60+ times a
 * second for nothing. */
function useScrollRef() {
  const ref = useRef(0)
  useEffect(() => {
    const onScroll = () => { ref.current = window.scrollY }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return ref
}

const FALLBACK_COLORS = { primary: '#4b1e99', secondary: '#ffc41f', background: '#f3f2f7', foreground: '#2b3143' }

function readThemeColors() {
  if (typeof window === 'undefined') return FALLBACK_COLORS
  const styles = getComputedStyle(document.documentElement)
  const get = (name: keyof typeof FALLBACK_COLORS) => styles.getPropertyValue(`--${name}`).trim() || FALLBACK_COLORS[name]
  return { primary: get('primary'), secondary: get('secondary'), background: get('background'), foreground: get('foreground') }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function GpsPing({ color, active, height }: { color: string; active: boolean; height: number }) {
  const ring = useRef<THREE.Mesh>(null)
  const dot = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!active) return
    const t = (clock.elapsedTime % 2) / 2
    if (ring.current) {
      const s = 0.15 + t * 0.9
      ring.current.scale.setScalar(s)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 1 - t
    }
    if (dot.current) dot.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.08)
  })
  return (
    <group position={[0, height, 0.1]}>
      <mesh ref={dot}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.14, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/**
 * Loads the school+bus+1st.fbx model (an ~8.7MB Maya export — 3 body
 * meshes + 4 separately-named "Wheel_*" meshes, no textures, just flat
 * per-material colors) instead of the old hand-built primitive bus.
 *
 * The export's units/pivot don't line up with this scene at all (its
 * bounding box is ~108x131x397 units, off-center from its own origin),
 * so scale/recentring is computed from the model's own bounding box
 * rather than hardcoded — robust to a re-export with slightly different
 * dimensions. Target length of 3.6 matches the old procedural bus so the
 * camera/route-ring framing didn't need to change.
 *
 * Left the model's original materials untouched: several submeshes share
 * multiple generic-named material slots (lambert1-4, phong2, Tire,
 * PBR_Material) with no naming that reliably identifies which one is the
 * body shell vs. trim/underbody/tail-lights, so recoloring the wrong slot
 * to the theme color risked turning e.g. the taillights or tires yellow.
 */
const MAX_WHEELS = 4
const WHEEL_SPIN_SPEED = 3.2

function BusModel({ colors, motion }: { colors: ReturnType<typeof readThemeColors>; motion: boolean }) {
  const fbx = useFBX(busModelUrl)

  const { model, wheelObjects, scale, offset, gpsHeight } = useMemo(() => {
    // Clone so remounts (HMR, StrictMode) don't keep mutating the one
    // instance cached by drei's loader.
    const cloned = fbx.clone(true)

    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const targetLength = 3.6
    const s = size.z > 0 ? targetLength / size.z : 1

    const wheels: THREE.Object3D[] = []
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
      if (child.name.toLowerCase().startsWith('wheel')) wheels.push(child)
    })
    // Deterministic order across remounts (Wheel_4/5/6/7 in the export).
    wheels.sort((a, b) => a.name.localeCompare(b.name))
    // Detached and re-mounted below as their own <primitive ref={...}>
    // siblings, so each gets a real per-instance ref the same way every
    // other animated object in this file does (ScrollSpin, TrackedBlip,
    // GpsPing) — rather than reaching into the loaded model's hierarchy
    // and mutating it from outside. Their local position stays numerically
    // valid: `cloned` itself carries no transform of its own (only the
    // wrapping <group scale> below does), so its local space is identical
    // to the new parent's.
    wheels.forEach((w) => w.parent?.remove(w))

    return {
      model: cloned,
      wheelObjects: wheels,
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s] as [number, number, number],
      gpsHeight: size.y * s + 0.2,
    }
  }, [fbx])

  const wheelRefs = [
    useRef<THREE.Object3D>(null),
    useRef<THREE.Object3D>(null),
    useRef<THREE.Object3D>(null),
    useRef<THREE.Object3D>(null),
  ]

  useFrame((_, delta) => {
    if (!motion) return
    for (const ref of wheelRefs) {
      if (ref.current) ref.current.rotation.x += delta * WHEEL_SPIN_SPEED
    }
  })

  return (
    <group position={offset}>
      <group scale={scale}>
        <primitive object={model} />
        {wheelObjects.slice(0, MAX_WHEELS).map((wheel, i) => (
          <primitive key={wheel.uuid} object={wheel} ref={wheelRefs[i]} />
        ))}
      </group>
      <GpsPing color={colors.primary} active={motion} height={gpsHeight} />
    </group>
  )
}

function RouteRing({ radius, primary, muted }: { radius: number; primary: string; muted: string }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      pts.push([Math.cos(a) * radius, 0.01, Math.sin(a) * radius])
    }
    return pts
  }, [radius])

  const stops = useMemo(() => {
    const arr: { pos: [number, number, number]; hi: boolean }[] = []
    const count = 6
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      arr.push({ pos: [Math.cos(a) * radius, 0.02, Math.sin(a) * radius], hi: i % 3 === 0 })
    }
    return arr
  }, [radius])

  return (
    <group>
      <Line points={points} color={primary} lineWidth={1.4} dashed dashSize={0.14} gapSize={0.12} transparent opacity={0.55} />
      {stops.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <sphereGeometry args={[s.hi ? 0.055 : 0.035, 12, 12]} />
          <meshStandardMaterial
            color={s.hi ? primary : muted}
            emissive={s.hi ? primary : '#000000'}
            emissiveIntensity={s.hi ? 0.4 : 0}
          />
        </mesh>
      ))}
    </group>
  )
}

function TrackedBlip({ radius, color, motion }: { radius: number; color: string; motion: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const speed = motion ? 0.35 : 0
    const a = clock.elapsedTime * speed
    ref.current.position.set(Math.cos(a) * radius, 0.08, Math.sin(a) * radius)
  })
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
      <pointLight color={color} intensity={1.2} distance={1.2} />
    </group>
  )
}

/** Rotates its children around Y in step with page scroll instead of on a
 * timer — the bus turns as you scroll the page, and holds still while you
 * aren't. Damped toward the scroll-derived target each frame rather than
 * snapping straight to it, so it still reads as a smooth spin rather than
 * jittering with every scroll event. */
function ScrollSpin({ scrollRef, motion, children }: { scrollRef: React.RefObject<number>; motion: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (!group.current) return
    if (!motion) return
    const target = scrollRef.current * 0.0035
    const damping = 1 - Math.pow(0.001, delta)
    group.current.rotation.y += (target - group.current.rotation.y) * damping
  })
  return <group ref={group}>{children}</group>
}

function Scene({ colors, motion, scrollRef }: { colors: ReturnType<typeof readThemeColors>; motion: boolean; scrollRef: React.RefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 2]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight args={['#dfe6ff', colors.background, 0.4]} />

      <ScrollSpin scrollRef={scrollRef} motion={motion}>
        <Suspense fallback={null}>
          <Float speed={motion ? 1.4 : 0} floatIntensity={motion ? 0.5 : 0} rotationIntensity={motion ? 0.15 : 0}>
            <BusModel colors={colors} motion={motion} />
          </Float>
        </Suspense>

        <RouteRing radius={2.5} primary={colors.primary} muted={colors.foreground} />
        <TrackedBlip radius={2.5} color={colors.primary} motion={motion} />
      </ScrollSpin>

      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={7} blur={2.2} far={2} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.55}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

export default function HeroBusScene() {
  const [colors] = useState(readThemeColors)
  const [motion] = useState(() => !prefersReducedMotion())
  const scrollRef = useScrollRef()

  return (
    <div className="relative w-64 sm:w-80 h-64 sm:h-80 cursor-grab active:cursor-grabbing touch-none">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [3.6, 2.4, 4.2], fov: 38 }}>
        <Scene colors={colors} motion={motion} scrollRef={scrollRef} />
      </Canvas>
    </div>
  )
}
