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
  y entorno PMREM con reflejos exclusivamente azules/cian.
- `src/scripts/webgl/hero/palette.ts`: colores compartidos y densidad de niebla.
- `src/scripts/webgl/hero/monolith.ts`: BoxGeometry biselada, material estándar PBR,
  remates, luces y animación de flotación, giro y respiración.
- `src/scripts/webgl/hero/circuitMaterial.ts`: circuitos procedurales sobre el
  shader físico, con trazos, nodos, microchip y paquetes de datos móviles.
- `src/scripts/webgl/hero/cityscape.ts`: 84 edificios en un InstancedMesh estático,
  con niebla por distancia y altura; sustituye al antiguo `distantPillars.ts`.
- `src/scripts/webgl/hero/particles.ts`: PointsMaterial azul con ascenso y alpha
  por partícula calculados en GPU.
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
`HERO_CAMERA`, bloom en `heroScene.ts` y color/densidad de niebla en
`HERO_PALETTE`. No se añaden dependencias npm.

## Cómo se construye la imagen

1. El cielo tiene un gradiente azul nocturno y una aureola detrás del objeto.
   `FogExp2(0x061329, 0.0065)` desvanece el océano de 1200 × 1200 unidades.
   La densidad permite distinguir la primera fila de edificios y oculta las
   posteriores. El cielo coincide con el color de niebla en el horizonte.
   No hay montañas, tonos púrpura ni luces magenta en la escena WebGL.
2. El monolito es una BoxGeometry de 3.2 × 5.2 × 2.2 unidades, con bisel de
   0.045. Su `MeshStandardMaterial` es negro obsidiana (`0x030609`), metalness
   0.12 y roughness 0.34: reflejos suaves sin aspecto cromado, clearcoat ni
   transmisión. El entorno PMREM aporta reflejos azul/cian. Las luces puntuales
   están separadas de las caras para no producir zonas sobreexpuestas.
3. `onBeforeCompile` añade una máscara escalar de circuitos a la emisión PBR,
   cuyo único color procede de `material.emissive = 0x00baff`, conservando
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
   Un AmbientLight azul de intensidad 0.18 rellena tenuemente las sombras.
   El DirectionalLight cian está en (-6, 6, -48), apunta a (0, 0, -4), con una
   elevación de unos 7.7° e intensidad 2.4. Water no obtiene su brillo solar
   automáticamente de esa luz: `createOceanLighting` calcula el mismo vector
   hacia la fuente y su radiancia para `sunDirection` y `sunColor`. Así las
   normales animadas producen reflejos especulares rasantes reales del shader.
5. La ciudad utiliza una BoxGeometry y un MeshStandardMaterial azul pizarra
   (`0x152b45`) compartidos por 84 instancias en tres filas. Las alturas varían
   aproximadamente entre 5 y 22, y las posiciones están entre Z=-165 y Z=-295.
   Las transformaciones pseudoaleatorias son reproducibles y se cargan una vez.
   Hay una llamada de dibujo por vista para toda la ciudad (otra en la reflexión).
   `FogExp2` aporta distancia; un añadido al shader mezcla el color de niebla
   con mayor intensidad cerca de Y=0 y menos hacia las azoteas. Es una
   aproximación económica de niebla baja, no una simulación volumétrica. Usa
   coordenadas mundiales con `instanceMatrix`, también en la cámara reflejada.
6. Las 360 partículas nacen a Y=0.055. Un ciclo de vida GPU de 17–29 segundos
   las eleva entre 2.6 y 5.4 unidades, con deriva horizontal suave. El alpha crece
   desde cero al nacer y vuelve a cero antes de reiniciar el ciclo. También se
   atenúan con la distancia, en consonancia con la niebla del entorno. Se usa
   `PointsMaterial({ color: 0x00aaff })` con mezcla aditiva y `depthWrite: false`.
   Su shader amplía el ciclo de vida mediante `onBeforeCompile`, sin cambiar el
   tono RGB ni subir posiciones desde CPU cada frame. La niebla afecta al alpha
   para evitar que sprites aditivos aporten cuadrados del color de la niebla.
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
del entorno validan flotación, pulsación, material estándar, paleta azul,
dirección/radiancia de la luz rasante, instanciamiento y lejanía de la ciudad,
niebla por altura y animación GPU de las partículas. Es necesario revisar también
la compilación GLSL y el aspecto en un navegador con WebGL.

## Referencias

- https://threejs.org/docs/pages/Water.html
- https://threejs.org/docs/pages/UnrealBloomPass.html
- https://threejs.org/docs/pages/MeshStandardMaterial.html
- https://threejs.org/docs/pages/InstancedMesh.html
- https://threejs.org/docs/pages/PointsMaterial.html
- La imagen proporcionada dirige luz y materiales. El océano abierto sustituye
  las montañas según la última iteración. No son los assets originales de la
  referencia ni una garantía de equivalencia píxel a píxel.
