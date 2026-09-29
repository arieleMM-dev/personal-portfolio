# Fondo del Hero: océano digital y cubo de video instanciado

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
- `src/scripts/webgl/hero/videoCube.ts`: envolvente de 2.168 mini-cubos y luz central.
- `src/scripts/webgl/hero/videoProjectionMaterial.ts`: material físico y GLSL de
  proyección global, filtro azul y deformación de vértices.
- `src/scripts/webgl/hero/videoCubeInteraction.ts`: raycaster/caja y resortes.
- `src/scripts/webgl/hero/videoSource.ts`: selección de video, reproducción y limpieza.
- `src/scripts/webgl/hero/heartbeat.ts`: pulso global y crestas del latido.
- `src/scripts/webgl/hero/cityscape.ts`: 84 torres de escalas/profundidades variadas,
  venas luminosas y rayos ascendentes, en dos InstancedMesh.
- `src/scripts/webgl/hero/towerBursts.ts`: selección aleatoria y programación de
  disparos, envolvente compartida CPU/GLSL y control de movimiento reducido.
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

Para ajustar el resultado, las dimensiones y flotación están en `VIDEO_CUBE`, el
material y la proyección en `videoProjectionMaterial.ts`, los extremos de cámara en
`HERO_CAMERA`, bloom en `heroScene.ts` y color/densidad de niebla en
`HERO_PALETTE`. No se añaden dependencias npm.

La implementación del video, sus shaders y las dos vistas de comparación se
explican en [hero-video-projection.md](./hero-video-projection.md).

## Cómo se construye la imagen

1. El cielo tiene un gradiente azul nocturno y una aureola detrás del objeto.
   `FogExp2(0x061329, 0.0065)` desvanece el océano de 1200 × 1200 unidades.
   La densidad permite distinguir la primera fila de edificios y oculta las
   posteriores. El cielo coincide con el color de niebla en el horizonte.
   No hay montañas, tonos púrpura ni luces magenta en la escena WebGL.
2. El objeto central es una envolvente cúbica de 3.2 unidades: 20³ − 18³ = 2.168
   instancias exteriores, sin celdas interiores ocultas. Comparten BoxGeometry,
   MeshPhysicalMaterial y VideoTexture. El 9% de separación permite distinguir
   la rejilla. Transmission 0.18, opacity 1, thickness 0.2, IOR 1.3, roughness
   0.24, metalness 0.08 y clearcoat 0.55 equilibran cristal y legibilidad del video.
3. `onBeforeCompile` proyecta el video por coordenadas locales del cubo completo,
   anteriores a la deformación. Cada cara mayor contiene un mosaico continuo:
   ningún mini-cubo repite por sí solo el fotograma entero. Un filtro azul/cian
   en espacio lineal conserva el detalle. Raycaster + Box3 local alimentan un
   campo de atracción con resortes; el vertex shader mueve las instancias hacia
   la cámara. No se suben matrices por frame. Se conservan PMREM, transmisión,
   luces físicas, niebla y PointLight central sincronizado con el entorno.
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
   La dispersión cercana al monolito y su aureola siguen suavemente el pulso global.
5. La ciudad utiliza una BoxGeometry y un MeshStandardMaterial azul pizarra
   (`0x152b45`) compartidos por 84 instancias. Math.random crea tres bandas de
   profundidad: Z=-55…-110, -125…-205 y -225…-315. Las alturas van de 4 a 68,
   los anchos de 1.1 a 12.1 y los grosores de 1.5 a 13.5. Las torres cercanas
   tienen una altura máxima menor, para no dominar el encuadre. Un corredor
   angular libre protege el monolito durante el parallax. Las matrices se
   cargan una sola vez. Las pruebas pueden inyectar un generador reproducible.
   El shader añade venas y pequeños píxeles emisivos tenues a las fachadas.
   Una segunda malla instanciada dibuja rayos cilíndricos finos desde las azoteas;
   se oculta por completo cuando no hay eventos. Hay una llamada de dibujo por
   malla y pasada, también en la reflexión y la captura de transmisión.
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
   Bloom usa intensidad 0.6, radio 0.6 y umbral 1.05; MSAA suaviza el pixelado.
   OutputPass aplica ACES y conversión final a sRGB, una sola vez. El postprocesado
   sólo afecta al canvas; jamás desenfoca el texto HTML.

## Latido y disparos individuales

`getHeartbeat(t) = 0.5 + 0.5 * sin(t * 2π / 6.4)` se calcula una vez por frame.
El material usa `emissiveIntensity = 1.0 + pulse * 0.25`, y el PointLight central
`intensity = 9 + pulse * 9`: ambos alcanzan máximos y mínimos simultáneamente.
El agua, la aureola y los acentos urbanos reciben ese mismo valor, sin relojes
independientes que puedan desincronizarse.

El programador elige una torre visible en el encuadre principal, evita repetirla
inmediatamente y sortea una pausa de 4.5–8.5 segundos. El inicio se alinea a la
siguiente cresta del corazón (separación efectiva de 6.4 o 12.8 segundos). No se
utiliza una probabilidad por frame. La envolvente sube en 0.32s, empieza a
apagarse a 0.6s y vuelve a cero a 2.4s. El límite de seguridad es dos eventos
simultáneos; la cadencia normal deja un solo disparo activo.

La torre y su rayo comparten el atributo instanciado `aBurstStart`. Sólo se sube
ese pequeño buffer al lanzar/cancelar un evento; el shader calcula el destello
y el tramo de luz que asciende. No se crean geometrías, materiales ni luces por
disparo. Los colores se limitan a la paleta azul/cian compartida. Al activar
movimiento reducido se cancelan los eventos; al reanudar no se reproducen los
disparos anteriores ni se lanzan varios para compensar el tiempo transcurrido.

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
aspecto en móvil/tableta; rota a 0.041 rad/s (antes 0.026) y flota ±0.12 con seno. Se limita el DPR
y el total de píxeles; la reflexión usa 512px en móvil y 1024px en escritorio.
La captura de transmisión usa una escala de resolución 0.5 en móvil y 0.75
en escritorio. Water reutiliza su reflexión entre la pasada de transmisión y
la pasada principal de un mismo frame, para evitar renderizarla dos veces.

Se pausa al salir del Hero o al ocultar la pestaña. Con movimiento reducido se
renderiza una imagen estática y se actualiza sólo al cambiar tamaño/preferencia.
ResizeObserver y `resize` actualizan cámara, canvas, partículas, reflexión y
composer. `destroy()` cancela RAF, desconecta observers/listeners y libera
geometrías, materiales, buffers de instancias, textura normal, PMREM, reflexión
y pases de postprocesado. `videoSource.dispose()` pausa y descarga el medio,
libera VideoTexture y retira el elemento oculto y sus listeners. El video también
se pausa fuera del Hero, en segundo plano y con movimiento reducido.
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
node --experimental-strip-types --test tests/hero-camera.test.mjs tests/hero-environment.test.mjs tests/hero-video.test.mjs
npm run build
```

Astro build transpila TypeScript, pero no sustituye la comprobación de tipos.
El `tsc` anterior valida los módulos TypeScript; no hace una auditoría completa
de las plantillas `.astro`.
Las pruebas de cámara comprueban el recorrido vertical, amortiguación a
30/60/144 FPS, movimiento reducido y encuadre en las cuatro esquinas del ratón
con cinco relaciones de aspecto y una vuelta completa del monolito. Las pruebas
del entorno validan flotación, latido sincronizado, material transmisivo, paleta azul,
dirección/radiancia de la luz rasante, variabilidad y separación de las torres,
niebla por altura, buffers compartidos, cadencia independiente de FPS,
cancelación de disparos y animación GPU de las partículas. Las pruebas de video
comprueban las 2.168 celdas, UV vecinas, límites de deformación, raycast transformado,
resortes, selección local y reproducción/limpieza con un medio simulado. Es necesario revisar también
la compilación GLSL y el aspecto en un navegador con WebGL.

## Referencias

- https://threejs.org/docs/pages/Water.html
- https://threejs.org/docs/pages/UnrealBloomPass.html
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- https://threejs.org/docs/pages/InstancedMesh.html
- https://threejs.org/docs/pages/PointsMaterial.html
- La imagen proporcionada dirige luz y materiales. El océano abierto sustituye
  las montañas según la última iteración. No son los assets originales de la
  referencia ni una garantía de equivalencia píxel a píxel.
