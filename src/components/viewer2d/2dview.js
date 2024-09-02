import { Application, Graphics } from 'pixi.js';
import React, { Component } from 'react';
import { Grid2D } from './grid';
import { Viewport } from 'pixi-viewport';
import { Dimensioning } from '../core/dimensioning';
import { EventDispatcher, Vector2 } from 'three';
import { Configuration, snapToGrid, snapTolerance, viewBounds } from '../core/configuration';
import TemporaryWall from './TemporaryWall';
import { IS_TOUCH_DEVICE } from '../DeviceInfo';

import { CornerView2D } from './CornerView2D';
import { WallView2D } from './WallView2D';
import { RoomView2D } from './RoomView2D';
import { BoundaryView2D } from './BoundaryView2D';

import Room from '../model/room';
import { CornerGroupTransform2D } from './CornerGroupTransform2D';
import {
    EVENT_EXTERNAL_FLOORPLAN_LOADED, EVENT_MODE_RESET, EVENT_MOVED, EVENT_2D_SELECTED, EVENT_NEW, EVENT_DELETED,
    EVENT_NEW_ROOMS_ADDED, EVENT_LOADED, EVENT_NOTHING_2D_SELECTED, EVENT_CORNER_2D_CLICKED, EVENT_WALL_2D_CLICKED,
    EVENT_ROOM_2D_CLICKED
} from '../core/events';

export const floorplannerModes = { MOVE: 0, DRAW: 1, EDIT_ISLANDS: 2 };

Configuration.setValue(viewBounds, 10000);

class Viewer2D extends Component {
    constructor(canvasHolder, floorplan, options) {
        super();

        this.canvasHolderRef = canvasHolder;
        this.floorplan = floorplan;

        const app = new Application({
            width: window.innerWidth,

            height: window.innerHeight,
            resolution: 1,
            antialias: true,
            backgroundAlpha: true,
        });
        this.viewapp = app;
        this.viewapp.renderer.backgroundColor = 0xFFFFFF;
        this.viewapp.__eventDispatcher = new EventDispatcher();
        let opts = {
            'corner-radius': 12,
            'boundary-point-radius': 5.0,
            'boundary-line-thickness': 1.0,
            'boundary-point-color': '#D3D3D3',
            'boundary-line-color': '#F3F3F3',
            pannable: true,
            zoomable: true,
            dimlinecolor: '#3EDEDE',
            dimarrowcolor: '#000000',
            dimtextcolor: '#000000',
            scale: true,
            rotate: true,
            translate: true,
            resize: true,
        };
        this.viewapp.__mode = floorplannerModes.MOVE;
        this.viewapp.__options = opts;
        this.viewapp.__floorplan = this.floorplan;

        this.viewapp.__lastNode = null;
        this.viewapp.__corners2d = [];
        this.viewapp.__walls2d = [];
        this.viewapp.__rooms2d = [];
        this.viewapp.__entities2D = [];
        this.viewapp.__snapToGrid = false;

        this.viewapp.__externalCorners2d = [];
        this.viewapp.__externalWalls2d = [];
        this.viewapp.__externalRooms2d = [];
        this.viewapp.__externalEntities2d = [];
        this.viewapp.__worldWidth = 3000;
        this.viewapp.__worldHeight = 3000;
        this.viewapp.__currentWidth = 500;
        this.viewapp.__currentHeight = 500;
        const canvasHolder1 = this.canvasHolderRef.current;
        if (canvasHolder1) {


            this.viewapp.__canvasHolder = canvasHolder1;
        }

        this.viewapp._temporaryWall = new TemporaryWall();




        this.viewapp.__zoomedEvent = () => this.__zoomed();
        this.viewapp.__pannedEvent = () => this.__panned();
        this.viewapp.__resetFloorplanEvent = () => this.__drawExternalFloorplan();
        this.viewapp.__drawExternalFloorplanEvent = () => this.__drawExternalFloorplan();
        this.viewapp.__redrawFloorplanEvent = () => this.__redrawFloorplan();
        this.viewapp.__floorplanLoadedEvent = () => this.__center();
        this.viewapp.__selectionMonitorEvent = (evt) => this.__selectionMonitor(evt);
        this.viewapp.__cornerMovedEvent = (evt) => this.__cornerMoved(evt);

        this.viewapp.__drawModeMouseDownEvent = (evt) => this.__drawModeMouseDown(evt);
        this.viewapp.__drawModeMouseUpEvent = (evt) => this.__drawModeMouseUp(evt);
        this.viewapp.__drawModeMouseMoveEvent = (evt) => this.__drawModeMouseMove(evt);

        this.viewapp.__groupTransformer = new CornerGroupTransform2D(this.viewapp.__floorplan, this.viewapp.__options);

        this.viewapp.__groupTransformer.visible = false;
        this.viewapp.__groupTransformer.selected = null;
        this.viewapp._temporaryWall.visible = false;
        this.viewapp.__floorplanContainer = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: 3000,
            worldHeight: 3000,
            interaction: this.viewapp.renderer.plugins.interaction,
            passiveWheel: false,
        });
        this.viewapp._grid = new Grid2D(this.viewapp.view, this.viewapp.__options);
        let origin = new Graphics();
        this.viewapp.__floorplanElementsHolder = new Graphics();

        this.viewapp.__floorplanContainer.addChild(origin);

        this.viewapp.__floorplanContainer.addChild(this.viewapp._grid);
        this.viewapp.__floorplanContainer.addChild(this.viewapp.__floorplanElementsHolder);
        this.viewapp.__boundaryHolder = new Graphics();
        this.viewapp.__floorplanContainer.addChild(this.viewapp.__boundaryHolder);

        this.viewapp.__tempWallHolder = new Graphics();
        this.viewapp.__tempWallHolder.addChild(this.viewapp._temporaryWall);
        this.viewapp.stage.addChild(this.viewapp.__floorplanContainer);
        this.viewapp.stage.addChild(this.viewapp.__tempWallHolder);

        this.viewapp.__floorplanContainer.position.set(window.innerWidth * 0.5, window.innerHeight * 0.5);
        this.canvasHolderRef.current.appendChild(this.viewapp.view);


        this.viewapp.__floorplanContainer.addChild(this.viewapp.__groupTransformer);

        this.viewapp.__floorplanContainer.drag().pinch().wheel();

        this.viewapp.__floorplanContainer.on('zoomed', this.viewapp.__zoomedEvent);
        this.viewapp.__floorplanContainer.on('moved', this.viewapp.__pannedEvent);
        this.viewapp.__floorplanContainer.on('clicked', this.viewapp.__selectionMonitorEvent);

        this.viewapp.__floorplanContainer.on('mousedown', this.viewapp.__drawModeMouseDownEvent);
        this.viewapp.__floorplanContainer.on('mouseup', this.viewapp.__drawModeMouseUpEvent);
        this.viewapp.__floorplanContainer.on('mousemove', this.viewapp.__drawModeMouseMoveEvent);

        this.viewapp.__floorplanContainer.on('touchstart', this.viewapp.__drawModeMouseUpEvent);
        this.viewapp.__floorplanContainer.on('touchend', this.viewapp.__drawModeMouseUpEvent);
        this.viewapp.__floorplanContainer.on('touchmove', this.viewapp.__drawModeMouseMoveEvent);

        this.viewapp.__floorplan.addEventListener(EVENT_LOADED, this.viewapp.__floorplanLoadedEvent);
        this.viewapp.__floorplan.addEventListener(EVENT_NEW, this.viewapp.__redrawFloorplanEvent);
        this.viewapp.__floorplan.addEventListener(EVENT_DELETED, this.viewapp.__redrawFloorplanEvent);

        this.viewapp.__floorplan.addEventListener(EVENT_NEW_ROOMS_ADDED, this.viewapp.__redrawFloorplanEvent);
        this.viewapp.__floorplan.addEventListener(EVENT_MODE_RESET, this.viewapp.__resetFloorplanEvent);
        this.viewapp.__floorplan.addEventListener(EVENT_EXTERNAL_FLOORPLAN_LOADED, this.viewapp.__drawExternalFloorplanEvent);
        //   this.__drawExternalFloorplan();
        this.__center();
        this.switchMode(floorplannerModes.MOVE);
        this.state = {
            mode: floorplannerModes.MOVE,
        };
    }

    componentDidMount() {

        window.addEventListener('resize', this.handleWindowResize);
    }

    componentWillUnmount() {
        if (this.viewapp) {
            if (this.viewapp.__floorplanContainer) {
                this.viewapp.__floorplanContainer.off('zoomed', this.viewapp.__zoomedEvent);
                this.viewapp.__floorplanContainer.off('moved', this.viewapp.__pannedEvent);
                this.viewapp.__floorplanContainer.off('clicked', this.viewapp.__selectionMonitorEvent);
            }
        }
        if (this.viewapp) {
            if (this.viewapp.__floorplan) {
                this.viewapp.__floorplan.removeEventListener(EVENT_NEW, this.viewapp.__redrawFloorplanEvent);
                this.viewapp.__floorplan.removeEventListener(EVENT_DELETED, this.viewapp.__redrawFloorplanEvent);
                this.viewapp.__floorplan.removeEventListener(EVENT_LOADED, this.viewapp.__redrawFloorplanEvent);
            }
        }
        window.removeEventListener('resize', this.handleWindowResize);

        //this.canvasHolderRef.current.removeChild(this.viewapp.view);
        //this.viewapp.destroy(true);
    }


    __drawBoundary() {
        // return;

        if (this.viewapp.__boundaryRegion2D) {
            this.viewapp.__boundaryRegion2D.remove();
        }

        if (this.viewapp.__floorplan.boundary) {

            if (this.viewapp.__floorplan.boundary.isValid) {
                this.viewapp.__boundaryRegion2D = new BoundaryView2D(this.viewapp.__floorplan, this.viewapp__options, this.viewapp.__floorplan.boundary);
                this.viewapp.__boundaryHolder.addChild(this.viewapp.__boundaryRegion2D);

            }
        }
    }

    __zoomed() {
        let zoom = this.viewapp.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds));// * zoom;
        let maxZoomOut = Math.max(window.innerWidth, window.innerHeight) / bounds;
        zoom = (zoom < maxZoomOut) ? maxZoomOut : (zoom > 30) ? 30 : zoom;

        this.viewapp.__floorplanContainer.scale.x = this.viewapp.__floorplanContainer.scale.y = zoom;
        this.viewapp.__tempWallHolder.scale.x = this.viewapp.__tempWallHolder.scale.y = zoom;

        this.viewapp._grid.gridScale = this.viewapp.__floorplanContainer.scale.x;
    }

    __panned() {
        let zoom = this.viewapp.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;

        let xy = new Vector2(this.viewapp.__floorplanContainer.x, this.viewapp.__floorplanContainer.y);
        let topleft = new Vector2((-(bounds * 0.5)), (-(bounds * 0.5)));
        let bottomright = new Vector2(((bounds * 0.5)), ((bounds * 0.5)));

        // let windowSize = new Vector2(window.innerWidth, window.innerHeight);
        let windowSize = new Vector2(this.viewapp.__currentWidth, this.viewapp.__currentHeight);

        let xValue = Math.min(-topleft.x, xy.x);
        let yValue = Math.min(-topleft.y, xy.y);

        xValue = Math.max(windowSize.x - bottomright.x, xValue);
        yValue = Math.max(windowSize.y - bottomright.y, yValue);


        this.viewapp.__floorplanContainer.x = this.viewapp.__tempWallHolder.x = xValue;
        this.viewapp.__floorplanContainer.y = this.viewapp.__tempWallHolder.y = yValue;
    }

    __center() {
        let floorplanCenter = this.viewapp.__floorplan.getCenter();
        let zoom = this.viewapp.__floorplanContainer.scale.x;
        let windowSize = new Vector2(this.viewapp.__currentWidth, this.viewapp.__currentHeight);
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;
        // console.log(windowSize.x, windowSize.y);
        let x = (windowSize.x * 0.5) - (floorplanCenter.x * 0.5);// - (bounds*0.5);
        let y = (windowSize.y * 0.5) - (floorplanCenter.z * 0.5);// - (bounds*0.5);
        this.viewapp.__floorplanContainer.x = x;
        this.viewapp.__floorplanContainer.y = y;
        this.viewapp.__tempWallHolder.x = x;
        this.viewapp.__tempWallHolder.y = y;
    }
    __changeCursorMode() {
        let cursor = (this.viewapp.__mode === floorplannerModes.DRAW) ? 'crosshair' : 'pointer';
        this.viewapp.renderer.plugins.interaction.cursorStyles.crosshair = cursor;
        this.viewapp.renderer.plugins.interaction.cursorStyles.default = cursor;
        this.viewapp.renderer.plugins.interaction.setCursorMode(cursor);
    }

    __drawExternalFloorplan() {

        let scope = this.viewapp;
        let i = 0;
        // clear scene
        scope.__externalEntities2d.forEach((entity) => {
            entity.remove();
        });

        this.__drawBoundary();

        this.viewapp.__externalCorners2d = [];
        this.viewapp.__externalWalls2d = [];
        this.viewapp.__externalRooms2d = [];

        let rooms = this.viewapp.__floorplan.externalRooms;

        for (i = 0; i < rooms.length; i++) {
            let modelRoom = rooms[i];
            let roomView = new RoomView2D(this.viewapp.__floorplan, this.viewapp.__options, modelRoom);
            this.viewapp.__floorplanElementsHolder.addChild(roomView);
            this.viewapp.__externalRooms2d.push(roomView);
            this.viewapp.__externalEntities2d.push(roomView);
        }
        for (i = 0; i < this.viewapp.__floorplan.externalWalls.length; i++) {
            let modelWall = this.viewapp.__floorplan.externalWalls[i];
            let wallView = new WallView2D(this.viewapp.__floorplan, this.viewapp.__options, modelWall);
            this.viewapp.__floorplanElementsHolder.addChild(wallView);
            this.viewapp.__externalWalls2d.push(wallView);
            this.viewapp.__externalEntities2d.push(wallView);
        }
        for (i = 0; i < this.viewapp.__floorplan.externalCorners.length; i++) {
            let modelCorner = this.viewapp.__floorplan.externalCorners[i];
            let cornerView = new CornerView2D(this.viewapp.__floorplan, this.viewapp.__options, modelCorner);
            this.viewapp.__floorplanElementsHolder.addChild(cornerView);
            this.viewapp.__externalCorners2d.push(cornerView);
            this.viewapp.__externalEntities2d.push(cornerView);
        }
        this.handleWindowResize();
    }

    __redrawFloorplan() {

        let scope = this.viewapp;
        let i = 0;

        // clear scene
        scope.__entities2D.forEach((entity) => {
            entity.removeFloorplanListener(EVENT_2D_SELECTED, this.__selectionMonitorEvent);
            entity.remove();
        });

        this.__drawBoundary(this.viewapp);

        this.viewapp.__corners2d = [];
        this.viewapp.__walls2d = [];
        this.viewapp.__rooms2d = [];
        this.viewapp.__entities2D = [];

        let rooms = this.viewapp.__floorplan.getRooms();

        for (i = 0; i < rooms.length; i++) {

            let modelRoom = rooms[i];
            let roomView = new RoomView2D(this.viewapp.__floorplan, this.viewapp.__options, modelRoom);
            this.viewapp.__floorplanElementsHolder.addChild(roomView);
            this.viewapp.__rooms2d.push(roomView);
            this.viewapp.__entities2D.push(roomView);
            roomView.interactive = (this.viewapp.__mode === floorplannerModes.MOVE);
            roomView.addFloorplanListener(EVENT_2D_SELECTED, this.viewapp.__selectionMonitorEvent);
        }
        for (i = 0; i < this.viewapp.__floorplan.walls.length; i++) {
            let modelWall = this.viewapp.__floorplan.walls[i];
            let wallView = new WallView2D(this.viewapp.__floorplan, this.viewapp.__options, modelWall);
            this.viewapp.__floorplanElementsHolder.addChild(wallView);
            this.viewapp.__walls2d.push(wallView);
            this.viewapp.__entities2D.push(wallView);
            wallView.interactive = (this.viewapp.__mode === floorplannerModes.MOVE);
            wallView.addFloorplanListener(EVENT_2D_SELECTED, this.viewapp.__selectionMonitorEvent);
        }
        for (i = 0; i < this.viewapp.__floorplan.corners.length; i++) {
            let modelCorner = this.viewapp.__floorplan.corners[i];
            let cornerView = new CornerView2D(this.viewapp.__floorplan, this.viewapp.__options, modelCorner);
            this.viewapp.__floorplanElementsHolder.addChild(cornerView);
            this.viewapp.__corners2d.push(cornerView);
            this.viewapp.__entities2D.push(cornerView);
            cornerView.interactive = (this.viewapp.__mode === floorplannerModes.MOVE);
            cornerView.addFloorplanListener(EVENT_2D_SELECTED, this.viewapp.__selectionMonitorEvent);
            modelCorner.removeEventListener(EVENT_MOVED, this.viewapp.__cornerMovedEvent);
            modelCorner.addEventListener(EVENT_MOVED, this.viewapp.__cornerMovedEvent);
        }

        this.handleWindowResize(this.viewapp);
    }

    __selectionMonitor(evt) {
        this.viewapp.__currentSelection = null;
        this.viewapp.__groupTransformer.visible = false;
        this.viewapp.__groupTransformer.selected = null;
        this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_NOTHING_2D_SELECTED });

        for (let i = 0; i < this.viewapp.__entities2D.length; i++) {
            let entity = this.viewapp.__entities2D[i];
            if (evt.item !== undefined) {
                if (evt.item === entity) {
                    continue;
                }
            }
            entity.selected = false;
        }
        if (evt.item) {
            let item = null;
            if (evt.item instanceof WallView2D) {
                item = evt.item.wall;
                this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_WALL_2D_CLICKED, item: evt.item.wall, entity: evt.item });
            } else if (evt.item instanceof CornerView2D) {
                item = evt.item.corner;
                this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_CORNER_2D_CLICKED, item: evt.item.corner, entity: evt.item });
            } else if (evt.item instanceof RoomView2D) {
                item = evt.item.room;
                this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_ROOM_2D_CLICKED, item: evt.item.room, entity: evt.item });
            }
            if (this.viewapp.__mode === floorplannerModes.EDIT_ISLANDS) {
                this.viewapp.__groupTransformer.visible = true;
                this.viewapp.__groupTransformer.selected = item;
            }
            this.viewapp.__currentSelection = item;
        }
    }

    __drawModeMouseDown(evt) {
        if (IS_TOUCH_DEVICE) {
            this.__drawModeMouseUp(evt);
        }
    }

    __drawModeMouseUp(evt) {
        if (this.viewapp.__mode === floorplannerModes.DRAW) {
            let co = evt.data.getLocalPosition(this.viewapp.__floorplanContainer);
            let cmCo = new Vector2(co.x, co.y);
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || this.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }

            //let existingCorners = this.__floorplan.corners.slice(0);
            let existingRooms = this.viewapp.__floorplan.rooms.slice(0);
            // This creates the corner already
            let corner = this.viewapp.__floorplan.newCorner(cmCo.x, cmCo.y);

            // further create a newWall based on the newly inserted corners
            // (one in the above line and the other in the previous mouse action
            // of start drawing a new wall)
            if (this.viewapp.__lastNode != null) {
                this.viewapp.__floorplan.newWall(this.viewapp.__lastNode, corner);
                this.viewapp.__floorplan.newWallsForIntersections(this.viewapp.__lastNode, corner);
                // this.__tempWall.visible = false;
                // this.switchMode(floorplannerModes.MOVE);
            }
            if (corner.mergeWithIntersected() && this.viewapp.__lastNode != null) {
                this.viewapp._temporaryWall.visible = false;
                this.viewapp.__lastNode = null;
                this.switchMode(floorplannerModes.MOVE);
            }

            if (existingRooms.length !== this.viewapp.__floorplan.rooms.length) {
                this.viewapp._temporaryWall.visible = false;
                this.viewapp.__lastNode = null;
                this.switchMode(floorplannerModes.MOVE);
                return;
            }

            if (this.viewapp.__lastNode === null && this.viewapp.__mode === floorplannerModes.DRAW) {
                this.viewapp._temporaryWall.visible = true;
            }

            if (IS_TOUCH_DEVICE && corner && this.viewapp.__lastNode !== null) {
                this.viewapp._temporaryWall.visible = false;
                this.viewapp.__lastNode = null;
            } else {
                this.viewapp.__lastNode = corner;
            }
        }
    }

    __drawModeMouseMove(evt) {
        if (this.viewapp.__mode === floorplannerModes.DRAW) {
            let co = evt.data.getLocalPosition(this.viewapp.__floorplanContainer);
            let cmCo = new Vector2(co.x, co.y);
            let lastNode = undefined;
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || this.viewapp.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }
            if (this.viewapp.__lastNode !== null) {
                this.viewapp._temporaryWall.update(this.viewapp.__lastNode, cmCo);
            } else {
                this.viewapp._temporaryWall.update(lastNode, undefined, cmCo);
            }
        }
    }

    __cornerMoved(evt) {
        if (this.viewapp.__mode === floorplannerModes.EDIT_ISLANDS) {
            return;
        }
        this.viewapp.__groupTransformer.visible = false;
        this.viewapp.__groupTransformer.selected = null;
    }

    handleWindowResize = () => {
        let heightMargin = this.viewapp.__canvasHolder.offsetTop;
        let widthMargin = this.viewapp.__canvasHolder.offsetLeft;

        let w = (this.viewapp.__options.resize) ? window.innerWidth - widthMargin : this.viewapp.__canvasHolder.clientWidth;
        let h = (this.viewapp.__options.resize) ? window.innerHeight - heightMargin : this.viewapp.__canvasHolder.clientHeight;

        this.viewapp.__currentWidth = w;
        this.viewapp.__currentHeight = h;

        this.viewapp.renderer.resize(w, h);
        this.viewapp.renderer.view.style.width = w + 'px';
        this.viewapp.renderer.view.style.height = h + 'px';
        this.viewapp.renderer.view.style.display = 'block';
        this.viewapp.__floorplanContainer.resize(w, h, this.viewapp.__worldWidth, this.viewapp.__worldHeight);


        this.viewapp.renderer.render(this.viewapp.stage);
        this.__zoomed();
        this.__panned();
    }
    addFloorplanListener(type, listener) {
        this.viewapp.__eventDispatcher.addEventListener(type, listener);
    }

    removeFloorplanListener(type, listener) {
        this.viewapp.__eventDispatcher.removeEventListener(type, listener);
    }
    switchMode(mode) {
        if (this.viewapp.__mode === floorplannerModes.EDIT_ISLANDS && mode !== floorplannerModes.EDIT_ISLANDS) {
            this.viewapp.__floorplan.update();
        }
        switch (mode) {
            case floorplannerModes.DRAW:
                this.viewapp.__mode = floorplannerModes.DRAW;
                this.viewapp.__floorplanContainer.plugins.pause('drag');
                for (let i = 0; i < this.viewapp.__entities2D.length; i++) {
                    this.viewapp.__entities2D[i].interactive = false;
                }
                this.__changeCursorMode();
                this.viewapp._temporaryWall.update();
                this.viewapp._temporaryWall.visible = true;
                this.viewapp.__groupTransformer.visible = false;
                this.viewapp.__groupTransformer.selected = null;
                break;
            case floorplannerModes.EDIT_ISLANDS:
                this.viewapp.__mode = floorplannerModes.EDIT_ISLANDS;
                if (this.viewapp.__currentSelection instanceof Room) {
                    this.viewapp.__groupTransformer.visible = true;
                    this.viewapp.__groupTransformer.selected = this.__currentSelection;
                } else {
                    this.viewapp.__groupTransformer.visible = false;
                    this.viewapp.__groupTransformer.selected = null;
                }

                this.viewapp.__floorplanContainer.plugins.pause('drag');
                for (let i = 0; i < this.viewapp.__corners2d.length; i++) {
                    this.viewapp.__corners2d[i].interactive = false;
                }
                for (let i = 0; i < this.__walls2d.length; i++) {
                    this.viewapp.__walls2d[i].interactive = false;
                }
                this.__changeCursorMode();
                break;
            case floorplannerModes.MOVE:
                this.viewapp.__mode = floorplannerModes.MOVE;

                for (let i = 0; i < this.viewapp.__entities2D.length; i++) {
                    this.viewapp.__entities2D[i].interactive = true;
                }
                this.viewapp._temporaryWall.visible = false;
                this.viewapp.__groupTransformer.visible = false;
                this.viewapp.__groupTransformer.selected = null;
                this.viewapp.__lastNode = null;
                this.viewapp.__floorplanContainer.plugins.resume('drag');
                this.__changeCursorMode();
                break;
            default:
                throw new Error('Unknown Viewer2D mode');
        }
    }

    render() {
        return null;
    }
}

export default Viewer2D;
