
import * as THREE from 'three';
import {
    EVENT_ITEM_SELECTED,
    EVENT_ITEM_MOVE,
    EVENT_ITEM_MOVE_FINISH,
    EVENT_NO_ITEM_SELECTED,
    EVENT_WALL_CLICKED,
    EVENT_ROOM_CLICKED,
    EVENT_NEW_ITEM,
    EVENT_MODE_RESET,
    EVENT_LOADED,
    EVENT_NEW_ROOMS_ADDED,
} from '../core/events.js';
import { DragRoomItemsControl3D } from './DragRoomItemsControl3D.js';
import { Configuration, viewBounds } from '../core/configuration.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Skybox } from './skybox.js';
import { Physical3DItem } from './Physical3DItem.js';
import { Edge3D } from './edge3d.js';
import { Floor3D } from './floor3d.js';
import { Vector3 } from 'three';

export const states = { UNSELECTED: 0, SELECTED: 1, DRAGGING: 2, ROTATING: 3, ROTATING_FREE: 4, PANNING: 5 };



class Viewer3D extends THREE.Scene {
    constructor( model,element, opts) {
        super();
       
       // this.viewapp = new CustomScene(model, element ,opts);
       let options = {
        occludedRoofs: false,
        occludedWalls: false,
        resize: true,
        pushHref: false,
        spin: true,
        spinSpeed: .00002,
        clickPan: true,
        canMoveFixedItems: false,
        gridVisibility: false,
        groundArrowhelper: false
    };
    for (let opt in options) {
        if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
            options[opt] = opts[opt];
        }
    }
    this.__physicalRoomItems = [];
    this.__enabled = false;
    this.model = model;
    this.floorplan = this.model.floorplan;
    this.__options = options;
    this.domElement = element.current;
    this.perspectivecamera = null;
    this.camera = null;
    this.__environmentCamera = null;

    this.cameraNear = 10;
    this.cameraFar = 100000;
    this.controls = null;

    this.renderer = null;
    this.controller = null;

    this.needsUpdate = false;
    this.lastRender = Date.now();

    this.heightMargin = null;
    this.widthMargin = null;
    this.elementHeight = null;
    this.elementWidth = null;
    this.pauseRender = false;

    this.edges3d = [];
    this.floors3d = [];
    this.__currentItemSelected = null;
    this.__currentLightSelected = null;
    this.__rgbeLoader = null;

    this.needsUpdate = true;

    this.__newItemEvent = this.__addNewItem.bind(this);        
    this.__wallSelectedEvent = this.__wallSelected.bind(this);
    this.__roomSelectedEvent = this.__roomSelected.bind(this);
    this.__roomItemSelectedEvent = this.__roomItemSelected.bind(this);
    this.__roomItemUnselectedEvent = this.__roomItemUnselected.bind(this);
    this.__roomItemDraggedEvent = this.__roomItemDragged.bind(this);
    this.__roomItemDragFinishEvent = this.__roomItemDragFinish.bind(this);   
    
    this.__resetDesignEvent = this.__resetDesign.bind(this);

    this.init();        
    }

   

    init = () => {

        let scope = this;
        scope.scene = new THREE.Scene();
        this.name = 'Scene';
        scope.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, scope.cameraNear, scope.cameraFar);
     //   let cubeRenderTarget = new WebGLCubeRenderTarget(16, { format: RGBFormat, generateMipmaps: true, minFilter: LinearMipmapLinearFilter });
        scope.__environmentCamera =  new THREE.CubeCamera(1, 100000, new THREE.WebGLCubeRenderTarget(16, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter
        }));
        scope.__environmentCamera.renderTarget.texture.encoding = THREE.SRGBColorSpace;

        scope.renderer = scope.getARenderer();
        scope.domElement.appendChild(scope.renderer.domElement);

        scope.dragcontrols = new DragRoomItemsControl3D(this.floorplan.wallPlanesForIntersection, this.floorplan.floorPlanesForIntersection, this.physicalRoomItems, scope, scope.renderer.domElement);
        scope.controls = new OrbitControls(scope.camera, scope.domElement);

        // scope.controls.autoRotate = this.__options['spin'];
        scope.controls.enableDamping = false;
        scope.controls.dampingFactor = 0.1;
        scope.controls.maxPolarAngle = Math.PI * 1.0; //Math.PI * 0.35;//Math.PI * 1.0; //
        scope.controls.maxDistance = Configuration.getNumericValue(viewBounds);// 7500; //2500
        scope.controls.minDistance = 100; //1000; //1000
        scope.controls.screenSpacePanning = true;

        scope.skybox = new Skybox(this, scope.renderer);
        scope.camera.position.set(0, 600, 1500);
        scope.controls.update();


        scope.axes = new THREE.AxesHelper(500);  

        // handle window resizing
        scope.updateWindowSize();

        if (scope.__options.resize) {
            window.addEventListener('resize', () => { scope.updateWindowSize(); });
            window.addEventListener('orientationchange', () => { scope.updateWindowSize(); });
        }
        
       // this.viewapp = new CustomScene(model, canvasHolder, options);
       scope.model.addEventListener(EVENT_NEW_ITEM, scope.__newItemEvent);
       scope.model.addEventListener(EVENT_MODE_RESET, scope.__resetDesignEvent);
       scope.model.addEventListener(EVENT_LOADED, scope.addRoomItems.bind(scope));
       scope.floorplan.addEventListener(EVENT_NEW_ROOMS_ADDED, scope.addRoomsAndWalls.bind(scope));
       scope.controls.addEventListener('change', () => { scope.needsUpdate = true; });
       
       
       scope.dragcontrols.addEventListener(EVENT_ITEM_SELECTED, this.__roomItemSelectedEvent);
       scope.dragcontrols.addEventListener(EVENT_ITEM_MOVE, this.__roomItemDraggedEvent);
       scope.dragcontrols.addEventListener(EVENT_ITEM_MOVE_FINISH, this.__roomItemDragFinishEvent);
       scope.dragcontrols.addEventListener(EVENT_NO_ITEM_SELECTED, this.__roomItemUnselectedEvent);
       scope.dragcontrols.addEventListener(EVENT_WALL_CLICKED, this.__wallSelectedEvent);
       scope.dragcontrols.addEventListener(EVENT_ROOM_CLICKED, this.__roomSelectedEvent);
       

       // scope.controls.enabled = false;//To test the drag controls        
       //SEt the animation loop
       scope.renderer.setAnimationLoop(scope.render.bind(this));
      
       scope.render();
    }
    __focusOnWallOrRoom(normal, center, distance, y=0){
        let cameraPosition = center.clone().add(normal.clone().multiplyScalar(distance));        
        this.controls.target = center.clone(); 
        this.camera.position.copy(cameraPosition);
        this.controls.update();
        this.needsUpdate = true;
    }

    __wallSelected(evt) {
        let edge = evt.item;
        let y = Math.max(edge.wall.startElevation, edge.wall.endElevation) * 0.5;
        let center2d = edge.interiorCenter();
        let center = new Vector3(center2d.x, y, center2d.y);
        let distance = edge.interiorDistance() * 1.5;
        let normal = evt.normal;

        this.__focusOnWallOrRoom(normal, center, distance, y);
        this.dispatchEvent(evt);
    }
    __roomSelected(evt) {
        let room = evt.item;
        let y = room.corners[0].elevation;
        let normal = room.normal.clone();
        let center2d = room.areaCenter.clone();
        let center = new Vector3(center2d.x, 0, center2d.y);
        let distance = y * 3.0;
        this.__focusOnWallOrRoom(normal, center, distance, y);
        this.dispatchEvent(evt);
    }

    __roomItemSelected(evt) {
        if (this.__currentItemSelected) {
            this.__currentItemSelected.selected = false;
        }
        this.controls.enabled = false;
        this.__currentItemSelected = evt.item;
        this.__currentItemSelected.selected = true;
        this.needsUpdate = true;
        if (this.__currentItemSelected.itemModel != undefined) {
            evt.itemModel = this.__currentItemSelected.itemModel;
        }
        this.dispatchEvent(evt);
    }

    __roomItemDragged(evt) {        
        this.controls.enabled = false;
        this.needsUpdate = true;
    }

    __roomItemDragFinish(evt) {
        this.controls.enabled = true;
    }

    __roomItemUnselected(evt) {
        this.controls.enabled = true;
        if (this.__currentItemSelected) {
            this.dragcontrols.selected = null;
            this.__currentItemSelected.selected = false;
            this.__currentItemSelected = null;
            this.needsUpdate = true;
        }
        this.dispatchEvent(evt);
    }

    __addNewItem(evt) {
        if (!evt.item) {
            return;
        }
      
        
        let physicalRoomItem = new Physical3DItem(evt.item, this.dragcontrols, this.__options);
        this.add(physicalRoomItem);
        this.__physicalRoomItems.push(physicalRoomItem);
        this.__roomItemSelected({ type: EVENT_ITEM_SELECTED, item: physicalRoomItem });
        // this.dragcontrols.enabled = true;
        // this.dragcontrols.selected = physicalRoomItem;
        // this.needsUpdate = true;
    }

    __resetDesign(evt) {
        this.dragcontrols.selected = null;
        this.__physicalRoomItems.length = 0;
        this.edges3d.length = 0;
        this.floors3d.length = 0;
    }

    addRoomItems(evt) {
  
        let i = 0;
        let j = 0;
        for (; i < this.__physicalRoomItems.length; i++) {
            this.__physicalRoomItems[i].dispose();
            this.remove(this.__physicalRoomItems[i]);
        }
        this.__physicalRoomItems.length = 0; //A cool way to clear an array in javascript
        let roomItems = this.model.roomItems;
        for (i = 0; i < roomItems.length; i++) {
            let physicalRoomItem = new Physical3DItem(roomItems[i], this.dragcontrols, this.__options);
            this.add(physicalRoomItem);
            this.__physicalRoomItems.push(physicalRoomItem);
        }
    }

    addRoomsAndWalls() {
    
        let scope = this;
        let i = 0;
        let floorplanDimensions;
        let floorplanCenter;
        let multiplier;
        let ymultiplier;
        let wallEdges;
        let rooms;
        let threeFloor;
        let edge3d;
        scope.floors3d.forEach((floor) => {
            floor.destroy();
            floor = null;
        });
        scope.edges3d.forEach((edge3d) => {
            edge3d.remove();
            edge3d = null;
        });
        scope.edges3d = [];
        scope.floors3d = [];
        wallEdges = scope.floorplan.wallEdges();
        rooms = scope.floorplan.getRooms();
        // draw floors
        for (i = 0; i < rooms.length; i++) {
            threeFloor = new Floor3D(scope, rooms[i], scope.controls, this.__options);
            scope.floors3d.push(threeFloor);
        }
        for (i = 0; i < wallEdges.length; i++) {
            edge3d = new Edge3D(scope, wallEdges[i], scope.controls, this.__options);
            scope.edges3d.push(edge3d);
        }
        floorplanDimensions = scope.floorplan.getDimensions();
        floorplanCenter = scope.floorplan.getDimensions(true);
        multiplier = 1.5;
        ymultiplier = 0.5;
        
        if(scope.floorplan.corners.length){
            scope.controls.target = floorplanCenter.clone();
            scope.camera.position.set(floorplanDimensions.x*multiplier, floorplanDimensions.length()*ymultiplier, floorplanDimensions.z*multiplier);
            scope.controls.update();
            scope.shouldRender = true;
        }        
    }

    getARenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.autoClear = true; //true
        renderer.shadowMap.enabled = true;
        // renderer.shadowMapAutoUpdate = true;
        renderer.physicallyCorrectLights = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // renderer.setClearColor(0xFFFFFF, 1);
        renderer.setClearColor(0x000000, 0.0);
        renderer.outputEncoding = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        // renderer.toneMappingExposure = 0.5;
        // renderer.toneMappingExposure = Math.pow(0.7, 5.0);
        renderer.setPixelRatio(window.devicePixelRatio);
        return renderer;
    }

    updateWindowSize() {
        let heightMargin = this.domElement.offsetTop;
        let widthMargin = this.domElement.offsetLeft;
        let elementWidth = (this.__options.resize) ? window.innerWidth - widthMargin : this.domElement.clientWidth;
        let elementHeight = (this.__options.resize) ? window.innerHeight - heightMargin : this.domElement.clientHeight;

        this.camera.aspect = elementWidth / elementHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(elementWidth, elementHeight);
        this.needsUpdate = true;
    }
    render() {
       // console.log(this.enabled)
        if (!this.enabled || !this.needsUpdate) {
            return;
        }

        let scope = this;
        scope.renderer.render(scope, scope.camera);
        scope.lastRender = Date.now();
        this.needsUpdate = false;      
    }

    pauseTheRendering(flag) {
        this.needsUpdate = flag;
    }

    // exportSceneAsGTLF() {
    //     let scope = this;
    //     let exporter = new GLTFExporter();
    //     exporter.parse(this, function(gltf) {
    //         scope.dispatchEvent({ type: EVENT_GLTF_READY, gltf: JSON.stringify(gltf) });
    //     });
    // }

    forceRender() {
        let scope = this;
        scope.renderer.render(scope, scope.camera);
        scope.lastRender = Date.now();
    }

    addRoomplanListener(type, listener) {
        this.addEventListener(type, listener);
    }

    removeRoomplanListener(type, listener) {
        this.removeEventListener(type, listener);
    }
    get environmentCamera() {
        return this.__environmentCamera;
    }

    get physicalRoomItems() {
        return this.__physicalRoomItems;
    }

    get enabled() {
        return this.__enabled;
    }

    set enabled(flag) {
console.log(flag)
        this.dragcontrols.deactivate();
        this.__enabled = flag;
        this.controls.enabled = flag;
        if (flag) {
            this.dragcontrols.activate();
        }
    }
  
}


export default Viewer3D;
