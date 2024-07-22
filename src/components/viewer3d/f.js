import React from 'react';
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

class CustomScene extends THREE.Scene {
    constructor(model, canvasHolder, options) {
        super();
   
        this.__physicalRoomItems = [];
        this.__enabled = false;
        this.model = model;
        this.floorplan = model.floorplan;
        this.__options = options;
        this.__canvasholder = canvasHolder;
        this.cameraNear = 10;
        this.cameraFar = 100000;
        this.needsUpdate = true;
        this.lastRender = Date.now();
        this.edges3d = [];
        this.floors3d = [];
        this.__currentItemSelected = null;
        this.__currentLightSelected = null;
    }
}

class Viewer3D extends React.Component {
    constructor(props) {
        super(props);
        this.viewapp = new CustomScene(props.model, props.canvasHolderRef, props.opts);
        this.canvasHolderRef = React.createRef();
    }

    componentDidMount() {
        this.initializeScene();
        window.addEventListener('resize', this.updateWindowSize);
        window.addEventListener('orientationchange', this.updateWindowSize);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowSize);
        window.removeEventListener('orientationchange', this.updateWindowSize);
        if (this.viewapp.renderer) {
            this.canvasHolderRef.current.removeChild(this.viewapp.renderer.domElement);
        }
    }

    initializeScene = () => {
        const canvasHolder = this.canvasHolderRef.current;
        const { model } = this.props;
        let opts = {
            viewer3d: {
                id: 'bp3djs-viewer3d',
                viewer3dOptions: {
                    occludedWalls: false,
                    occludedRoofs: false
                }
            },
            textureDir: "models/textures/",
            widget: false,
            resize: true,
        };
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
        this.viewapp = new CustomScene(model, canvasHolder, options);
        this.viewapp.background = new THREE.Color(0xffffff);

        this.viewapp.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            this.viewapp.cameraNear,
            this.viewapp.cameraFar
        );
        this.viewapp.camera.position.set(0, 600, 1500);

        this.viewapp.environmentCamera = new THREE.CubeCamera(1, 100000, new THREE.WebGLCubeRenderTarget(16, {
            format: THREE.RGBAFormat,
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter
        }));

        this.viewapp.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.viewapp.renderer.setSize(window.innerWidth, window.innerHeight);
        this.viewapp.renderer.shadowMap.enabled = true;
        this.viewapp.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.viewapp.renderer.physicallyCorrectLights = true;
        this.viewapp.renderer.setClearColor(0x000000, 0.0);
        this.viewapp.renderer.outputEncoding = THREE.SRGBColorSpace; // Change to LinearEncoding or another available encoding
        this.viewapp.renderer.toneMapping = THREE.NoToneMapping;
        this.viewapp.renderer.setPixelRatio(window.devicePixelRatio);

        canvasHolder.appendChild(this.viewapp.renderer.domElement);

        this.viewapp.dragcontrols = new DragRoomItemsControl3D(
            model.floorplan.wallPlanesForIntersection,
            model.floorplan.floorPlanesForIntersection,
            this.viewapp.__physicalRoomItems,
            this.viewapp,
            this.viewapp.renderer.domElement
        );

        this.viewapp.controls = new OrbitControls(this.viewapp.camera, this.viewapp.renderer.domElement);
        this.viewapp.controls.enableDamping = false;
        this.viewapp.controls.dampingFactor = 0.1;
        this.viewapp.controls.maxPolarAngle = Math.PI * 1.0;
        this.viewapp.controls.maxDistance = Configuration.getNumericValue(viewBounds);
        this.viewapp.controls.minDistance = 100;
        this.viewapp.controls.screenSpacePanning = true;

        this.viewapp.skybox = new Skybox(this.viewapp, this.viewapp.renderer);

        this.viewapp.controls.update();

        const axesHelper = new THREE.AxesHelper(500);
        this.viewapp.add(axesHelper);

        this.viewapp.model.addEventListener(EVENT_NEW_ITEM, (evt) => this.__addNewItem(evt));
        this.viewapp.model.addEventListener(EVENT_MODE_RESET, (evt) => this.__resetDesign(evt));
        this.viewapp.model.addEventListener(EVENT_LOADED, (evt) => this.addRoomItems(evt));
        this.viewapp.floorplan.addEventListener(EVENT_NEW_ROOMS_ADDED, (evt) => this.addRoomsAndWalls(evt));
        this.viewapp.controls.addEventListener('change', () => { this.viewapp.needsUpdate = true; });

        this.viewapp.dragcontrols.addEventListener(EVENT_ITEM_SELECTED, (evt) => this.__roomItemSelected(evt));
        this.viewapp.dragcontrols.addEventListener(EVENT_ITEM_MOVE, (evt) => this.__roomItemDragged(evt));
        this.viewapp.dragcontrols.addEventListener(EVENT_ITEM_MOVE_FINISH, (evt) => this.__roomItemDragFinish(evt));
        this.viewapp.dragcontrols.addEventListener(EVENT_NO_ITEM_SELECTED, (evt) => this.__roomItemUnselected(evt));
        this.viewapp.dragcontrols.addEventListener(EVENT_WALL_CLICKED, (evt) => this.__wallSelected(evt));
        this.viewapp.dragcontrols.addEventListener(EVENT_ROOM_CLICKED, (evt) => this.__roomSelected(evt));
        this.addRoomsAndWalls(this.viewapp);

        this.renderLoop();
    }

    renderLoop = () => {
        requestAnimationFrame(this.renderLoop);
        if (this.viewapp.needsUpdate) {
            this.viewapp.renderer.render(this.viewapp, this.viewapp.camera);
            this.viewapp.needsUpdate = false;
        }
    };

    updateWindowSize = () => {
        const heightMargin = this.viewapp.__canvasholder.offsetTop;
        const widthMargin = this.viewapp.__canvasholder.offsetLeft;
        const elementWidth = this.viewapp.__options.resize ? window.innerWidth - widthMargin : this.viewapp.__canvasholder.clientWidth;
        const elementHeight = this.viewapp.__options.resize ? window.innerHeight - heightMargin : this.viewapp.__canvasholder.clientHeight;

        this.viewapp.camera.aspect = elementWidth / elementHeight;
        this.viewapp.camera.updateProjectionMatrix();
        this.viewapp.renderer.setSize(elementWidth, elementHeight);
        this.viewapp.needsUpdate = true;
    };

    __focusOnWallOrRoom = (normal, center, distance, y) => {
        const cameraPosition = center.clone().add(normal.clone().multiplyScalar(distance));
        this.viewapp.controls.target.copy(center);
        this.viewapp.camera.position.copy(cameraPosition);
        this.viewapp.controls.update();
        this.viewapp.needsUpdate = true;
    };

    __wallSelected = (evt) => {
        const edge = evt.item;
        const y = Math.max(edge.wall.startElevation, edge.wall.endElevation) * 0.5;
        const center2d = edge.interiorCenter();
        const center = new Vector3(center2d.x, y, center2d.y);
        const distance = edge.interiorDistance() * 1.5;
        const normal = evt.normal;

        this.__focusOnWallOrRoom(normal, center, distance, y);
        this.viewapp.dispatchEvent(evt);
    };

    __addNewItem = (evt) => {
        if (!evt.item) {
            return;
        }

        const physicalRoomItem = new Physical3DItem(evt.item, this.viewapp.dragcontrols, this.viewapp.__options);
        this.viewapp.scene.add(physicalRoomItem);
        this.viewapp.__physicalRoomItems.push(physicalRoomItem);
        this.__roomItemSelected({ type: EVENT_ITEM_SELECTED, item: physicalRoomItem });
    };

    __roomSelected = (evt) => {
        const room = evt.item;
        const y = room.corners[0].elevation;
        const normal = room.normal.clone();
        const center2d = room.areaCenter.clone();
        const center = new Vector3(center2d.x, 0, center2d.y);
        const distance = y * 3.0;

        this.__focusOnWallOrRoom(normal, center, distance, y);
        this.viewapp.dispatchEvent(evt);
    };

    __roomItemSelected = (evt) => {
        if (this.viewapp.__currentItemSelected) {
            this.viewapp.__currentItemSelected.selected = false;
        }

        this.viewapp.controls.enabled = false;
        this.viewapp.__currentItemSelected = evt.item;
        evt.item.selected = true;
        this.viewapp.__currentItemSelected.selected = true;
        this.viewapp.needsUpdate = true;
        if (this.viewapp.__currentItemSelected.itemModel !== undefined) {
            evt.itemModel = this.viewapp.__currentItemSelected.itemModel;
        }
        this.viewapp.dispatchEvent(evt);
    };

    __roomItemDragged = (evt) => {
        this.viewapp.controls.enabled = false;
        this.viewapp.needsUpdate = true;
        this.viewapp.dispatchEvent(evt);
    };

    __roomItemDragFinish = (evt) => {
        this.viewapp.controls.enabled = false;
        this.viewapp.dispatchEvent(evt);
    };

    __roomItemUnselected = (evt) => {
        this.viewapp.__currentItemSelected.selected = false;
        this.viewapp.__currentItemSelected = null;
        this.viewapp.dispatchEvent(evt);
    };

    __resetDesign = (evt) => {
        this.viewapp.__physicalRoomItems = [];
        this.viewapp.__currentItemSelected = null;
        this.viewapp.dispatchEvent(evt);
    };

    addRoomsAndWalls = () => {
        let scope = this.viewapp;
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
            threeFloor = new Floor3D(scope, rooms[i], scope.controls, scope.__options);
            scope.floors3d.push(threeFloor);
        }
        for (i = 0; i < wallEdges.length; i++) {
            edge3d = new Edge3D(scope, wallEdges[i], scope.controls, scope.__options);
            scope.edges3d.push(edge3d);
        }
        floorplanDimensions = scope.floorplan.getDimensions();
        floorplanCenter = scope.floorplan.getDimensions(true);
        multiplier = 1.5;
        ymultiplier = 0.5;

        if (scope.floorplan.corners.length) {
            scope.controls.target = floorplanCenter.clone();
            scope.camera.position.set(floorplanDimensions.x * multiplier, floorplanDimensions.length() * ymultiplier, floorplanDimensions.z * multiplier);
            scope.controls.update();
            scope.shouldRender = true;
        }
    };

    addRoomItems = () => {
        let i = 0;
        let j = 0;
        for (; i < this.viewapp.__physicalRoomItems.length; i++) {
            this.viewapp.__physicalRoomItems[i].dispose();
            this.viewapp.remove(this.__physicalRoomItems[i]);
        }
        this.viewapp.__physicalRoomItems.length = 0; //A cool way to clear an array in javascript
        let roomItems = this.viewapp.model.roomItems;
        for (i = 0; i < roomItems.length; i++) {
            let physicalRoomItem = new Physical3DItem(roomItems[i], this.viewapp.dragcontrols, this.viewapp.__options);
            this.viewapp.add(physicalRoomItem);
            this.viewapp.__physicalRoomItems.push(physicalRoomItem);
        }
    };
    addRoomplanListener(type, listener) {
        this.viewapp.addEventListener(type, listener);
    }

    removeRoomplanListener(type, listener) {
        this.viewapp.removeEventListener(type, listener);
    }
    render() {
        return <div ref={this.canvasHolderRef}></div>;
    }
}

export default Viewer3D;
