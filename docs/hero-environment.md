# Fondo del Hero: canal de agua azul

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
- `src/scripts/webgl/hero/environment.ts`: Water, montañas, luz, cielo, niebla
  y entorno PMREM para las superficies de cristal.
- `src/scripts/webgl/hero/microservices.ts`: tres placas, circuitos luminosos
  y PointLight central cian.
- `src/scripts/webgl/hero/particles.ts`: Points animados en GPU sobre el agua.
- `public/assets/hero/waternormals.jpg`: textura local; no se solicita a un CDN
  durante la visita.

## Cómo se construye la imagen

1. El cielo tiene un gradiente azul nocturno y una aureola detrás del objeto.
   `FogExp2` mezcla las montañas lejanas con ese horizonte. Dos cordilleras por
   lado se generan con geometría deformada y ruido de varias escalas.
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
del frame rate. Las placas rotan lentamente y flotan con seno. Se limita el DPR
y el total de píxeles; la reflexión usa 512px en móvil y 1024px en escritorio.

Se pausa al salir del Hero o al ocultar la pestaña. Con movimiento reducido se
renderiza una imagen estática y se actualiza sólo al cambiar tamaño/preferencia.
ResizeObserver y `resize` actualizan cámara, canvas, partículas, reflexión y
composer. `destroy()` cancela RAF, desconecta observers/listeners y libera
geometrías, materiales, textura normal, PMREM, reflexión y pases de postprocesado.
El módulo se importa dinámicamente sin bloquear la entrada de los textos; si
WebGL o la textura fallan, se conserva el fondo CSS y la UI sigue disponible.

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
- La imagen proporcionada dirige composición y luz. Las montañas, materiales y
  cámara se reconstruyen proceduralmente: no son los assets originales de la
  referencia ni una garantía de equivalencia píxel a píxel.
