import * as THREE from 'three';
import { createPlasterTexture } from './surfaces';

export class GalleryResources {
  readonly geometries = new Set<THREE.BufferGeometry>();
  readonly materials = new Set<THREE.Material>();
  readonly textures = new Set<THREE.Texture>();
  readonly plaster: THREE.MeshStandardMaterial;
  readonly stone: THREE.MeshStandardMaterial;
  constructor() {
    const map = this.texture(createPlasterTexture());
    const bump = this.texture(map.clone()); bump.colorSpace = THREE.NoColorSpace;
    this.plaster = this.material(new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.012, roughness: 0.91, color: 0xffffff }));
    this.stone = this.material(new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.022, roughness: 0.55, color: 0xe6e3da }));
  }
  material<T extends THREE.Material>(value: T): T { this.materials.add(value); return value; }
  geometry<T extends THREE.BufferGeometry>(value: T): T { this.geometries.add(value); return value; }
  texture<T extends THREE.Texture>(value: T): T { this.textures.add(value); return value; }
  box(parent: THREE.Object3D, w:number, h:number, d:number, x:number, y:number, z:number, material:THREE.Material = this.plaster) {
    const mesh = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(w,h,d)), material);
    mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  destroy() { this.geometries.forEach(value=>value.dispose());this.materials.forEach(value=>value.dispose());this.textures.forEach(value=>value.dispose()); }
}
