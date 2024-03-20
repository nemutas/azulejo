import * as THREE from 'three'
import { RawShaderMaterial } from './core/ExtendedMaterials'
import { Three } from './core/Three'
import quadVs from './shader/quad.vs'
import effectFs from './shader/effect.fs'

export class Canvas extends Three {
  private mainRT: THREE.WebGLRenderTarget
  private mainScene: THREE.Scene
  private effect!: THREE.Mesh<THREE.PlaneGeometry, THREE.RawShaderMaterial>

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)

    const dpr = this.renderer.getPixelRatio()
    this.mainRT = new THREE.WebGLRenderTarget(this.size.width * dpr, this.size.height * dpr)
    this.mainScene = new THREE.Scene()

    this.init()

    this.loadAssets().then((assets) => {
      this.createLights()
      this.createModel()
      this.effect = this.createEffect(assets[0])
      window.addEventListener('resize', this.resize.bind(this))
      this.renderer.setAnimationLoop(this.anime.bind(this))
    })
  }

  private async loadAssets() {
    const loader = new THREE.TextureLoader()

    return await Promise.all(
      ['azulejos'].map(async (filename) => {
        const texture = await loader.loadAsync(`${import.meta.env.BASE_URL}textures/${filename}.webp`)
        texture.userData.aspect = texture.source.data.width / texture.source.data.height
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        return texture
      }),
    )
  }

  private init() {
    this.mainScene.background = new THREE.Color('#fff')

    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.03
    this.controls.enablePan = false
  }

  private createLights() {
    const amb = new THREE.AmbientLight('#fff', 0.5)
    this.mainScene.add(amb)

    const dir = new THREE.DirectionalLight('#fff', 2.0)
    dir.position.set(-1, 5, 3)
    this.mainScene.add(dir)
  }

  private createModel() {
    let geometry!: THREE.BufferGeometry
    const r = Math.random()
    if (r < 0.5) {
      // cylinder
      this.camera.position.set(0.76, 0.93, 0.92)
      geometry = new THREE.CylinderGeometry(0.3, 0.3, 1)
      geometry.rotateX(Math.PI * 0.5)
    } else {
      // torus
      this.camera.position.set(0.61, -0.53, 1.1)
      geometry = new THREE.TorusGeometry(0.3, 0.15, 48, 96)
    }
    const material = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#777' })
    const mesh = new THREE.Mesh(geometry, material)
    this.mainScene.add(mesh)
  }

  private createEffect(map: THREE.Texture) {
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new RawShaderMaterial({
      uniforms: {
        uSource: { value: this.mainRT.texture },
        uResolution: { value: [this.size.width, this.size.height] },
        uMap: { value: map },
        uMapPx: { value: [1 / 6, 1 / 5] },
      },
      vertexShader: quadVs,
      fragmentShader: effectFs,
      glslVersion: '300 es',
    })
    const mesh = new THREE.Mesh(geometry, material)
    this.scene.add(mesh)
    return mesh
  }

  private resize() {
    const dpr = this.renderer.getPixelRatio()
    this.mainRT.setSize(this.size.width * dpr, this.size.height * dpr)
    this.effect.material.uniforms.uResolution.value = [this.size.width, this.size.height]
  }

  private anime() {
    this.updateTime()
    this.controls.update()

    this.renderer.setRenderTarget(this.mainRT)
    this.renderer.render(this.mainScene, this.camera)

    this.render()
  }
}
