# Hero: video projection mapping sobre un cubo instanciado

La escena conserva HTML/CSS, cámara, Water, ciudad, partículas y postprocesado.
Sólo cambia el objeto central y se añade el ciclo de vida de un video oculto.
No requiere React, GSAP adicional ni dependencias nuevas.

## Comparar los dos videos

Con el preview local en el puerto 4323:

- Video 1: http://127.0.0.1:4323/?heroVideo=video1
- Video 2: http://127.0.0.1:4323/?heroVideo=video2

Sin parámetro se utiliza **video1**, la textura acuosa elegida para el Hero,
desde su copia optimizada `public/assets/hero/video1-optimized.mp4`. Video2
continúa disponible para comparación, sin cambios. La selección está
limitada a estos dos nombres: no se aceptan URLs arbitrarias. Sólo se solicita
el archivo seleccionado; Astro respeta `import.meta.env.BASE_URL`.

Los originales de `public` se conservan intactos; no se descargan en la visita
normal. La escena solicita únicamente la copia optimizada de video1:

| Archivo | Resolución | Duración observada | Tamaño |
| --- | --- | --- | --- |
| video1.mp4 | 2560 × 1440 | 18.75 s | 31.73 MB |
| video2.mp4 | 1280 × 720 | 31.97 s | 29.03 MB |
| assets/hero/video1-optimized.mp4 | 960 × 540 | 18.75 s | 5.37 MB |

La copia optimizada ocupa 5.374.953 bytes frente a los 31.730.705 del original:
**83.06% menos**. Conserva los 450 fotogramas a 24 FPS, duración, proporción,
color BT.709 y velocidad del agua; no se recorta el clip ni se altera el filtro
del shader. Se usa H.264 High / yuv420p para compatibilidad y MP4 fast-start
(`moov` antes de `mdat`) para iniciar sin esperar la descarga completa.
La resolución 540p mantiene margen sobre el tamaño visible de las caras del
cubo y reduce también la carga del decodificador y la textura en GPU.

Compresión reproducible con FFmpeg (no es una dependencia de la aplicación):

```sh
ffmpeg -n -i public/video1.mp4 -map 0:v:0 -an -sn -dn \
  -vf "scale=960:540:flags=lanczos,setsar=1" \
  -c:v libx264 -preset slow -crf 28 -threads 4 \
  -pix_fmt yuv420p -profile:v high -level:v 3.1 -g 48 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -movflags +faststart -map_metadata -1 public/assets/hero/video1-optimized.mp4
```

`-n` protege una salida que ya exista. El clip original nunca se sobrescribe.
Los archivos originales permanecen en `public`, así que Astro también los copia
al desplegar, aunque el navegador no los descargue de forma predeterminada.

## 1. Geometría y material

`videoCube.ts` genera sólo la capa exterior de una matriz 20 × 20 × 20:
`20³ − 18³ = 2168` instancias. Comparten una BoxGeometry y un material.
Las matrices contienen únicamente la traslación; nunca se actualizan por frame.
Se conserva un PointLight central, el giro de 0.041 rad/s y la flotación ±0.12.
El tamaño 3.2 mantiene el corredor libre entre las torres en todo el parallax.

`videoProjectionMaterial.ts` amplía MeshPhysicalMaterial mediante
`onBeforeCompile`. Transmission 0.18 y clearcoat 0.55 dan una respuesta de vidrio
pulido, sin volver ilegible la imagen. Se conservan iluminación PBR, normales,
PMREM, reflexión del agua, niebla, tone mapping y salida sRGB de Three.js.
Es una envolvente de pequeños cristales, no refracción volumétrica de un bloque
macizo ni una simulación física de fluidos.

## 2. UV globales: imagen continua, no 2.168 videos repetidos

Los bloques completos de GLSL están exportados y comentados en
`videoProjectionMaterial.ts`.

El vertex shader guarda la posición ANTES de atraer cada celda:

```glsl
vec3 cellCenter = instanceMatrix[3].xyz;
vRestPosition = cellCenter + position;
vProjectionNormal = normal;
```

En el fragment shader, `macroVideoUV()` divide esa posición por el tamaño del
cubo y elige XY, ZY o XZ según la normal. Cada cara exterior contiene una imagen
continua entre mini-cubos. Las caras usan proyección de caja orientada: no es
una textura equirectangular ni promete continuidad del contenido entre las seis
aristas del cubo. En las pequeñas caras laterales de las separaciones se usa
el mismo criterio de proyección de caja.

El ajuste `cover` recorta el centro del video panorámico para llenar una cara
cuadrada sin estirar su relación de aspecto. Las UV salen de la posición de
reposo, por lo que la imagen se mantiene adherida a los fragmentos al separarse.

```glsl
vec4 videoSample = texture2D(map, macroVideoUV());
#ifdef DECODE_VIDEO_TEXTURE
  videoSample = sRGBTransferEOTF(videoSample);
#endif
```

Asignar la VideoTexture a `material.map` permite a Three habilitar la conversión
sRGB del video; no se aplica gamma dos veces. Se mezcla 88% de una gradación de
luminancia azul/cian con 12% del color original mediante `uBlueMix`. El filtro
está en GPU, no en los MP4. `projectedVideo` modula tanto diffuse como emissive;
el latido global controla `emissiveIntensity = 1 + heartbeat * 0.25`.
Mientras no haya un fotograma decodificado aparece un patrón azul estático.

## 3. Raycaster y deformación con retorno amortiguado

La UI no recibe listeners nuevos ni cambia `pointer-events`: se reutiliza el
mousemove global de la escena. Sus coordenadas Y-down se invierten para NDC.
Después de actualizar cámara, escala y rotación se transforma el rayo mediante
la inversa de `group.matrixWorld` y se intersecta una `Box3` local. No se añade
una malla invisible ni se raycastean miles de instancias cada frame.

`videoCubeInteraction.ts` suaviza el punto de contacto (`ω=10`) y la intensidad
del campo (`ω=7`) con la solución exacta de un resorte críticamente amortiguado:

```text
offset = position - target
impulse = (velocity + omega * offset) * dt
position = target + (offset + impulse) * exp(-omega * dt)
velocity = (velocity - omega * impulse) * exp(-omega * dt)
```

El vertex shader calcula la influencia individual de cada mini-cubo:

```glsl
float influence = 1.0 - smoothstep(0.0, uRadius, distance(cellCenter, uMouse));
influence *= influence;
float attraction = influence * uAttraction;
vec3 towardCamera = normalize(uCameraLocal - cellCenter);
transformed = position * (1.0 + attraction * 0.16)
  + towardCamera * attraction * uDisplacement;
```

Radio 1.25 y desplazamiento máximo 0.85 unidades locales. Al salir del objeto,
el objetivo de intensidad vuelve a cero y el campo se relaja con el resorte.
Es un **campo compartido amortiguado**, no un solver de colisiones ni un resorte
independiente almacenado por cada voxel. Conserva velocidad continua y respuesta
consistente a 30/60/144 FPS con sólo unos pocos uniforms. El desplazamiento
apunta hacia la cámara real, no siempre a +Z; sigue funcionando tras rotar 180°.
Las cotas de culling incluyen la deformación máxima, también en el reflejo.

## 4. Autoplay silenciado y limpieza

`videoSource.ts` crea el medio sólo en el navegador:

```ts
video.muted = true;
video.defaultMuted = true;
video.loop = true;
video.playsInline = true;
video.setAttribute('muted', '');
video.setAttribute('playsinline', '');
const texture = new THREE.VideoTexture(video);
texture.colorSpace = THREE.SRGBColorSpace;
texture.generateMipmaps = false;
```

Se inicia automáticamente con `video.play()` cuando la escena está visible y
no se solicita movimiento reducido. No se depende del atributo `autoplay`,
porque podría iniciar reproducción cuando el Hero debería estar pausado.
`play()` devuelve una promesa: si el navegador rechaza la reproducción, se
captura el rechazo y se reintenta con el siguiente pointerdown o keydown.
El contenido HTML permanece utilizable. Un error de archivo/códec mantiene el
fondo de reserva; las políticas de autoplay no se pueden garantizar en todos
los navegadores aun usando muted/playsinline.

Al salir de pantalla, ocultar la pestaña o perder WebGL se pausan RAF y video.
Con movimiento reducido se mantiene un fotograma estático (o el fallback hasta
que se cargue). `loadeddata` solicita un render para actualizarlo sin animación.
`destroy()` pausa, retira listeners, cancela los callbacks de VideoTexture al
liberarla, elimina src, llama load para liberar el medio y retira el video oculto.
La limpieza existente se encarga de geometrías, materiales, instancias y pases.

## Referencia

Inspiración conceptual: [Interactive Video Projection Mapping with Three.js,
Victor Work / Codrops](https://tympanus.net/codrops/2025/08/28/interactive-video-projection-mapping-with-three-js/).
Se adapta la idea de distribuir fragmentos del video a un InstancedMesh 3D con
material físico; no se copia la UI, las máscaras ni las transiciones del demo.
