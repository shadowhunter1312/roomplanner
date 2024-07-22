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
  constructor(props) {
    super(props);
    this.canvasHolderRef = props.canvasHolderRef;
    this.floorplan = props.floorplan;
    this.viewapp = null;


    this.state = {
      mode: floorplannerModes.MOVE,
    };
  }

  componentDidMount() {
    const canvasHolder = this.canvasHolderRef.current;
    if (canvasHolder) {
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
      this.viewapp.__canvasHolder = canvasHolder;
      this.viewapp._temporaryWall = new TemporaryWall();

      this.viewapp.__groupTransformer = new CornerGroupTransform2D(this.viewapp.__floorplan, this.viewapp.__options);

      this.viewapp.__groupTransformer.visible = false;
      this.viewapp.__groupTransformer.selected = null;

      this.viewapp.__floorplanContainer = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: 3000,
        worldHeight: 3000,
        interaction: this.viewapp.renderer.plugins.interaction,
        passiveWheel: false,
      });

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

      this.drawInitialScene();
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

      window.addEventListener('resize', this.handleWindowResize);

      this.__redrawFloorplan();
      this.__center();
      this.switchMode(floorplannerModes.MOVE);
    }
  }

  componentWillUnmount() {
    if (this.viewapp) {
        if (this.viewapp.__floorplanContainer) {
    this.viewapp.__floorplanContainer.off('zoomed', this.viewapp.__zoomedEvent);
    this.viewapp.__floorplanContainer.off('moved', this.viewapp.__pannedEvent);
    this.viewapp.__floorplanContainer.off('clicked', this.viewapp.__selectionMonitorEvent);
        }}
        if (this.viewapp) {
            if (this.viewapp.__floorplan) {
    this.viewapp.__floorplan.removeEventListener(EVENT_NEW, this.viewapp.__redrawFloorplanEvent);
    this.viewapp.__floorplan.removeEventListener(EVENT_DELETED, this.viewapp.__redrawFloorplanEvent);
    this.viewapp.__floorplan.removeEventListener(EVENT_LOADED, this.viewapp.__redrawFloorplanEvent);}}
    window.removeEventListener('resize', this.handleWindowResize);

    //this.canvasHolderRef.current.removeChild(this.viewapp.view);
    //this.viewapp.destroy(true);
  }

  drawInitialScene() {
    this.viewapp._grid = new Grid2D(this.viewapp.view,  this.viewapp.__options );
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

    this.canvasHolderRef.current.appendChild(this.viewapp.view);
  }
  __drawBoundary(){
    // return;
    if(this.viewapp.__boundaryRegion2D){
        this.viewapp.__boundaryRegion2D.remove();
    }

    if(this.viewapp.__floorplan.boundary){
        if(this.viewapp.__floorplan.boundary.isValid){
            this.viewapp.__boundaryRegion2D = new BoundaryView2D(this.viewapp.__floorplan, this.viewapp__options,this.viewapp.__floorplan.boundary);
            this.viewapp.__boundaryHolder.addChild(this.viewapp.__boundaryRegion2D);
        }            
    }
}

  __zoomed() {
    let zoom = this.viewapp.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds));// * zoom;
        let maxZoomOut = Math.max(window.innerWidth, window.innerHeight) / bounds;
        zoom = (zoom < maxZoomOut) ? maxZoomOut : (zoom > 60) ? 60 : zoom;
        
        this.viewapp.__floorplanContainer.scale.x = this.viewapp.__floorplanContainer.scale.y = zoom;
        this.viewapp.__tempWallHolder.scale.x =this.viewapp.__tempWallHolder.scale.y = zoom;

        this.viewapp._grid.gridScale = this.viewapp.__floorplanContainer.scale.x;
  }

  __panned() {
    let zoom = this.viewapp.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;

        let xy = new Vector2(this.viewapp.__floorplanContainer.x, this.viewapp.__floorplanContainer.y);
        let topleft = new Vector2((-(bounds*0.5)), (-(bounds*0.5)));
        let bottomright = new Vector2(((bounds*0.5)), ((bounds*0.5)));
        
        // let windowSize = new Vector2(window.innerWidth, window.innerHeight);
        let windowSize = new Vector2(this.viewapp.__currentWidth, this.viewapp.__currentHeight);        

        let xValue = Math.min(-topleft.x, xy.x);
        let yValue = Math.min(-topleft.y, xy.y);

        xValue = Math.max(windowSize.x-bottomright.x, xValue);
        yValue = Math.max(windowSize.y-bottomright.y, yValue);
    
        
        this.viewapp.__floorplanContainer.x = this.viewapp.__tempWallHolder.x = xValue;
        this.viewapp.__floorplanContainer.y = this.viewapp.__tempWallHolder.y = yValue;
  }

  __center() {
    let floorplanCenter = this.viewapp.__floorplan.getCenter();
    let zoom = this.viewapp.__floorplanContainer.scale.x;
    let windowSize = new Vector2(this.viewapp.__currentWidth, this.viewapp.__currentHeight); 
    let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;
    // console.log(windowSize.x, windowSize.y);
    let x = (windowSize.x * 0.5)-(floorplanCenter.x*0.5);// - (bounds*0.5);
    let y = (windowSize.y * 0.5)-(floorplanCenter.z*0.5);// - (bounds*0.5);
    this.viewapp.__floorplanContainer.x = x;
    this.viewapp.__floorplanContainer.y = y;
    this.viewapp.__tempWallHolder.x = x;
    this.viewapp.__tempWallHolder.y = y;
  }

  __drawExternalFloorplan() {
    let corners = this.viewapp.__externalCorners2d;
    let walls = this.viewapp.__externalWalls2d;
    let rooms = this.viewapp.__externalRooms2d;

    corners.forEach(corner => corner.destroy());
    walls.forEach(wall => wall.destroy());
    rooms.forEach(room => room.destroy());

    this.viewapp.__externalCorners2d = [];
    this.viewapp.__externalWalls2d = [];
    this.viewapp.__externalRooms2d = [];

    this.viewapp.__externalCorners2d = this.viewapp.__floorplan.corners.map(c => new CornerView2D(c, this.viewapp.__options, true));
    this.viewapp.__externalWalls2d = this.viewapp.__floorplan.walls.map(w => new WallView2D(w, this.viewapp.__options, true));
    this.viewapp.__externalRooms2d = this.viewapp.__floorplan.rooms.map(r => new RoomView2D(r, this.viewapp.__options, true));
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
            let roomView = new RoomView2D(this.viewapp.__floorplan,this.viewapp.__options, modelRoom);
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
    if (this.viewapp.__mode === floorplannerModes.MOVE) {
      let co = evt.data.getLocalPosition(this.viewapp.__floorplanContainer);
      let cmCo = new Vector2(co.x, co.y);
      cmCo.x = Dimensioning.pixelToCm(cmCo.x);
      cmCo.y = Dimensioning.pixelToCm(cmCo.y);
      let sel = this.__findClickedEntity(cmCo);

      if (sel != null) {
        if (this.viewapp.__groupTransformer.visible) {
          if (!this.viewapp.__groupTransformer.selected.contains(sel)) {
            this.viewapp.__groupTransformer.visible = false;
            this.viewapp.__groupTransformer.selected = null;
          }
        }

        if (sel instanceof Room) {
          this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_ROOM_2D_CLICKED, item: sel });
        } else if (sel.corner) {
          this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_WALL_2D_CLICKED, item: sel });
        } else if (sel.isCorner) {
          this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_CORNER_2D_CLICKED, item: sel });
        }

        this.viewapp.__groupTransformer.visible = true;
        this.viewapp.__groupTransformer.selected = sel;
        this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_2D_SELECTED, item: sel });
      } else {
        this.viewapp.__groupTransformer.visible = false;
        this.viewapp.__groupTransformer.selected = null;
        this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_NOTHING_2D_SELECTED });
      }
    }
  }

  __drawModeMouseDown(evt) {
    if (this.viewapp.__mode === floorplannerModes.DRAW) {
      let co = evt.data.getLocalPosition(this.viewapp.__floorplanContainer);
      let cmCo = new Vector2(co.x, co.y);
      cmCo.x = Dimensioning.pixelToCm(cmCo.x);
      cmCo.y = Dimensioning.pixelToCm(cmCo.y);

      let corner = this.viewapp.__floorplan.newCorner(cmCo.x, cmCo.y);

      if (this.viewapp.__lastNode != null) {
        let wall = this.viewapp.__floorplan.newWall(this.viewapp.__lastNode, corner);
        this.viewapp._temporaryWall.startNode = corner;
        this.viewapp.__lastNode = corner;
        this.__redrawFloorplan();
      } else {
        this.viewapp.__lastNode = corner;
        this.viewapp._temporaryWall.startNode = corner;
      }
    }
  }

  __drawModeMouseUp(evt) {
    if (this.viewapp.__mode === floorplannerModes.DRAW) {
      let co = evt.data.getLocalPosition(this.viewapp.__floorplanContainer);
      let cmCo = new Vector2(co.x, co.y);
      cmCo.x = Dimensioning.pixelToCm(cmCo.x);
      cmCo.y = Dimensioning.pixelToCm(cmCo.y);

      let corner = this.viewapp.__floorplan.newCorner(cmCo.x, cmCo.y);
      if (snapToGrid && corner) {
        let snapped = this.__snapCorner(corner);
        if (snapped && this.viewapp.__lastNode) {
          corner = this.viewapp.__floorplan.newCorner(snapped.x, snapped.y);
        }
      }

      if (this.viewapp.__lastNode != null) {
        if (this.viewapp.__lastNode.distanceTo(corner) < snapTolerance) {
          this.viewapp.__lastNode = corner;
          this.viewapp._temporaryWall.startNode = corner;
          this.switchMode(floorplannerModes.MOVE);
        } else {
            this.viewapp.current.__lastNode = corner;
            this.viewapp.current._temporaryWall.startNode = corner;
        }
      }
    }
  }

  __drawModeMouseMove(evt) {
    if (this.viewapp.__mode === floorplannerModes.DRAW) {
      let co = evt.data.getLocalPosition(this.viewapp.__floorplanContainer);
      let cmCo = new Vector2(co.x, co.y);
      cmCo.x = Dimensioning.pixelToCm(cmCo.x);
      cmCo.y = Dimensioning.pixelToCm(cmCo.y);

      if (this.viewapp.__lastNode != null) {
        this.viewapp._temporaryWall.endNode = cmCo;
        this.viewapp._temporaryWall.update();
      }
    }
  }

  __cornerMoved(evt) {
    this.__redrawFloorplan();
    this.viewapp.__eventDispatcher.dispatchEvent({ type: EVENT_MOVED });
  }

  handleWindowResize = () => {
    let heightMargin = this.viewapp.__canvasHolder.offsetTop;
        let widthMargin = this.viewapp.__canvasHolder.offsetLeft;

        let w = (this.viewapp.__options.resize) ? window.innerWidth - widthMargin : this.viewapp.__canvasHolder.clientWidth;
        let h = (this.viewapp.__options.resize) ? window.innerHeight - heightMargin :this.viewapp.__canvasHolder.clientHeight;

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
  switchMode(newMode) {
    this.setState({ mode: newMode });
    this.viewapp.__mode = newMode;
  }

  render() {
    return null;
  }
}

export default Viewer2D;
