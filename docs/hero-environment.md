# Fondo del Hero: océano digital y monolito de circuitos

La implementación utiliza Astro con scripts de cliente TypeScript. El nombre,
subtítulo, traducciones y navegación continúan en el DOM. El canvas está dentro
de `.hero__environment`: `position: absolute; top: 0; left: 0; z-index: -1`,
100% del Hero de altura mínima 100vh, sin capturar eventos de ratón.

## Dependencias e imports

`three` y `@types/three` ya están instalados. Los addons NO son paquetes npm
separados y no requieren React, React Three Fiber ni una integración de Astro.

```ts
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

## Módulos

- `src/scripts/webgl/heroScene.ts`: carga de normales, cámara, postprocesado,
  tamaños, bucle y ciclo de vida.
- `src/scripts/webgl/hero/cameraRig.ts`: encuadre y respuesta amortiguada al ratón.
- `src/scripts/webgl/hero/environment.ts`: Water, luz, cielo, horizonte abierto
  y entorno PMREM con reflejos cian/púrpura.
- `src/scripts/webgl/hero/monolith.ts`: BoxGeometry biselada, material físico,
  remates, luces y animación de flotación, giro y respiración.
- `src/scripts/webgl/hero/circuitMaterial.ts`: circuitos procedurales sobre el
  shader físico, con trazos, nodos, microchip y paquetes de datos móviles.
- `src/scripts/webgl/hero/distantPillars.ts`: seis columnas lejanas y luces
  de estado instanciadas, con alturas y pulsos diferentes.
- `src/scripts/webgl/hero/particles.ts`: luciérnagas ascendentes animadas en GPU.
- `src/scripts/home/heroScrollCue.ts`: aviso bilingüe con fade-out por scroll
  nativo a partir de 4px y limpieza de listeners; reaparece al volver al inicio.
- `public/assets/hero/waternormals.jpg`: textura local; no se solicita a un CDN
  durante la visita.

## Integración en Astro

Ya está conectado: `Hero.astro` declara el canvas y `homeAnimations.ts` carga
`initHeroScene(canvas)` mediante import dinámico en el navegador. No añadas un
segundo inicializador ni una isla React. El controlador devuelto expone
`destroy()` y se integra con la limpieza de la página existente.

Para ajustar el resultado, las dimensiones y flotación están en `MONOLITH`, el
material y los trazos en `circuitMaterial.ts`, los extremos de cámara en
`HERO_CAMERA`, y bloom/niebla en `heroScene.ts`. No se añaden dependencias npm.

## Cómo se construye la imagen

1. El cielo tiene un gradiente azul nocturno y una aureola detrás del objeto.
   `FogExp2(0x030a1b, 0.03)` desvanece el océano de 1200 × 1200 unidades.
   El cielo comparte el color de niebla. Se conserva el horizonte sin montañas.
2. El monolito es una BoxGeometry de 3.2 × 5.2 × 2.2 unidades, con bisel de
   0.045. Su `MeshPhysicalMaterial` es opaco, azul casi negro, metalness 0.78,
   roughness 0.2 y clearcoat 1. El entorno PMREM aporta reflejos cian/púrpura
   sobre la superficie oscura, sin una pasada adicional de transmisión.
3. `onBeforeCompile` añade circuitos a la emisión del material físico, conservando
   iluminación, reflejos y niebla. Las líneas se suavizan con derivadas `fwidth`.
   No requiere imágenes de circuitos, descargas externas ni texturas por frame.
   Pequeños paquetes recorren los trazos; `emissiveIntensity = 2.7 + sin(t*0.85)*0.55`
   simula una respiración de unos 7.4 segundos. Las luces físicas acompañan el pulso.
4. Water renderiza una cámara reflejada en una textura. Su shader combina ese
   reflejo con Fresnel y la textura de normales repetida, movida lentamente por
   su uniforme `time`. Se ajustan la amplitud de la normal y la dispersión azul
   cerca del núcleo conservando el cálculo de reflexión de Water. La superficie
   base de Water es geométricamente plana, pero su apariencia NO es un espejo
   liso: las olas pequeñas se simulan con normales animadas y distorsión.
5. Seis pilares se distribuyen en los laterales, desde Z=-30 hasta aproximadamente
   Z=-63, con alturas entre 11 y 24. La distribución pseudoaleatoria es estable
   entre visitas. La niebla los oculta progresivamente y su emisión es muy tenue.
   Sus 42 luces de estado se dibujan con un solo InstancedMesh.
6. Las 360 partículas nacen a Y=0.055. Un ciclo de vida GPU de 17–29 segundos
   las eleva entre 2.6 y 5.4 unidades, con deriva horizontal suave. El alpha crece
   desde cero al nacer y vuelve a cero antes de reiniciar el ciclo. También se
   atenúan con la distancia, en consonancia con la niebla del entorno.
7. `RenderPass → UnrealBloomPass → OutputPass` conserva luces HDR hasta el bloom.
   Bloom usa intensidad 0.85, radio 0.6 y umbral 0.85; MSAA suaviza los circuitos.
   OutputPass aplica ACES y conversión final a sRGB, una sola vez. El postprocesado
   sólo afecta al canvas; jamás desenfoca el texto HTML.

## Movimiento, rendimiento y limpieza

La cámara combina desplazamiento e inclinación con `mousemove`: ratón arriba,
pitch -1° y ojo Y=1.45; ratón abajo, pitch +11° y ojo Y=0.65. El horizonte
pasa aproximadamente del 48% al 75% de altura en escritorio. Se conserva la
distancia al objeto para evitar un efecto de zoom. No se usa `lookAt` para
recentrar el monolito: el cambio de encuadre debe ser visible, igual que en las
referencias. La posición central se recupera suavemente al salir del Hero.

Un muelle críticamente amortiguado (ω=3.2) tarda alrededor de 1.5s en completar
el 95% del recorrido, con velocidad continua y sin rebotes ante una entrada
constante. Su solución es independiente del frame rate. El movimiento lateral
combina ±1.6 unidades y ±4.5° de yaw, limitado según el aspecto en retrato.
La cámara permanece siempre por encima del agua.

El grupo está en Z=-2, centro Y=3.65, escala 0.94 en escritorio y ajuste por
aspecto en móvil/tableta; rota a 0.026 rad/s y flota ±0.12 con seno. Se limita el DPR
y el total de píxeles; la reflexión usa 512px en móvil y 1024px en escritorio.

Se pausa al salir del Hero o al ocultar la pestaña. Con movimiento reducido se
renderiza una imagen estática y se actualiza sólo al cambiar tamaño/preferencia.
ResizeObserver y `resize` actualizan cámara, canvas, partículas, reflexión y
composer. `destroy()` cancela RAF, desconecta observers/listeners y libera
geometrías, materiales, buffers de instancias, textura normal, PMREM, reflexión
y pases de postprocesado. Los módulos de objetos no crean bucles o listeners propios.
El módulo se importa dinámicamente sin bloquear la entrada de los textos; si
WebGL o la textura fallan, se conserva el fondo CSS y la UI sigue disponible.

## Interfaz

El título usa `clamp(2rem, 4.2vw, 4.5rem)` y queda en la zona inferior, sin
parallax DOM, para despejar el monolito. Una viñeta oscurece suavemente la zona
del texto sobre los reflejos. El aviso está en `bottom: 5%`; respeta movimiento
reducido. La marca, viñeta y etiqueta lateral usan un color estático
`rgba(213, 224, 255, 0.85)`, independiente del ciclo de color global.

La navegación se alinea a la derecha junto al idioma; en móvil ocupa una fila
propia (rejilla de tres columnas en pantallas pequeñas). Los controles tienen
altura mínima de 44px y foco visible. La navegación fija sincroniza `inert` y
`aria-hidden` con su visibilidad.

## Verificación

```sh
npx tsc --noEmit -p tsconfig.json
node --experimental-strip-types --test tests/hero-camera.test.mjs tests/hero-environment.test.mjs
npm run build
```

Astro build transpila TypeScript, pero no sustituye la comprobación de tipos.
El `tsc` anterior valida los módulos TypeScript; no hace una auditoría completa
de las plantillas `.astro`.
Las pruebas de cámara comprueban el recorrido vertical, amortiguación a
30/60/144 FPS, movimiento reducido y encuadre en las cuatro esquinas del ratón
con cinco relaciones de aspecto y una vuelta completa del monolito. Las pruebas
del entorno validan flotación, pulsación, inyección del shader físico, distancia
de los pilares y animación GPU de las partículas. Es necesario revisar también
la compilación GLSL y el aspecto en un navegador con WebGL.

## Referencias

- https://threejs.org/docs/pages/Water.html
- https://threejs.org/docs/pages/UnrealBloomPass.html
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- La imagen proporcionada dirige luz y materiales. El océano abierto sustituye
  las montañas según la última iteración. No son los assets originales de la
  referencia ni una garantía de equivalencia píxel a píxel.
