# Fondo del Hero: océano azul abierto

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
- `src/scripts/webgl/hero/environment.ts`: Water, luz, cielo, horizonte abierto
  y entorno PMREM para las superficies de cristal.
- `src/scripts/webgl/hero/microservices.ts`: cuatro placas, circuitos luminosos
  y PointLight central cian.
- `src/scripts/webgl/hero/particles.ts`: Points animados en GPU sobre el agua.
- `src/scripts/home/heroScrollCue.ts`: aviso bilingüe con fade-out por scroll
  nativo a partir de 4px y limpieza de listeners; reaparece al volver al inicio.
- `public/assets/hero/waternormals.jpg`: textura local; no se solicita a un CDN
  durante la visita.

## Cómo se construye la imagen

1. El cielo tiene un gradiente azul nocturno y una aureola detrás del objeto.
   `FogExp2(0x040d20, 0.028)` desvanece el océano de 1200 × 1200 unidades.
   No hay montañas ni geometrías laterales; el cielo comparte el color de niebla.
2. Las placas usan `MeshPhysicalMaterial`, transmisión 0.94, rugosidad 0.07,
   IOR 1.46 y grosor óptico 0.6. La transparencia se obtiene mediante transmisión
   física; `opacity` permanece en 1 para conservar reflejos y evitar problemas
   de ordenación por alpha. El entorno PMREM aporta reflejos azul/cian.
3. Las caras internas y circuitos emiten radiancia HDR; no dependen sólo de una
   luz puntual. El PointLight central ilumina la geometría cercana.
4. Water renderiza una cámara reflejada en una textura. Su shader combina ese
   reflejo con Fresnel y la textura de normales repetida, movida lentamente por
   su uniforme `time`. Se ajustan la amplitud de la normal y la dispersión azul
   cerca del núcleo conservando el cálculo de reflexión de Water. La superficie
   base de Water es geométricamente plana, pero su apariencia NO es un espejo
   liso: las olas pequeñas se simulan con normales animadas y distorsión.
5. `RenderPass → UnrealBloomPass → OutputPass` conserva luces HDR hasta el bloom.
   OutputPass aplica ACES y conversión final a sRGB, una sola vez. El postprocesado
   sólo afecta al canvas; jamás desenfoca el texto HTML.

## Movimiento, rendimiento y limpieza

La cámara panea y cambia la inclinación con `mousemove` y damping independiente
del frame rate. Su altura base es 0.85, con desplazamiento lateral de ±1.9 y
vertical de ±0.45 unidades, sin atravesar el agua. Mira ligeramente hacia arriba.
El grupo está en Z=-2, escala 1.28 en escritorio y ajuste por aspecto en móvil;
rota a 0.045 rad/s y flota con seno. Se limita el DPR
y el total de píxeles; la reflexión usa 512px en móvil y 1024px en escritorio.

Se pausa al salir del Hero o al ocultar la pestaña. Con movimiento reducido se
renderiza una imagen estática y se actualiza sólo al cambiar tamaño/preferencia.
ResizeObserver y `resize` actualizan cámara, canvas, partículas, reflexión y
composer. `destroy()` cancela RAF, desconecta observers/listeners y libera
geometrías, materiales, textura normal, PMREM, reflexión y pases de postprocesado.
El módulo se importa dinámicamente sin bloquear la entrada de los textos; si
WebGL o la textura fallan, se conserva el fondo CSS y la UI sigue disponible.

## Interfaz

El título usa `clamp(2rem, 4.2vw, 4.5rem)` y queda en la zona inferior, sin
parallax DOM, para despejar las placas. Una viñeta oscurece suavemente la zona
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
npm run build
```

Astro build transpila TypeScript, pero no sustituye la comprobación de tipos.
El `tsc` anterior valida los módulos TypeScript; no hace una auditoría completa
de las plantillas `.astro`.

## Referencias

- https://threejs.org/docs/pages/Water.html
- https://threejs.org/docs/pages/UnrealBloomPass.html
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- La imagen proporcionada dirige luz y materiales. El océano abierto sustituye
  las montañas según la última iteración. No son los assets originales de la
  referencia ni una garantía de equivalencia píxel a píxel.
