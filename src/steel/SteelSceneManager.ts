'use client';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SteelHouseConfig, SteelWall, SteelOpening, LayerVisibility, InternalWall, StructuralAnalysisResult, HeaderAnalysis } from '@/lib/steel/types';
import { InputController } from '@/engine/player/InputController';
import { CollisionSystem } from '@/engine/player/CollisionSystem';
import { PlayerController } from '@/engine/player/PlayerController';
import { ThirdPersonCamera } from '@/engine/player/ThirdPersonCamera';
import { StructuralEngine } from '@/server/steel/structuralEngine';
import { FoundationEngine } from '@/server/steel/foundationEngine';

export class SteelSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private houseGroup: THREE.Group;
  private openingsGroup: THREE.Group;
  private internalWallsGroup: THREE.Group;
  private floorMesh: THREE.Mesh | null = null;
  private xRayMode: boolean = false;
  private explosionFactor: number = 0;
  private blueprintMode: boolean = false;
  private showLoadVectors: boolean = false;
  private initialPositions: Map<string, THREE.Vector3>;
  private alertsContainer: HTMLDivElement;
  private alertElements: { el: HTMLElement, pos: THREE.Vector3 }[] = [];
  private container: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private input: InputController;
  private collisions: CollisionSystem;
  private player: PlayerController;
  private tpCamera: ThirdPersonCamera;
  private isWalkModeActive = false;
  private prevTime = performance.now();

  public onOpeningDoubleClick: ((wallId: string, opening: SteelOpening, isInternal?: boolean) => void) | null = null;
  public onWallDoubleClick: ((wallId: string, x: number, side: 'exterior' | 'interior') => void) | null = null;
  public onWalkModeLock: ((locked: boolean) => void) | null = null;
  public onInternalWallDoubleClick: ((iw: InternalWall, x: number) => void) | null = null;
  public onFloorDoubleClick: ((x: number, z: number) => void) | null = null;

  private colors = {
    background: 0xf1f5f9,
    steel: 0x9ca3af,      
    steelDrywall: 0x64748b, 
    header: 0x2563eb,
    header_truss: 0x7c3aed, 
    king: 0xef4444,
    jack: 0xf59e0b,
    cripple: 0x8b5cf6, 
    floor: 0xe2e8f0,
    panel_ext: 0x94a3b8,
    panel_int: 0xd1d5db,
    insulation: 0xfbbf24,
    blocking: 0x22c55e,   
    junction: 0x3b82f6,   
    corner: 0xef4444,     
    bracing: 0xf59e0b,
    status_ok: 0x22c55e,
    status_warning: 0xf59e0b,
    status_error: 0xef4444,
    ladder: 0xec4899,
    tension: 0x3b82f6,      // Azul
    compression: 0xef4444,  // Rojo
    neutral: 0x94a3b8,      // Gris azulado
    concrete: 0x94a3b8,        // Hormigón
    rebar: 0x475569            // Acero refuerzo
  };

  private showDiagrams = false;

  private profileWidth = 100; 
  private drywallProfileWidth = 70;
  private profileFlange = 40;  

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 10, 100000);
    this.camera.position.set(8000, 6000, 8000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.input = new InputController();
    this.collisions = new CollisionSystem();
    this.player = new PlayerController(this.scene, this.input, this.collisions);
    this.tpCamera = new ThirdPersonCamera(this.camera, this.player.mesh, this.input, this.collisions);
    this.player.mesh.visible = false;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5000, 10000, 7500);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
    this.houseGroup = new THREE.Group();
    this.scene.add(this.houseGroup);
    this.openingsGroup = new THREE.Group();
    
    this.xRayMode = false;
    this.explosionFactor = 0;
    this.blueprintMode = false;
    this.initialPositions = new Map();
    this.scene.add(this.openingsGroup);
    this.internalWallsGroup = new THREE.Group();
    this.scene.add(this.internalWallsGroup);
    
    this.initialPositions = new Map();
    this.alertElements = [];

    this.alertsContainer = document.createElement('div');
    this.alertsContainer.style.position = 'absolute';
    this.alertsContainer.style.top = '0';
    this.alertsContainer.style.left = '0';
    this.alertsContainer.style.width = '100%';
    this.alertsContainer.style.height = '100%';
    this.alertsContainer.style.pointerEvents = 'none';
    this.container.appendChild(this.alertsContainer);
    this.animate();
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick);
  }

  public getCamera() { return this.camera; }
  public getControls() { return this.controls; }
  public getScreenshot() { return this.renderer.domElement.toDataURL('image/png'); }

  public updateJoystickMove(x: number, y: number) { this.input.joystickMove.set(x, y); }
  public updateJoystickLook(x: number, y: number) { this.input.joystickLook.set(x, y); }

  public enterWalkMode() {
    this.isWalkModeActive = true;
    this.controls.enabled = false;
    this.player.mesh.visible = true;
    if (this.onWalkModeLock) this.onWalkModeLock(true);
  }

  public exitWalkMode() {
    this.isWalkModeActive = false;
    this.controls.enabled = true;
    this.player.mesh.visible = false;
    const box = new THREE.Box3().setFromObject(this.houseGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.copy(center);
    if (this.onWalkModeLock) this.onWalkModeLock(false);
  }

  private onWindowResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private onDoubleClick = (event: MouseEvent) => {
    if (this.isWalkModeActive) return; 
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const openingIntersects = this.raycaster.intersectObjects(this.openingsGroup.children);
    if (openingIntersects.length > 0) {
      const { wallId, opening, isInternal } = openingIntersects[0].object.userData;
      if (this.onOpeningDoubleClick) this.onOpeningDoubleClick(wallId, opening, isInternal);
      return;
    }

    const internalIntersects = this.raycaster.intersectObjects(this.internalWallsGroup.children, true);
    if (internalIntersects.length > 0) {
      let object = internalIntersects[0].object;
      const hitPoint = internalIntersects[0].point.clone();
      while (object.parent && !object.userData.isInternalWall) object = object.parent;
      if (object.userData.isInternalWall && this.onInternalWallDoubleClick) {
        const localPoint = object.worldToLocal(hitPoint);
        this.onInternalWallDoubleClick(object.userData.internalWall, localPoint.x);
        return;
      }
    }

    const wallIntersects = this.raycaster.intersectObjects(this.houseGroup.children, true);
    const wallHit = wallIntersects.find(i => i.object.userData.isWall);
    if (wallHit) {
      const { wallId, side } = wallHit.object.userData;
      const localPoint = wallHit.object.worldToLocal(wallHit.point.clone());
      if (this.onWallDoubleClick) this.onWallDoubleClick(wallId, localPoint.x, side);
      return;
    }

    if (this.floorMesh) {
      const floorIntersects = this.raycaster.intersectObject(this.floorMesh);
      if (floorIntersects.length > 0 && this.onFloorDoubleClick) {
        this.onFloorDoubleClick(floorIntersects[0].point.x, floorIntersects[0].point.z);
      }
    }
  };

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    requestAnimationFrame(this.animate);
    const time = performance.now();
    const delta = Math.min((time - this.prevTime) / 1000, 0.1);
    if (this.isWalkModeActive) {
      this.player.update(delta, this.tpCamera.rotationY);
      this.tpCamera.update(delta);
    } else {
      this.controls.update();
    }
    this.prevTime = time;
    this.updateAlerts();
    this.renderer.render(this.scene, this.camera);
  };

  public setShowDiagrams(show: boolean) {
    this.showDiagrams = show;
  }

  private createTextLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
  
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 256, 128);
  
    ctx.fillStyle = 'black';
    ctx.font = 'Bold 40px Arial';
    ctx.fillText(text, 20, 70);
  
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
  
    return new THREE.Sprite(material);
  }
  
  public buildHouse(config: SteelHouseConfig, structuralResult: any) {
    [this.houseGroup, this.openingsGroup, this.internalWallsGroup].forEach(group => {
      while (group.children.length > 0) {
        const child = group.children[0];
        this.disposeObject(child);
        group.remove(child);
      }
    });
    this.collisions.clear();

    if (config.layers.foundation) {
      this.renderFoundation(structuralResult?.foundation, config);
    }
    
    // Escala Humana (Referencia)
    this.renderHumanScale();

    // =============== DUMB RENDERER DTO (PHASE 3 FEM CORE) ===============
    if (structuralResult?.structuralViewModel) {
        this.renderFEMDTO(structuralResult.structuralViewModel);
        return; // Omitir todo motor visual legacy!
    }
    // ====================================================================

    config.walls.forEach(wall => {
      const processed = structuralResult?.processedWalls?.find((pw: any) => pw.id === wall.id);
      const wallGroup = new THREE.Group();
      wallGroup.position.set(wall.x, 0, wall.z);
      wallGroup.rotation.y = (wall.rotation * Math.PI) / 180;
      this.houseGroup.add(wallGroup);
      wallGroup.updateMatrixWorld(true);
      const panelGap = (config.explosionFactor || 0) * 800; 
      const panelsToRender = processed?.panels || [{ xStart: 0, xEnd: wall.length, width: wall.length }];

      if (!config.structuralMode) {
        panelsToRender.forEach((p: any, index: number) => {
          const visualPanelGroup = new THREE.Group();
          visualPanelGroup.position.x = p.xStart + (index * panelGap);
          wallGroup.add(visualPanelGroup);
          
          if (config.layers.exteriorPanels) visualPanelGroup.add(this.createPanelMesh(wall, p, 'exterior', config));
          if (config.layers.interiorPanels) visualPanelGroup.add(this.createPanelMesh(wall, p, 'interior', config));
        });
      }
      
      this.clearAlerts();
      if (config.layers.steelProfiles && processed) {
        this.renderProcessedStructure(wall, processed, wallGroup, config);
        if (config.layers.structuralDiagrams && structuralResult.lateralStability) {
          this.renderLoadPath(wall, processed, wallGroup, config, structuralResult);
          this.renderWindVectors(wall, structuralResult.lateralStability, wallGroup, config);
        }
      }
      if (!this.initialPositions.has(wall.id)) {
        this.initialPositions.set(wall.id, wallGroup.position.clone());
      }

      this.updateExplodedPosition(wallGroup, wall.id, config);
      this.updateXRayMaterials(wallGroup, config);
      this.updateBlueprintStyle(wallGroup, config);
      this.updateLoadVectors(wallGroup, wall, config);

      this.createOpeningTriggers(wall.id, wall.length, wall.height, wall.rotation, wall.x, wall.z, wall.openings, false, processed?.headers || [], 100);
    });

    config.internalWalls.forEach(iw => {
      const processed = structuralResult?.processedInternalWalls?.find((piw: any) => piw.id === iw.id);
      const iwGroup = new THREE.Group();
      iwGroup.userData = { isInternalWall: true, internalWall: iw };
      const globalPos = this.calculateGlobalPosition(iw, config);

      iwGroup.position.copy(globalPos);
      iwGroup.rotation.y = (iw.rotation * Math.PI) / 180;
      this.internalWallsGroup.add(iwGroup);
      iwGroup.updateMatrixWorld(true);
      
      this.renderProcessedInternalWall(iw, processed, iwGroup, config);
      this.createOpeningTriggers(iw.id, iw.length, iw.height, iw.rotation, iwGroup.position.x, iwGroup.position.z, iw.openings || [], true, processed?.headers || [], 70);
    });

    if (config.roof?.enabled && structuralResult?.processedRoof) {
      this.renderRoof(structuralResult.processedRoof, config);
    }

    const floorGeom = new THREE.PlaneGeometry(40000, 40000);
    const floorMat = new THREE.MeshStandardMaterial({ color: this.colors.floor });
    this.floorMesh = new THREE.Mesh(floorGeom, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -5;
    this.floorMesh.receiveShadow = true;
    this.houseGroup.add(this.floorMesh);
  }

  private renderRoof(trusses: any[], config: SteelHouseConfig) {
    const roofGroup = new THREE.Group();
    // Centramos el techo compensando que la casa se grafica en torno a X=0, Z=0
    const eaveLength = config.roof?.eaveLength || 0;
    roofGroup.position.set(-config.width / 2 - eaveLength, config.globalWallHeight, -config.length / 2);
    
    // Altura global de todos los muros base
    const baseElevation = 0; 
    
    const panelGapZ = (config.explosionFactor || 0) * 800; // Si hay explosión, separamos las cerchas en Z
    const panelGapY = (config.explosionFactor || 0) * 400; // Y las levantamos un poco

    trusses.forEach((truss, index) => {
        const trussGroup = new THREE.Group();
        trussGroup.position.set(0, panelGapY, truss.z + (index * panelGapZ));
        roofGroup.add(trussGroup);

        if (config.layers.steelProfiles) {
            truss.elements.forEach((el: any) => {
                const len = Math.hypot(el.xEnd - el.xStart, el.yEnd - el.yStart);
                const angle = Math.atan2(el.yEnd - el.yStart, el.xEnd - el.xStart);
                
                let color = this.colors.steel;
                if (el.type === 'top_chord') color = 0x3b82f6; // Blue
                if (el.type === 'bottom_chord') color = 0x8b5cf6; // Purple
                if (el.type === 'web') color = 0x10b981; // Emerald

                // rotation Z para inclinación
                const mesh = this.createProfile(len, el.xStart, el.yStart, 0, el.profile, color);
                
                // createProfile dibuja un perfil acostado a lo largo del X. 
                // Por lo tanto, necesito compensar el ángulo internamente en la malla o envoltorio.
                // Como createProfile no retorna un Group que gira limpio, vamos a envolverlo:
                const elementWrapper = new THREE.Group();
                elementWrapper.position.set(el.xStart, el.yStart, 0);
                elementWrapper.rotation.z = angle;
                
                // Dibujamos desde 0 localmente
                const profileGeometry = this.createProfile(len, 0, 0, 0, el.profile, color);
                elementWrapper.add(profileGeometry);
                
                trussGroup.add(elementWrapper);
            });
        }

        // --- CUBIERTA OSB (Exterior Panels) ---
        if (config.layers.exteriorPanels && index < trusses.length - 1) {
            const spanX = truss.span;
            const nextTrussBaseZ = trusses[index+1].z;
            const distZ = nextTrussBaseZ - truss.z;
            
            const createRoofPlane = (x1: number, y1: number, x2: number, y2: number) => {
                const len = Math.hypot(x2 - x1, y2 - y1);
                const angle = Math.atan2(y2 - y1, x2 - x1);
                
                const geom = new THREE.PlaneGeometry(len, distZ);
                const mat = new THREE.MeshStandardMaterial({ 
                    color: this.colors.panel_ext, 
                    roughness: 0.9, 
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geom, mat);
                
                // Rotar para inclinar y orientar
                mesh.rotation.x = -Math.PI / 2;
                
                const wrap = new THREE.Group();
                wrap.position.set(x1 + (x2-x1)/2, y1 + (y2-y1)/2, distZ/2);
                wrap.rotation.z = angle;
                wrap.add(mesh);
                return wrap;
            };

            if (config.roof?.type === 'two_slope') {
                const ridgeX = spanX / 2;
                const ridgeY = truss.height;
                trussGroup.add(createRoofPlane(0, 0, ridgeX, ridgeY));
                trussGroup.add(createRoofPlane(ridgeX, ridgeY, spanX, 0));
            } else if (config.roof?.type === 'one_slope') {
                trussGroup.add(createRoofPlane(0, 0, spanX, truss.height));
            } else if (config.roof?.type === 'flat') {
                trussGroup.add(createRoofPlane(0, truss.height, spanX, truss.height));
            }
        }
    });

    this.houseGroup.add(roofGroup);
  }

  private renderProcessedStructure(wall: SteelWall, processed: any, group: THREE.Group, config: SteelHouseConfig) {
    const structuralGroup = new THREE.Group();
    group.add(structuralGroup);
    const hStart = wall.heightStart || wall.height;
    const hEnd = wall.heightEnd || wall.height;

    processed.panels.forEach((p: any, index: number) => {
      const panelGroup = new THREE.Group();
      structuralGroup.add(panelGroup);
    
      const panelGap = (config.explosionFactor || 0) * 800;
      const xOffset = p.xStart + (index * panelGap);
      panelGroup.position.x = xOffset;
    
      const panelColor = index % 2 === 0 ? this.colors.steel : 0x6b7280;
    
      // 🔳 SOLERA INFERIOR (PGU)
      panelGroup.add(this.createProfile(p.width, 0, 0, 0, 'PGU', this.colors.steel));
    
      // 🔳 SOLERA SUPERIOR (PGU INCLINADA)
      const lpStart = hStart + (p.xStart / wall.length) * (hEnd - hStart);
      const lpEnd = hStart + (p.xEnd / wall.length) * (hEnd - hStart);
      const angle = Math.atan2(lpEnd - lpStart, p.width);
      const hypot = Math.hypot(p.width, lpEnd - lpStart);
      
      const topPlateGroup = new THREE.Group();
      topPlateGroup.position.set(0, lpStart - this.profileFlange, 0);
      topPlateGroup.rotation.z = angle;
      const topPlate = this.createProfile(hypot, 0, 0, 0, 'PGU', this.colors.steel);
      topPlateGroup.add(topPlate);
      panelGroup.add(topPlateGroup);
    
      // =========================
      // 🔥 BORDE IZQUIERDO PANEL
      // =========================
      const hEdgeLeft = (hStart + (p.xStart / wall.length) * (hEnd - hStart)) - (this.profileFlange * 2);
      panelGroup.add(
        this.createProfile(
          hEdgeLeft,
          0,
          this.profileFlange,
          90,
          'PGC',
          0x111111 // negro → marca corte de panel
        )
      );
    
      // =========================
      // 🔥 DOBLE STUD EN JUNTA
      // =========================
      if (index > 0) {
        const hJunction = (hStart + ((p.xStart + 10) / wall.length) * (hEnd - hStart)) - (this.profileFlange * 2);
        panelGroup.add(
          this.createProfile(
            hJunction,
            10,
            this.profileFlange,
            90,
            'PGC',
            this.colors.junction
          )
        );
      }
    
      // =========================
      // 📐 MONTANTES (PGC) - Lógica In-Line con Recorte de Vanos
      // =========================
      for (let x = 0; x < p.width; x += wall.studSpacing) {
        const globalX = p.xStart + x;
        
        const opening = wall.openings.find(op => {
          const margin = 5; 
          return globalX >= (op.position + margin) && globalX <= (op.position + op.width - margin);
        });

        const currentX = x + p.xStart;
        const currentStudHeight = (hStart + (currentX / wall.length) * (hEnd - hStart)) - (this.profileFlange * 2);

        if (opening) {
          const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
          const headerBottom = sill + opening.height;
          
          const currentWallHeight = hStart + (currentX / wall.length) * (hEnd - hStart);
          const analysis = StructuralEngine.calculateHeader(opening, wall.length, config, currentWallHeight, wall.studSpacing);
          const headerHeight = analysis.actualHeight;
          panelGroup.add(this.createProfile(currentWallHeight - headerBottom - headerHeight - this.profileFlange, x, headerBottom + headerHeight, 90, 'PGC', this.colors.cripple));
          
          if (opening.type === 'window') {
            panelGroup.add(this.createProfile(sill - this.profileFlange, x, this.profileFlange, 90, 'PGC', this.colors.cripple));
          }
        } else {
          const analysis = StructuralEngine.analyzeStructuralElement("PGC-100-0.9", currentStudHeight, p.loads.verticalLoadN / 12, 'simple');
          const stressColor = analysis.isSafe ? (analysis.stressRatio > 0.8 ? 0xf59e0b : panelColor) : 0xef4444;

          panelGroup.add(this.createProfile(currentStudHeight, x, this.profileFlange, 90, 'PGC', config.layers.structuralDiagrams ? stressColor : panelColor));
          
          if (p.doubleStuds && x > 10) {
             panelGroup.add(this.createProfile(currentStudHeight, x + 15, this.profileFlange, 90, 'PGC', this.colors.junction));
          }
        }
      }
    
      // =========================
      // 🔥 BORDE DERECHO PANEL
      // =========================
      const hEdgeRight = (hStart + (p.xEnd / wall.length) * (hEnd - hStart)) - (this.profileFlange * 2);
      panelGroup.add(this.createProfile(hEdgeRight, p.width - 10, this.profileFlange, 90, 'PGC', this.colors.junction));
    
      // =========================
      // 🧱 COLISIÓN (IMPORTANTE)
      // =========================
      const collMesh = new THREE.Mesh(
        new THREE.BoxGeometry(p.width, wall.height, wall.thickness + 20),
        new THREE.MeshBasicMaterial({ visible: false })
      );
    
      collMesh.position.set(p.width / 2, wall.height / 2, 0);
    
      panelGroup.add(collMesh);
      this.collisions.registerWall(collMesh);
      const label = this.createTextLabel(p.id);
      label.position.set(p.width / 2, wall.height + 200, 0);
      panelGroup.add(label);

      // --- MIGRADO: ENLAZAR COMPONENTES AL PANEL LOCAL ---
      if (config.layers.horizontalBlocking) {
        processed.blockings.forEach((b: any) => {
          if (b.xStart >= p.xStart && b.xEnd <= p.xEnd) {
            panelGroup.add(this.createProfile(b.xEnd - b.xStart, b.xStart - p.xStart, b.y, 0, 'PGU', this.colors.blocking));
          }
        });
      }

      const junctions = StructuralEngine.findJunctions(wall, config);
      junctions.forEach(j => {
        if (j.x >= p.xStart && j.x <= p.xEnd) {
          const hStartJ = wall.heightStart || wall.height;
          const hEndJ = wall.heightEnd || wall.height;
          const currentH = hStartJ + (j.x / wall.length) * (hEndJ - hStartJ);
          const jStudHeight = currentH - (this.profileFlange * 2);

          panelGroup.add(this.createProfile(jStudHeight, j.x - p.xStart - 5, this.profileFlange, 90, 'PGC', this.colors.ladder));
          const ladders = StructuralEngine.calculateLadderBacking(currentH);
          ladders.forEach(l => {
            panelGroup.add(this.createProfile(l.xEnd - l.xStart, j.x - p.xStart + l.xStart, l.y, 0, 'PGU', this.colors.ladder));
          });
        }
      });

      wall.openings.forEach(op => {
        const opGlobalLeft = op.position;
        const opGlobalRight = op.position + op.width;
        
        if (opGlobalRight > p.xStart && opGlobalLeft < p.xEnd) {
          const localOpLeft = Math.max(0, opGlobalLeft - p.xStart);
          const localOpRight = Math.min(p.width, opGlobalRight - p.xStart);
          const opW = localOpRight - localOpLeft;

          const headerData = processed.headers.find((h: any) => h.openingId === op.id);
          if (!headerData) return;
          const analysis = headerData.analysis;
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          const headerBottom = sill + op.height;
          const headerHeight = analysis.actualHeight;
          const fusion = analysis.isFusedWithCorner;
          const numKings = analysis.kings || 1;
          const numJacks = analysis.jacks || 1;

          for (let i = 0; i < numJacks; i++) {
            const jackT = analysis.supports.jackThickness || 0.9;
            const jackColor = jackT > 1.2 ? 0x1e3a8a : this.colors.jack;
            if (fusion !== 'left') panelGroup.add(this.createProfile(headerBottom - this.profileFlange, localOpLeft - this.profileFlange - i * 10, this.profileFlange, 90, 'PGC', jackColor));
            if (fusion !== 'right') panelGroup.add(this.createProfile(headerBottom - this.profileFlange, localOpLeft + opW + i * 10, this.profileFlange, 90, 'PGC', jackColor));
          }

          for (let i = 0; i < numKings; i++) {
            const xK1 = localOpLeft - this.profileFlange * (2 + i);
            const xK2 = localOpLeft + opW + this.profileFlange * (1 + i);
            const globK1 = opGlobalLeft - this.profileFlange * (2 + i);
            const globK2 = opGlobalRight + this.profileFlange * (1 + i);
            const hK1 = (hStart + (globK1 / wall.length) * (hEnd - hStart)) - (this.profileFlange * 2);
            const hK2 = (hStart + (globK2 / wall.length) * (hEnd - hStart)) - (this.profileFlange * 2);

            if (fusion !== 'left') panelGroup.add(this.createProfile(hK1, xK1, this.profileFlange, 90, 'PGC', this.colors.king));
            if (fusion !== 'right') panelGroup.add(this.createProfile(hK2, xK2, this.profileFlange, 90, 'PGC', this.colors.king));
          }
          
          if (fusion !== 'left') panelGroup.add(this.createProfile(headerBottom - this.profileFlange, localOpLeft - this.profileFlange, this.profileFlange, 90, 'PGC', this.colors.jack));
          if (fusion !== 'right') panelGroup.add(this.createProfile(headerBottom - this.profileFlange, localOpLeft + opW, this.profileFlange, 90, 'PGC', this.colors.jack));

          if (analysis.type === 'truss') {
            this.drawTrussHeader(panelGroup, localOpLeft, headerBottom, opW, headerHeight, this.profileWidth, analysis.trussData);
          } else {
            const headerColor = analysis.status === 'error' ? this.colors.status_error : (analysis.status === 'warning' ? this.colors.status_warning : this.colors.header);
            panelGroup.add(this.createProfile(opW, localOpLeft, headerBottom, 0, 'PGC', headerColor, 0, this.profileWidth, headerHeight));
            if (this.showDiagrams && analysis.diagramData) {
              if (analysis.diagramData.moments) this.drawMomentDiagram(panelGroup, localOpLeft, headerBottom + headerHeight, analysis.diagramData.moments);
              if (analysis.diagramData.deflection) this.drawEngineeringPath(panelGroup, analysis.diagramData.deflection, [localOpLeft, headerBottom, 0], 0, 0x00ffff, 100);
            }
          }
          
          if (op.type === 'window') panelGroup.add(this.createProfile(opW, localOpLeft, sill - this.profileFlange, 0, 'PGU', this.colors.steel));

          headerData.cripples?.forEach((c: any) => {
            const isInline = c.x % wall.studSpacing === 0;
            if (!isInline && c.x >= p.xStart && c.x <= p.xEnd) {
                const profile = this.createProfile(c.yEnd - c.yStart, c.x - p.xStart, c.yStart, 90, 'PGC', this.colors.cripple);
                profile.userData = { label: 'C-Crippler' };
                panelGroup.add(profile);
            }
          });
        }
      });
    });
  }

  private generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // =========================================================
  // DUMB RENDERER RECEPTOR: DTO a Instanced / Mesh Visual
  // =========================================================
  private addFEMAlert(status: string, message: string, pos: THREE.Vector3, data: any) {
    const el = document.createElement('div');
    el.className = `absolute px-2 py-1 rounded text-[10px] font-bold text-white shadow-xl border border-white/30 backdrop-blur-sm pointer-events-auto transition-transform hover:scale-110 ${status === 'FAIL' ? 'bg-red-600' : 'bg-amber-500'}`;
    
    // El render no decide; MUESTRA lo que el DTO estructuró
    const justifyHtml = data?.justification ? `<div class="mt-1 text-[7px] text-cyan-200 opacity-80">⚖️ Gobierna: ${data.justification}</div>` : '';
    const utilHtml = data?.utilization ? `<div class="mt-1 text-[7px] text-yellow-200 opacity-80">🔥 Utilización: ${(data.utilization * 100).toFixed(1)}%</div>` : '';

    el.innerHTML = `
      <div class="flex items-center gap-1 border-b border-white/20 mb-1 pb-1">
        <span>${status === 'FAIL' ? '🚫' : '⚠️'}</span>
        <span class="uppercase">${status}</span>
      </div>
      <div>${message}</div>
      ${utilHtml}
      ${justifyHtml}
    `;

    // Hack para tooltips funcionales on click/hover básicos
    el.title = "Dumb Renderer Info";
    
    this.alertsContainer.appendChild(el);
    this.alertElements.push({ el, pos });
  }

  private renderFEMDTO(dto: any) {
    if (!dto.members || !dto.nodes) return;
    
    const materialDB: Record<string, THREE.MeshPhysicalMaterial> = {
      'SAFE': new THREE.MeshPhysicalMaterial({ color: this.colors.status_ok, metalness: 0.6, roughness: 0.4 }),
      'WARNING': new THREE.MeshPhysicalMaterial({ color: this.colors.status_warning, metalness: 0.6, roughness: 0.4 }),
      'FAIL': new THREE.MeshPhysicalMaterial({ color: this.colors.status_error, metalness: 0.6, roughness: 0.4 }),
      'DEFAULT': new THREE.MeshPhysicalMaterial({ color: this.colors.steel, metalness: 0.8, roughness: 0.2 }),
    };

    const geometry = new THREE.CylinderGeometry(20, 20, 1, 8); // 40mm grosor base
    // Pivot en el inicio en lugar del centro, para matchear StartNode a EndNode
    geometry.translate(0, 0.5, 0); 
    geometry.rotateX(Math.PI / 2); // Orientar sobre Z local

    Object.values(dto.members).forEach((member: any) => {
        const n1 = dto.nodes[member.startNodeId];
        const n2 = dto.nodes[member.endNodeId];
        if (!n1 || !n2) return;

        const start = new THREE.Vector3(n1.x, n1.y, n1.z);
        const end = new THREE.Vector3(n2.x, n2.y, n2.z);
        const distance = start.distanceTo(end);

        if (distance === 0) return;

        // Selección de color según Status del DTO (Sin pensar!)
        const statusKey = member.status || 'DEFAULT';
        const material = materialDB[statusKey] || materialDB['DEFAULT'];

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(start);
        mesh.lookAt(end);
        mesh.scale.set(1, 1, distance);

        mesh.userData = {
          isWall: true,
          isMember: true,
          memberId: member.id,
          memberType: member.memberType,
          profileId: member.profileId,
          utilization: member.utilization,
          status: member.status,
          forces: member.forces,
          message: member.message,
          governingEquation: member.governingEquation
        };

        this.houseGroup.add(mesh);

        // Disparar alertas estructurales calculadas backend
        if (statusKey === 'WARNING' || statusKey === 'FAIL') {
            const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
            this.addFEMAlert(statusKey, member.message || 'Alerta Estructural', midPoint, {
                justification: member.governingEquation,
                utilization: member.utilization
            });
        }
    });
    
    const box = new THREE.Box3().setFromObject(this.houseGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.controls.target.copy(center);
  }

  private renderProcessedInternalWall(iw: InternalWall, processed: any, group: THREE.Group, config: SteelHouseConfig) {
    const hStart = iw.heightStart || iw.height;
    const hEnd = iw.heightEnd || iw.height;
    const thickness = this.drywallProfileWidth;

    if (processed) {
      processed.panels.forEach((p: any) => {
        const collMesh = new THREE.Mesh(new THREE.BoxGeometry(p.width, iw.height, thickness + 20), new THREE.MeshBasicMaterial({ visible: false }));
        collMesh.position.set(p.xStart + p.width/2, iw.height/2, 0);
        group.add(collMesh); 
        this.collisions.registerWall(collMesh);
      });

      if (config.layers.steelProfiles) {
        const structuralGroup = new THREE.Group();
        group.add(structuralGroup);
        
        processed.panels.forEach((p: any) => {
          const lpStart = hStart + (p.xStart / iw.length) * (hEnd - hStart);
          const lpEnd = hStart + (p.xEnd / iw.length) * (hEnd - hStart);
          const angle = Math.atan2(lpEnd - lpStart, p.width);
          const hypot = Math.hypot(p.width, lpEnd - lpStart);

          // Solera Inferior
          structuralGroup.add(this.createProfile(p.width, p.xStart, 0, 0, 'PGU', this.colors.steelDrywall, 0, thickness, 30));
          
          // Solera Superior Inclinada
          const topPlateGroup = new THREE.Group();
          topPlateGroup.position.set(p.xStart, lpStart - 30, 0);
          topPlateGroup.rotation.z = angle;
          const topPlate = this.createProfile(hypot, 0, 0, 0, 'PGU', this.colors.steelDrywall, 0, thickness, 30);
          topPlateGroup.add(topPlate);
          structuralGroup.add(topPlateGroup);
          
          for (let x = p.xStart; x <= p.xEnd; x += 400) {
            const currentH = hStart + (x / iw.length) * (hEnd - hStart);
            const currentStudH = currentH - 60;
            const opening = (iw.openings || []).find(op => x >= (op.position + 5) && x <= (op.position + op.width - 5));
            
            if (opening) {
              // Cripples en muros internos
              const sill = opening.type === 'door' ? 0 : (opening.sillHeight || 900);
              const headerBottom = sill + opening.height;
              
              const currentWallHeight = hStart + (x / iw.length) * (hEnd - hStart);
              const analysis = StructuralEngine.calculateHeader(opening, iw.length, config, currentWallHeight);
              const headerHeight = analysis.actualHeight;
              structuralGroup.add(this.createProfile(currentWallHeight - headerBottom - headerHeight - 30, x, headerBottom + headerHeight, 90, 'PGC', this.colors.cripple, 0, thickness, 30));
              // Inferior (Solo ventanas)
              if (opening.type === 'window') {
                structuralGroup.add(this.createProfile(sill - 30, x, 30, 90, 'PGC', this.colors.cripple, 0, thickness, 30));
              }
            } else {
              structuralGroup.add(this.createProfile(currentStudH, x, 30, 90, 'PGC', this.colors.steelDrywall, 0, thickness, 30));
            }
          }
        });

        // Refuerzos de uniones entre muros internos (Drywall corners/Ts)
        const junctions = StructuralEngine.findJunctions(iw, config);
        junctions.forEach(j => {
          const currentH = hStart + (j.x / iw.length) * (hEnd - hStart);
          const currentStudH = currentH - 60;
          structuralGroup.add(this.createProfile(currentStudH, j.x - 15, 30, 90, 'PGC', this.colors.ladder, 0, thickness, 30));
          const ladders = StructuralEngine.calculateLadderBacking(currentH);
          ladders.forEach(l => {
            structuralGroup.add(this.createProfile(l.xEnd - l.xStart, j.x + l.xStart, l.y, 0, 'PGU', this.colors.ladder, 0, thickness, 30));
          });
        });

        (iw.openings || []).forEach(op => {
          const headerData = processed.headers.find((h: any) => h.openingId === op.id);
          if (!headerData) return;

          const analysis = headerData.analysis;
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          const headerBottom = sill + op.height;
          const headerHeight = analysis.actualHeight;

          const hKing1 = hStart + ((op.position - 30) / iw.length) * (hEnd - hStart);
          const hKing2 = hStart + ((op.position + op.width) / iw.length) * (hEnd - hStart);

          structuralGroup.add(this.createProfile(hKing1 - 60, op.position - 30, 30, 90, 'PGC', this.colors.king, 0, thickness, 30));
          structuralGroup.add(this.createProfile(hKing2 - 60, op.position + op.width, 30, 90, 'PGC', this.colors.king, 0, thickness, 30));

          if (headerBottom > 30) {
            structuralGroup.add(this.createProfile(headerBottom - 30, op.position - 15, 30, 90, 'PGC', this.colors.jack, 0, thickness, 30));
            structuralGroup.add(this.createProfile(headerBottom - 30, op.position + op.width - 15, 30, 90, 'PGC', this.colors.jack, 0, thickness, 30));
          }

          const headerColor = analysis.status === 'error' ? this.colors.status_error : (analysis.status === 'warning' ? this.colors.status_warning : this.colors.header);
          structuralGroup.add(this.createProfile(op.width, op.position, headerBottom, 0, 'PGC', headerColor, 0, thickness, headerHeight));

          headerData.cripples.forEach((c: any) => {
            structuralGroup.add(this.createProfile(c.yEnd - c.yStart, c.x, c.yStart, 90, 'PGC', this.colors.cripple, 0, thickness, 30));
          });
          // Renderizar tornillería si está activo modo ingeniería
          const parentPanel = processed.panels.find((p: any) => op.position >= p.xStart && op.position <= p.xEnd);
          if (parentPanel) this.drawScrews(structuralGroup, parentPanel.fasteners);
        });
      }
    }

    if (!config.structuralMode) {
      if (config.layers.interiorPanels) {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); 
        shape.lineTo(iw.length, 0); 
        shape.lineTo(iw.length, hEnd); 
        shape.lineTo(0, hStart); 
        shape.lineTo(0, 0);
        
        (iw.openings || []).forEach(op => {
          const hole = new THREE.Path(); 
          const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
          hole.moveTo(op.position, sill); 
          hole.lineTo(op.position + op.width, sill); 
          hole.lineTo(op.position + op.width, sill + op.height); 
          hole.lineTo(op.position, sill + op.height); 
          hole.lineTo(op.position, sill);
          shape.holes.push(hole);
        });
        const panelGeom = new THREE.ExtrudeGeometry(shape, { depth: 12.5, bevelEnabled: false });
        const p1 = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: this.colors.panel_int }));
        p1.position.z = thickness/2; 
        group.add(p1);
        const p2 = new THREE.Mesh(panelGeom, new THREE.MeshStandardMaterial({ color: this.colors.panel_int }));
        p2.position.z = -thickness/2 - 12.5; 
        group.add(p2);
      }
      
      const insulGeom = new THREE.BoxGeometry(iw.length, iw.height, thickness - 10);
      const insulMesh = new THREE.Mesh(insulGeom, new THREE.MeshStandardMaterial({ color: this.colors.insulation, transparent: true, opacity: 0.4 }));
      insulMesh.position.set(iw.length/2, iw.height/2, 0);
      group.add(insulMesh);
    }
  }

  private calculateGlobalPosition(iw: InternalWall, config: SteelHouseConfig): THREE.Vector3 {
    const extParent = config.walls.find(w => w.id === iw.parentWallId);
    if (extParent) {
      const parentMatrix = new THREE.Matrix4().makeRotationY((extParent.rotation * Math.PI) / 180).setPosition(extParent.x, 0, extParent.z);
      return new THREE.Vector3(iw.xPosition, 0, 50).applyMatrix4(parentMatrix);
    }
    const intParent = config.internalWalls.find(w => w.id === iw.parentWallId);
    if (intParent) {
      const parentGlobal = this.calculateGlobalPosition(intParent, config);
      const parentMatrix = new THREE.Matrix4().makeRotationY((intParent.rotation * Math.PI) / 180).setPosition(parentGlobal.x, 0, parentGlobal.z);
      return new THREE.Vector3(iw.xPosition, 0, 0).applyMatrix4(parentMatrix);
    }
    return new THREE.Vector3();
  }

  private drawTrussHeader(
    group: THREE.Group,
    x: number,
    y: number,
    w: number,
    h: number,
    thickness: number,
    trussData?: any // 👈 NUEVO
  ) {
    const chordHeight = this.profileFlange;
  
    // 🔥 cordones
    const isDouble = trussData?.chordThickness > 1.5;

    const offset = isDouble ? 10 : 0;

    // inferior
    const bottomChord = trussData?.members?.find((m: any) => m.type === 'chord_bottom');
    const bottomColor = bottomChord ? (bottomChord.stressType === 'tension' ? this.colors.tension : this.colors.compression) : this.colors.header_truss;

    group.add(this.createProfile(w, x, y, 0, 'PGC', bottomColor, -offset, thickness));
    if (isDouble) {
      group.add(this.createProfile(w, x, y, 0, 'PGC', bottomColor, offset, thickness));
    }

    // superior
    const topChord = trussData?.members?.find((m: any) => m.type === 'chord_top');
    const topColor = topChord ? (topChord.stressType === 'tension' ? this.colors.tension : this.colors.compression) : this.colors.header_truss;

    group.add(this.createProfile(w, x, y + h - chordHeight, 0, 'PGC', topColor, -offset, thickness));
    if (isDouble) {
      group.add(this.createProfile(w, x, y + h - chordHeight, 0, 'PGC', topColor, offset, thickness));
    }
    if (!trussData) return;
  
    const { panelWidth, numDiagonals, diagonalAngle } = trussData;
    const webHeight = h - chordHeight * 2;
  
    for (let i = 0; i < numDiagonals; i++) {
      const xStart = x + i * panelWidth;
      const xEnd = xStart + panelWidth;
  
      // 🔥 vertical (nodo SIEMPRE)
      group.add(
        this.createProfile(
          webHeight,
          xStart,
          y + chordHeight,
          90,
          'PGC',
          this.colors.header_truss,
          0,
          thickness
        )
      );
  
      // 🔥 diagonal real con color de esfuerzo
      const diagMember = trussData.members?.find((m: any) => m.id === `diag_${i}`);
      const diagColor = diagMember ? (diagMember.stressType === 'tension' ? this.colors.tension : this.colors.compression) : this.colors.header_truss;

      const diagLen = Math.sqrt(panelWidth ** 2 + webHeight ** 2);
  
      const diagGeom = new THREE.BoxGeometry(diagLen, 15, thickness - 10);
      const diag = new THREE.Mesh(
        diagGeom,
        new THREE.MeshStandardMaterial({ color: diagColor })
      );
  
      diag.position.set(
        xStart + panelWidth / 2,
        y + chordHeight + webHeight / 2,
        0
      );
  
      diag.rotation.z = i % 2 === 0 ? diagonalAngle : -diagonalAngle;
  
      group.add(diag);
    }
  
    // 🔥 cierre extremo derecho (ANTES faltaba)
    group.add(
      this.createProfile(
        webHeight,
        x + w,
        y + chordHeight,
        90,
        'PGC',
        this.colors.header_truss,
        0,
        thickness
      )
    );
  }

  private drawMomentDiagram(group: THREE.Group, startX: number, baselineY: number, points: { x: number, y: number }[]) {
    // Escalar momentos para visualización (ej: 1 kNm = 100mm en escena)
    const scale = 0.0001; 
    
    const curvePoints = points.map(p => new THREE.Vector3(startX + p.x, baselineY + (p.y * scale), 50));
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 }); // Verde esmeralda
    const line = new THREE.Line(geometry, material);
    group.add(line);

    // Añadir área sombreada (opcional pero estético)
    const shape = new THREE.Shape();
    shape.moveTo(startX, baselineY);
    points.forEach(p => shape.lineTo(startX + p.x, baselineY + (p.y * scale)));
    shape.lineTo(startX + points[points.length - 1].x, baselineY);
    shape.closePath();

    const fillGeom = new THREE.ShapeGeometry(shape);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const fillMesh = new THREE.Mesh(fillGeom, fillMat);
    fillMesh.position.z = 45;
    group.add(fillMesh);
  }


  private drawEngineeringPath(group: THREE.Group, points: { x: number, y: number }[], offset: [number, number, number], rotation: number, color: number = 0x00ffff, scaleY: number = 100) {
    if (!points || points.length === 0) return;
    
    const vectorPoints = points.map((p: any) => {
        // p.x está en metros, p.y está en mm en el motor FEA
        return new THREE.Vector3(p.x * 1000, -p.y * scaleY, 50); 
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(vectorPoints);
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geometry, material);
    
    line.position.set(offset[0], offset[1], offset[2]);
    line.rotation.y = rotation;
    line.name = 'engineeringCurve';
    
    group.add(line);
  }

  private drawScrews(group: THREE.Group, fasteners: any[]) {
    if (!this.showDiagrams || !fasteners) return;
    
    fasteners.forEach(f => {
      const screwGroup = new THREE.Group();
      const mat = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-2, -2, 0), new THREE.Vector3(2, 2, 0),
        new THREE.Vector3(2, -2, 0), new THREE.Vector3(-2, 2, 0)
      ]);
      const xMark = new THREE.LineSegments(g, mat);
      xMark.position.set(f.x, f.y, 55);
      group.add(xMark);
    });
  }
  
  private createProfile(len: number, x: number, y: number, rotZ: number, type: 'PGC' | 'PGU', color?: number, zOffset: number = 0, customWidth?: number, customHeight?: number): THREE.Mesh {
    const depth = customWidth || this.profileFlange; 
    const isVertical = rotZ === 90;
    
    // 🔥 CORRECCIÓN DE ANCLAJE (BOTTOM-UP)
    // Para perfiles horizontales (cabecerales), geomH es el peralte (Ix) que suele ser profileWidth (100mm)
    const geomW = isVertical ? this.profileFlange : len; 
    const geomH = isVertical ? len : (customHeight || this.profileWidth); 
    
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(geomW, geomH, depth), 
      new THREE.MeshStandardMaterial({ color: color || this.colors.steel, metalness: 0.8, roughness: 0.2 })
    );
    
    // Posicionamiento centrado en X, pero desde la BASE en Y
    mesh.position.set(x + geomW / 2, y + geomH / 2, zOffset);
    mesh.castShadow = mesh.receiveShadow = true; return mesh;
  }

  private createPanelMesh(wall: SteelWall | InternalWall, p: any, side: 'exterior' | 'interior', config: SteelHouseConfig): THREE.Mesh {
    const hStartOrig = wall.heightStart || wall.height;
    const hEndOrig = wall.heightEnd || wall.height;
    
    const hStart = hStartOrig + (p.xStart / wall.length) * (hEndOrig - hStartOrig);
    const hEnd = hStartOrig + (p.xEnd / wall.length) * (hEndOrig - hStartOrig);
    
    const shape = new THREE.Shape(); 
    shape.moveTo(0, 0); 
    shape.lineTo(p.width, 0); 
    shape.lineTo(p.width, hEnd); 
    shape.lineTo(0, hStart); 
    shape.lineTo(0, 0);

    (wall.openings || []).forEach(op => {
      const opGlobalLeft = op.position;
      const opGlobalRight = op.position + op.width;
      
      if (opGlobalRight > p.xStart && opGlobalLeft < p.xEnd) {
        const localOpX = Math.max(0, opGlobalLeft - p.xStart);
        const rightX = Math.min(p.width, opGlobalRight - p.xStart);
        const opW = rightX - localOpX;
        
        if (opW > 0) {
            const hole = new THREE.Path(); 
            const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
            hole.moveTo(localOpX, sill); 
            hole.lineTo(localOpX + opW, sill); 
            hole.lineTo(localOpX + opW, sill + op.height); 
            hole.lineTo(localOpX, sill + op.height); 
            hole.lineTo(localOpX, sill);
            shape.holes.push(hole);
        }
      }
    });

    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 12.5, bevelEnabled: false }), 
      new THREE.MeshStandardMaterial({ 
        color: side === 'exterior' ? this.colors.panel_ext : this.colors.panel_int, 
        transparent: true, 
        opacity: side === 'exterior' ? 1 : 0.8 
      })
    );
    mesh.position.z = side === 'exterior' ? -62 : 50; 
    mesh.userData = { wallId: wall.id, isWall: true, side: side }; 
    return mesh;
  }

  private createOpeningTriggers(wallId: string, length: number, height: number, rotation: number, x: number, z: number, openings: SteelOpening[], isInternal: boolean, headers: any[], thickness: number) {
    openings.forEach(op => {
      const sill = op.type === 'door' ? 0 : (op.sillHeight || 900);
      const headerData = headers.find((h: any) => h.openingId === op.id);
      const status = headerData?.analysis?.status || 'ok';
      const opColor = status === 'error' ? 0xff0000 : (status === 'warning' ? 0xffff00 : 0x00ff00);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(op.width, op.height, thickness + 10), new THREE.MeshBasicMaterial({ color: opColor, transparent: true, opacity: 0.15 }));
      const matrix = new THREE.Matrix4().makeRotationY((rotation * Math.PI) / 180).setPosition(x, 0, z);
      const pos = new THREE.Vector3(op.position + op.width / 2, sill + op.height / 2, 0).applyMatrix4(matrix);
      mesh.position.copy(pos); mesh.rotation.y = (rotation * Math.PI) / 180; mesh.userData = { wallId, opening: op, isInternal };
      
      // 🧪 Agregar Alerta de Dintel si falla (Con tolerancia Epsilon 0.01 cm para evitar 0.42/0.42)
      const calculatedVal = (headerData.analysis.f_max ?? headerData.analysis.deflectionMm) / 10;
      const limitVal = (headerData.analysis.limit ?? headerData.analysis.maxAllowableDeflection) / 10;
      
      const isSafe = headerData?.analysis?.isSafe;
      
      if (headerData?.analysis && (!isSafe || calculatedVal > (limitVal + 0.01))) {
        const cripplingFail = headerData.analysis.webCrippling && !headerData.analysis.webCrippling.isSafe;
        const defFail = calculatedVal > (limitVal + 0.01);
        
        let title = "Dintel: Falla Estructural Crítica";
        let calcVal = calculatedVal;
        let limVal = limitVal;
        let pUnit = 'cm';

        if (defFail) {
            title = "Dintel: Deformación (Flecha) Excesiva";
        } else if (cripplingFail) {
            title = "Dintel: Aplastamiento de Apoyos (Crippling)";
            calcVal = Math.round(headerData.analysis.webCrippling.ratio * 100) / 100;
            limVal = 1.0;
            pUnit = 'Ratio';
        }

        this.addStructuralAlert('FAIL', title, pos, {
            calculated: calcVal,
            limit: limVal,
            unit: pUnit,
            recommendation: headerData.analysis.recommendation,
            justification: headerData.analysis.justification
        });
      }

      // 📈 Visualización de la Deformada (Flecha exagerada)
      if (headerData?.analysis?.deflectionPoints) {
        this.drawEngineeringPath(this.openingsGroup, headerData.analysis.deflectionPoints, [pos.x - op.width/2, pos.y + op.height/2, pos.z], rotation, 0x00ffff, 100);
      }

      this.openingsGroup.add(mesh);
    });
  }

  private calculatePilePositions(width: number, length: number) {
    const SPACING_MAX = 2000; // Separación máxima entre pilotones (2 metros)
    const halfW = width / 2;
    const halfL = length / 2;
    const piles: { x: number; z: number }[] = [];

    // Función para calcular puntos intermedios
    const getPoints = (start: number, end: number, fixedCoord: number, isVertical: boolean) => {
        const distance = Math.abs(end - start);
        const count = Math.max(1, Math.ceil(distance / SPACING_MAX));
        const step = distance / count;
        
        for (let i = 0; i <= count; i++) {
        const current = start + (i * step);
        piles.push({
            x: isVertical ? fixedCoord : current,
            z: isVertical ? current : fixedCoord
        });
        }
    };

    // 1. Esquinas y tramos Norte/Sur (Ancho)
    getPoints(-halfW, halfW, -halfL, false); // Muro Norte
    getPoints(-halfW, halfW, halfL, false);  // Muro Sur

    // 2. Tramos Este/Oeste (Largo) - Evitando duplicar esquinas si es posible
    // Pero para simplificar y asegurar apoyo, lo recorremos completo
    getPoints(-halfL + 200, halfL - 200, -halfW, true); // Muro Oeste
    getPoints(-halfL + 200, halfL - 200, halfW, true);  // Muro Este

    return piles;
  }

  private renderHumanScale() {
     const exists = this.houseGroup.getObjectByName('humanScale');
     if (exists) return;

     const group = new THREE.Group();
     group.name = 'humanScale';
     group.position.set(2000, 0, 2000);

     const body = new THREE.Mesh(
       new THREE.CylinderGeometry(150, 150, 1500, 12),
       new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 })
     );
     body.position.y = 750;
     group.add(body);

     const head = new THREE.Mesh(
       new THREE.SphereGeometry(150, 16, 16),
       new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
     );
     head.position.y = 1650;
     group.add(head);

     this.houseGroup.add(group);
  }

  private renderFoundation(res: any, config: SteelHouseConfig) {
    const fConfig = config.foundation || { slabThickness: 150, edgeBeamDepth: 300, pileDepth: 3000, pileDiameter: 200, soil: {bearingCapacityKPa: 150} };
    const overhang = 500; // 50cm vereda

    // 1. Platea (Slab) - Ancho + 1000mm (50cm cada lado)
    const slabW = config.width + (overhang * 2);
    const slabL = config.length + (overhang * 2);
    const slabGeom = new THREE.BoxGeometry(slabW, fConfig.slabThickness, slabL);
    const slabMat = new THREE.MeshStandardMaterial({ 
      color: this.colors.concrete, 
      transparent: true, 
      opacity: 0.7,
      roughness: 0.8
    });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    // Posición: el tope en y=0, por lo tanto bajamos medio espesor
    slab.position.set(0, -fConfig.slabThickness / 2, 0);
    slab.receiveShadow = true;
    this.houseGroup.add(slab);

    // 2. Malla Sima Rectangular (Visualización Técnica)
    const gridGroup = new THREE.Group();
    const step = 150; // 15x15cm
    const gridMat = new THREE.LineBasicMaterial({ color: this.colors.rebar, transparent: true, opacity: 0.5 });
    const gridPoints: THREE.Vector3[] = [];

    // Líneas Longitudinales (Ancho)
    for (let x = -slabW/2; x <= slabW/2; x += step) {
        gridPoints.push(new THREE.Vector3(x, -5, -slabL/2));
        gridPoints.push(new THREE.Vector3(x, -5, slabL/2));
    }
    // Líneas Transversales (Largo)
    for (let z = -slabL/2; z <= slabL/2; z += step) {
        gridPoints.push(new THREE.Vector3(-slabW/2, -5, z));
        gridPoints.push(new THREE.Vector3(slabW/2, -5, z));
    }

    const gridGeom = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const lineGrid = new THREE.LineSegments(gridGeom, gridMat);
    this.houseGroup.add(lineGrid);

    // 3. Pilotones (Piles) - Dinámicos bajo el eje del muro
    // Usar el resultado del motor si existe, si no, usar la lógica local instantánea
    const pilePositions = res?.piles || this.calculatePilePositions(config.width, config.length);

    pilePositions.forEach((p: any, idx: number) => {
        const pileGeom = new THREE.CylinderGeometry(fConfig.pileDiameter/2, fConfig.pileDiameter/2, fConfig.pileDepth, 16);
        const pileMat = new THREE.MeshStandardMaterial({ color: this.colors.concrete, transparent: true, opacity: 0.5 });
        const pile = new THREE.Mesh(pileGeom, pileMat);
        // Comienzan bajo la platea
        pile.position.set(p.x, -fConfig.pileDepth/2 - fConfig.slabThickness, p.z);
        this.houseGroup.add(pile);

        // Armadura X-Ray
        if (config.xRayMode) {
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4;
            const r = fConfig.pileDiameter/2 - 25;
            const bar = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, fConfig.pileDepth + 200, 8), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
            bar.position.set(p.x + Math.cos(angle) * r, -fConfig.pileDepth/2 - fConfig.slabThickness, p.z + Math.sin(angle) * r);
            this.houseGroup.add(bar);
          }
        }
    });

    // 4. Viga de Borde (Visualización Técnica)
    const ebGeom = new THREE.BoxGeometry(config.width + 40, fConfig.edgeBeamDepth, config.length + 40);
    const ebMat = new THREE.MeshStandardMaterial({ color: this.colors.concrete, wireframe: true, transparent: true, opacity: 0.2 });
    const eb = new THREE.Mesh(ebGeom, ebMat);
    eb.position.set(0, -fConfig.edgeBeamDepth / 2, 0);
    this.houseGroup.add(eb);
  }
  private renderLoadPath(wall: SteelWall, processed: any, group: THREE.Group, config: SteelHouseConfig, structuralResult: any) {
    const loadData = StructuralEngine.calculateVerticalLoadPath(config);
    
    // 1. Flecha de Carga de Techo -> Muro
    processed.panels.forEach((p: any) => {
      const mag = loadData.roofReactionKg;
      const length = Math.max(200, (mag / 1000) * 1000); // 1kg = 1mm para escala visual
      const dir = new THREE.Vector3(0, -1, 0);
      const origin = new THREE.Vector3(p.xStart + p.width/2, wall.height + 200, 0);
      
      const arrow = new THREE.ArrowHelper(dir, origin, length, 0xef4444, 100, 50);
      group.add(arrow);

      // Etiqueta de Carga
      const label = this.createTextLabel(`${Math.round(mag)}kg`);
      label.position.set(p.xStart + p.width/2, wall.height + 400, 0);
      label.scale.set(300, 150, 1);
      group.add(label);
    });

    // 2. Reacción en Pilotones (Basado en Auditoría Geotécnica)
    if (config.layers.foundation && structuralResult.foundation) {
        structuralResult.foundation.piles.forEach((pile: any) => {
            const mag = pile.load;
            const arrowLen = Math.min(600, Math.max(200, (mag / 500) * 100)); // Escala visual 500kg = 100mm
            const color = pile.isSafe ? 0x22c55e : 0xef4444; // Verde si es seguro, Rojo si falla
            
            const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(pile.x, -50, pile.z), arrowLen, color, 100, 50);
            this.houseGroup.add(arrow);

            // Etiqueta de Carga de Suelo (Opcional en modo estructural)
            if (config.structuralMode) {
                const fConfig = config.foundation || { slabThickness: 120 };
                const label = this.createTextLabel(`${Math.round(mag)}kg / ${Math.round(pile.capacity)}kg`);
                label.position.set(pile.x, -fConfig.slabThickness - 200, pile.z);
                label.scale.set(400, 200, 1);
                this.houseGroup.add(label);
            }
        });
    }
  }

  private renderWindVectors(wall: SteelWall, stability: any, group: THREE.Group, config: SteelHouseConfig) {
    const isX = Math.abs(wall.rotation % 180) === 0;
    const isZ = Math.abs(wall.rotation % 180) === 90;
    
    const windForce = isX ? stability.windForceX : (isZ ? stability.windForceZ : 0);
    if (windForce < 1) return;

    // Flechas de viento horizontales impactando el muro
    const numArrows = Math.ceil(wall.length / 2000);
    const spacing = wall.length / numArrows;

    for (let i = 0; i < numArrows; i++) {
        const dir = isX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
        const origin = new THREE.Vector3(i * spacing + spacing/2, wall.height * 0.7, -500);
        
        // La flecha viene de afuera hacia el muro
        const arrow = new THREE.ArrowHelper(dir, origin, 400, 0x06b6d4, 100, 50);
        group.add(arrow);
    }

    // Etiqueta de Presión Total
    const label = this.createTextLabel(`VIENTO: ${Math.round(windForce)}kN`);
    label.position.set(wall.length / 2, wall.height + 600, -200);
    label.scale.set(400, 200, 1);
    group.add(label);
  }

  private updateExplodedPosition(group: THREE.Group, id: string, config: SteelHouseConfig) {
    if (!config.explosionFactor) {
        group.position.copy(this.initialPositions.get(id) || new THREE.Vector3());
        return;
    }

    const initial = this.initialPositions.get(id) || new THREE.Vector3();
    const center = new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3().copy(initial).sub(center).normalize();
    
    // Si el muro está muy en el centro, usar su orientación
    if (dir.length() < 0.1) {
        const rad = (group.rotation.y);
        dir.set(Math.sin(rad), 0, Math.cos(rad));
    }

    const offset = dir.multiplyScalar(config.explosionFactor * 2000); // 2 metros de explosión máx
    group.position.copy(initial).add(offset);
  }

  private updateXRayMaterials(group: THREE.Group, config: SteelHouseConfig) {
    group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
            const isStructural = obj.name.includes('stud') || obj.name.includes('header') || obj.name.includes('beam');
            
            if (!isStructural && config.xRayMode) {
                obj.material.transparent = true;
                obj.material.opacity = 0.15;
                obj.material.depthWrite = false;
            } else if (!isStructural) {
                obj.material.transparent = false;
                obj.material.opacity = 1.0;
                obj.material.depthWrite = true;
            }

            // Heatmap de estrés en modo Rayos X
            if (isStructural && config.xRayMode && obj.userData.stressRatio > 0.9) {
                obj.material.emissive = new THREE.Color(0xff0000);
                obj.material.emissiveIntensity = 0.5;
            } else if (isStructural) {
                obj.material.emissive = new THREE.Color(0x000000);
            }
        }
    });
  }

  private clearAlerts() {
    this.alertsContainer.innerHTML = '';
    this.alertElements = [];
  }

  private addStructuralAlert(status: 'FAIL' | 'WARN', message: string, pos: THREE.Vector3, data: any) {
    const el = document.createElement('div');
    el.className = `absolute px-2 py-1 rounded text-[10px] font-bold text-white shadow-xl border border-white/30 backdrop-blur-sm pointer-events-auto transition-transform hover:scale-110 ${status === 'FAIL' ? 'bg-red-600' : 'bg-amber-500'}`;
    
    const recHtml = data?.recommendation ? `<div class="mt-2 pt-1 border-t border-white/20 text-[7px] italic text-yellow-200">💡 Sugerencia: ${data.recommendation}</div>` : '';
    const justifyHtml = data?.justification ? `<div class="mt-1 text-[7px] text-cyan-200 opacity-80">⚖️ ${data.justification}</div>` : '';

    el.innerHTML = `
      <div class="flex items-center gap-1 border-b border-white/20 mb-1 pb-1">
        <span>${status === 'FAIL' ? '🚫' : '⚠️'}</span>
        <span class="uppercase">${status}</span>
      </div>
      <div>${message}</div>
      <div class="mt-1 text-[8px] bg-black/20 p-1 rounded flex justify-between">
        <span>CALC: ${(data?.calculated ?? 0).toFixed(3)}</span>
        <span>LIM: ${(data?.limit ?? 0).toFixed(3)}</span>
      </div>
      ${justifyHtml}
      ${recHtml}
    `;
    this.alertsContainer.appendChild(el);
    this.alertElements.push({ el, pos });
  }

  private updateAlerts() {
    this.alertElements.forEach(({ el, pos }) => {
        const v = pos.clone().project(this.camera);
        const x = (v.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-(v.y * 0.5 - 0.5)) * this.container.clientHeight;
        
        // Ocultar si está detrás de la cámara
        if (v.z > 1) {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
            el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        }
    });
  }

  private updateBlueprintStyle(group: THREE.Group, config: SteelHouseConfig) {
    if (!config.blueprintMode) {
        this.scene.background = new THREE.Color(this.colors.background);
        return;
    }

    this.scene.background = new THREE.Color(0x001a33); // Azul profundo

    group.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
            const isStructural = obj.name.includes('stud') || obj.name.includes('header') || obj.name.includes('beam');
            
            if (isStructural) {
                obj.material.color = new THREE.Color(0x00ffff); // Neón
                obj.material.emissive = new THREE.Color(0x00ffff);
                obj.material.emissiveIntensity = 0.5;
                obj.material.wireframe = true;
            } else {
                obj.material.transparent = true;
                obj.material.opacity = 0.05;
                obj.material.color = new THREE.Color(0xffffff);
            }
        }
    });

    // Grilla técnica
    const grid = new THREE.GridHelper(20000, 20, 0x00ffff, 0x0a2a4a);
    grid.position.y = -10;
    grid.name = 'blueprintGrid';
    if (!this.scene.getObjectByName('blueprintGrid')) this.scene.add(grid);
  }




  private updateLoadVectors(group: THREE.Group, wall: SteelWall, config: SteelHouseConfig) {
    // Limpiar vectores previos en este grupo
    const existing = group.getObjectByName('loadVectors');
    if (existing) group.remove(existing);
    
    if (!config.layers.structuralDiagrams) return;

    const vectorGroup = new THREE.Group();
    vectorGroup.name = 'loadVectors';

    // Para cada montante calculado (simplificado aquí por longitud)
    const numStuds = Math.ceil(wall.length / wall.studSpacing) + 1;
    for (let i = 0; i < numStuds; i++) {
        const x = i * wall.studSpacing;
        const load = 500; // Valor de carga acumulada (en un sistema real vendría del structuralEngine.traceLoads)
        
        const dir = new THREE.Vector3(0, -1, 0);
        const origin = new THREE.Vector3(x, wall.height, 0);
        const length = load / 50; // Escala visual
        const color = load > 800 ? 0xff0000 : 0x00ff00;
        
        const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color, length * 0.2, length * 0.1);
        vectorGroup.add(arrowHelper);
    }

    group.add(vectorGroup);
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse(c => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('dblclick', this.onDoubleClick);
    this.renderer.dispose();
    this.controls.dispose();
  }
}
