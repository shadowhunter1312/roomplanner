import { Application, Graphics, Text } from 'pixi.js';
import React, { useEffect,useRef,useImperativeHandle, forwardRef } from 'react';
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
import { EVENT_EXTERNAL_FLOORPLAN_LOADED,EVENT_MODE_RESET,EVENT_MOVED,EVENT_2D_SELECTED,EVENT_NEW,EVENT_DELETED,EVENT_NEW_ROOMS_ADDED,EVENT_LOADED,EVENT_NOTHING_2D_SELECTED,EVENT_CORNER_2D_CLICKED,EVENT_WALL_2D_CLICKED,EVENT_ROOM_2D_CLICKED} from '../core/events';


export const floorplannerModes = { MOVE: 0, DRAW: 1, EDIT_ISLANDS: 2 };

Configuration.setValue(viewBounds, 10000);
const Viewer2D =forwardRef(({ canvasHolderRef, floorplan} ,ref ) => {

    const viewapp = useRef(null);

    useEffect(() => {
        const canvasHolder = canvasHolderRef.current;
        if (canvasHolder) {
            const app = new Application({
                width: window.innerWidth,
                height: window.innerHeight,
                resolution: 1,
                antialias: true,
                backgroundAlpha: true
            });
            viewapp.current=app;
            viewapp.current.renderer.backgroundColor = 0xFFFFFF;
            // viewapp.current.renderer.autoResize = true;
            viewapp.current.__eventDispatcher = new EventDispatcher();
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
            viewapp.current.__mode = floorplannerModes.MOVE;
            viewapp.current.__options = opts;
            viewapp.current.__floorplan = floorplan;

            viewapp.current.__lastNode = null;
            viewapp.current.__corners2d = [];
            viewapp.current.__walls2d = [];
            viewapp.current.__rooms2d = [];
            viewapp.current.__entities2D = [];
            viewapp.current.__snapToGrid = false;

            viewapp.current.__externalCorners2d = [];
            viewapp.current.__externalWalls2d = [];
            viewapp.current.__externalRooms2d = [];
            viewapp.current.__externalEntities2d = [];
            viewapp.current.__worldWidth = 3000;
            viewapp.current.__worldHeight = 3000;
            viewapp.current.__currentWidth = 500;
            viewapp.current.__currentHeight = 500;
            viewapp.current.__canvasHolder = canvasHolder;
            viewapp.current._temporaryWall = new TemporaryWall();
            
            viewapp.current.__groupTransformer = new CornerGroupTransform2D(viewapp.current.__floorplan, viewapp.current.__options);

            viewapp.current.__groupTransformer.visible = false;
            viewapp.current.__groupTransformer.selected = null;


            viewapp.current.__floorplanContainer = new Viewport({
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                worldWidth: 3000,
                worldHeight: 3000,
                interaction: viewapp.current.renderer.plugins.interaction,
                passiveWheel: false,
            });

            viewapp.current.__zoomedEvent = () => __zoomed(app);
            viewapp.current.__pannedEvent = () => __panned(app);
            viewapp.current.__resetFloorplanEvent= () => __drawExternalFloorplan(app);
            viewapp.current.__drawExternalFloorplanEvent = () => __drawExternalFloorplan(app);
            viewapp.current.__redrawFloorplanEvent= () => __redrawFloorplan(viewapp.current);
            viewapp.current.__floorplanLoadedEvent = () => __center(app);
            viewapp.current.__selectionMonitorEvent = (evt) => __selectionMonitor(evt,app);
            viewapp.current.__cornerMovedEvent =  (evt) => __cornerMoved(evt,app);

            viewapp.current.__drawModeMouseDownEvent= (evt) =>__drawModeMouseDown(evt,app);
            viewapp.current.__drawModeMouseUpEvent= (evt) => __drawModeMouseUp(evt,app);
            viewapp.current.__drawModeMouseMoveEvent= (evt) => __drawModeMouseMove(evt,app);

            // canvasHolder.appendChild(viewapp.current.view);
            drawInitialScene(app);
            viewapp.current.__floorplanContainer.addChild(viewapp.current.__groupTransformer);

            viewapp.current.__floorplanContainer.drag().pinch().wheel();


            viewapp.current.__floorplanContainer.on('zoomed', viewapp.current.__zoomedEvent);
            viewapp.current.__floorplanContainer.on('moved', viewapp.current.__pannedEvent);
            viewapp.current.__floorplanContainer.on('clicked', viewapp.current.__selectionMonitorEvent);


            viewapp.current.__floorplanContainer.on('mousedown', viewapp.current.__drawModeMouseDownEvent);
            viewapp.current.__floorplanContainer.on('mouseup', viewapp.current.__drawModeMouseUpEvent);
            viewapp.current.__floorplanContainer.on('mousemove', viewapp.current.__drawModeMouseMoveEvent);

            viewapp.current.__floorplanContainer.on('touchstart', viewapp.current.__drawModeMouseUpEvent);
            //User then touch moves and lifts the finger away from the screen. Now create the next corner
            viewapp.current.__floorplanContainer.on('touchend', viewapp.current.__drawModeMouseUpEvent);
    
            //Use touches and drags across the screen then emulate drawing the temporary wall
            viewapp.current.__floorplanContainer.on('touchmove', viewapp.current.__drawModeMouseMoveEvent);
            // viewapp.current.__floorplanContainer.on('moved', viewapp.current.__pannedEvent);
            viewapp.current.__floorplan.addEventListener(EVENT_LOADED, viewapp.current.__floorplanLoadedEvent);
            viewapp.current.__floorplan.addEventListener(EVENT_NEW, viewapp.current.__redrawFloorplanEvent);
            viewapp.current.__floorplan.addEventListener(EVENT_DELETED, viewapp.current.__redrawFloorplanEvent);
    
            viewapp.current.__floorplan.addEventListener(EVENT_NEW_ROOMS_ADDED, viewapp.current.__redrawFloorplanEvent);
            viewapp.current.__floorplan.addEventListener(EVENT_MODE_RESET, viewapp.current.__resetFloorplanEvent);
            viewapp.current.__floorplan.addEventListener(EVENT_EXTERNAL_FLOORPLAN_LOADED, viewapp.current.__drawExternalFloorplanEvent);
           
            // const addFloorplanListener = (type, listener) => {
            //     viewapp.current.__eventDispatcher.addEventListener(type, listener);
            // };
        
            // const removeFloorplanListener = (type, listener) => {
            //     viewapp.current.__eventDispatcher.removeEventListener(type, listener);
            // };  
            viewapp.current=app;
            window.addEventListener('resize', handleWindowResize(viewapp.current));
            // __drawExternalFloorplan(app);
            __redrawFloorplan( viewapp.current);
            __center( viewapp.current);
            switchMode(floorplannerModes.MOVE,app);

         
            return () => {
                viewapp.current.__floorplanContainer.off('zoomed', viewapp.current.__zoomedEvent);
                viewapp.current.__floorplanContainer.off('moved', viewapp.current.__pannedEvent);
                viewapp.current.__floorplanContainer.off('clicked', viewapp.current.__selectionMonitorEvent);

                viewapp.current.__floorplan.removeEventListener(EVENT_NEW, viewapp.current.__redrawFloorplanEvent);
                viewapp.current.__floorplan.removeEventListener(EVENT_DELETED, viewapp.current.__redrawFloorplanEvent);
                viewapp.current.__floorplan.removeEventListener(EVENT_LOADED, viewapp.current.__redrawFloorplanEvent);
                window.removeEventListener('resize', handleWindowResize);
                canvasHolder.removeChild(viewapp.current.view);
                viewapp.current.destroy(true);
            };
        }
    }, [canvasHolderRef,floorplan]);

    useImperativeHandle(ref, () => ({
        switchMode: (mode) => {
            if (viewapp.current) {
                switchMode(mode, viewapp.current);
            }
        }
    }));

    const drawInitialScene = (app) => {
        // Implement your drawing logic here

        // Create an instance of Grid2D and add it to the viewport
        viewapp.current._grid = new Grid2D(viewapp.current.view, null);
        let origin = new Graphics();
        viewapp.current.__floorplanElementsHolder = new Graphics();
  

        viewapp.current.__floorplanContainer.addChild(origin);

        viewapp.current.__floorplanContainer.addChild(viewapp.current._grid);
        viewapp.current.__floorplanContainer.addChild(viewapp.current.__floorplanElementsHolder);
        viewapp.current.__boundaryHolder = new Graphics();
        viewapp.current.__floorplanContainer.addChild(viewapp.current.__boundaryHolder);

        viewapp.current.__tempWallHolder = new Graphics();
        viewapp.current.__tempWallHolder.addChild(viewapp.current._temporaryWall);
        viewapp.current.stage.addChild(viewapp.current.__floorplanContainer)
        viewapp.current.stage.addChild(viewapp.current.__tempWallHolder);
        // Add the viewport to the canvas holder
        canvasHolderRef.current.appendChild(viewapp.current.view);


        // Draw other elements...
    };

 
    const __zoomed = (app) => {
        // console.log(viewapp.current.__floorplanContainer)

        let zoom = viewapp.current.__floorplanContainer.scale.x;

        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds));// * zoom;
        let maxZoomOut = Math.max(window.innerWidth, window.innerHeight) / bounds;
        zoom = (zoom < maxZoomOut) ? maxZoomOut : (zoom > 60) ? 60 : zoom;

        viewapp.current.__floorplanContainer.scale.x = viewapp.current.__floorplanContainer.scale.y = zoom;
         viewapp.current.__tempWallHolder.scale.x = viewapp.current.__tempWallHolder.scale.y = zoom;

        //viewapp.current.__grid2d.gridScale = viewapp.current.__floorplanContainer.scale.x;
    };
    const __panned = (app) => {
        let zoom = viewapp.current.__floorplanContainer.scale.x;
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;

        let xy = new Vector2(viewapp.current.__floorplanContainer.x, viewapp.current.__floorplanContainer.y);
        let topleft = new Vector2((-(bounds * 0.5)), (-(bounds * 0.5)));
        let bottomright = new Vector2(((bounds * 0.5)), ((bounds * 0.5)));

        let windowSize = new Vector2(viewapp.current.__currentWidth, viewapp.current.__currentHeight);

        let xValue = Math.min(-topleft.x, xy.x);
        let yValue = Math.min(-topleft.y, xy.y);

        xValue = Math.max(windowSize.x - bottomright.x, xValue);
        yValue = Math.max(windowSize.y - bottomright.y, yValue);

        viewapp.current.__floorplanContainer.x = xValue;
        viewapp.current.__floorplanContainer.y = yValue;
        viewapp.current.__tempWallHolder.x =xValue;
        viewapp.current.__tempWallHolder.y =yValue;
    };

    const __center = (app) => {
        let floorplanCenter = viewapp.current.__floorplan.getCenter();
        let zoom = viewapp.current.__floorplanContainer.scale.x;
        let windowSize = new Vector2(viewapp.current.__currentWidth, viewapp.current.__currentHeight);
        let bounds = Dimensioning.cmToPixel(Configuration.getNumericValue(viewBounds)) * zoom;
        // // console.log(windowSize.x, windowSize.y);
        let x = (windowSize.x * 0.5) - (floorplanCenter.x * 0.5);// - (bounds*0.5);
        let y = (windowSize.y * 0.5) - (floorplanCenter.z * 0.5);// - (bounds*0.5);
        viewapp.current.__floorplanContainer.x = x;
        viewapp.current.__floorplanContainer.y = y;
        viewapp.current.__tempWallHolder.x = x;
        viewapp.current.__tempWallHolder.y = y;
         console.log(x, y, floorplanCenter);
    };
    const __drawBoundary = (app) => {
        // return;
  
        if(viewapp.current.__boundaryRegion2D){
            viewapp.current.__boundaryRegion2D.remove();
          
        }

        if(viewapp.current.__floorplan.boundary){
          
            if(viewapp.current.__floorplan.boundary.isValid){
          
                viewapp.current.__boundaryRegion2D = new BoundaryView2D(viewapp.current.__floorplan, viewapp.current.__options, viewapp.current.__floorplan.boundary);
                

                viewapp.current.__boundaryHolder.addChild(viewapp.current.__boundaryRegion2D);
            }            
        }
    }
   const __redrawFloorplan = (app1) => {

        let scope = app1;
        let app= app1;
        let i = 0;

        // clear scene
        scope.__entities2D.forEach((entity) => {
            entity.removeFloorplanListener(EVENT_2D_SELECTED, viewapp.current.__selectionMonitorEvent);
            entity.remove();
        });

        __drawBoundary(app);

        viewapp.current.__corners2d = [];
        viewapp.current.__walls2d = [];
        viewapp.current.__rooms2d = [];
        viewapp.current.__entities2D = [];

        let rooms = viewapp.current.__floorplan.getRooms();

        for (i = 0; i < rooms.length; i++) {
            let modelRoom = rooms[i];
            let roomView = new RoomView2D(viewapp.current.__floorplan,viewapp.current.__options, modelRoom);
            viewapp.current.__floorplanElementsHolder.addChild(roomView);
            viewapp.current.__rooms2d.push(roomView);
            viewapp.current.__entities2D.push(roomView);
            roomView.interactive = (viewapp.current.__mode === floorplannerModes.MOVE);
            roomView.addFloorplanListener(EVENT_2D_SELECTED, viewapp.current.__selectionMonitorEvent);
        }
        for (i = 0; i < viewapp.current.__floorplan.walls.length; i++) {
            let modelWall = viewapp.current.__floorplan.walls[i];
            let wallView = new WallView2D(viewapp.current.__floorplan, viewapp.current.__options, modelWall);
            viewapp.current.__floorplanElementsHolder.addChild(wallView);
            viewapp.current.__walls2d.push(wallView);
            viewapp.current.__entities2D.push(wallView);
            wallView.interactive = (viewapp.current.__mode === floorplannerModes.MOVE);
            wallView.addFloorplanListener(EVENT_2D_SELECTED, viewapp.current.__selectionMonitorEvent);
        }
        for (i = 0; i < viewapp.current.__floorplan.corners.length; i++) {
            let modelCorner = viewapp.current.__floorplan.corners[i];
            let cornerView = new CornerView2D(viewapp.current.__floorplan, viewapp.current.__options, modelCorner);
            viewapp.current.__floorplanElementsHolder.addChild(cornerView);
            viewapp.current.__corners2d.push(cornerView);
            viewapp.current.__entities2D.push(cornerView);
            cornerView.interactive = (viewapp.current.__mode === floorplannerModes.MOVE);
            cornerView.addFloorplanListener(EVENT_2D_SELECTED, viewapp.current.__selectionMonitorEvent);
            modelCorner.removeEventListener(EVENT_MOVED, viewapp.current.__cornerMovedEvent);
            modelCorner.addEventListener(EVENT_MOVED, viewapp.current.__cornerMovedEvent);
        }
        console.log(viewapp.current)
       handleWindowResize(viewapp.current);
       
       
    }
    const __drawExternalFloorplan = (app) => {

        let i = 0;
        // Clear scene
        viewapp.current.__externalEntities2d.forEach((entity) => {
            entity.remove();
        });

         __drawBoundary(app);

        viewapp.current.__externalCorners2d = [];
        viewapp.current.__externalWalls2d = [];
        viewapp.current.__externalRooms2d = [];

        let rooms = viewapp.current.__floorplan.externalRooms;
    

        for (i = 0; i < rooms.length; i++) {
            
      
            let modelRoom = rooms[i];
            let roomView = new RoomView2D(viewapp.current.__floorplan, viewapp.current.__options, modelRoom);
            viewapp.current.__floorplanElementsHolder.addChild(roomView);
            viewapp.current.__externalRooms2d.push(roomView);
            viewapp.current.__externalEntities2d.push(roomView);
        }
        for (i = 0; i < viewapp.current.__floorplan.externalWalls.length; i++) {
            let modelWall = viewapp.current.__floorplan.externalWalls[i];
            let wallView = new WallView2D(viewapp.current.__floorplan, viewapp.current.__options, modelWall);
            viewapp.current.__floorplanElementsHolder.addChild(wallView);
            viewapp.current.__externalWalls2d.push(wallView);
            viewapp.current.__externalEntities2d.push(wallView);
        }
        for (i = 0; i < viewapp.current.__floorplan.externalCorners.length; i++) {
            let modelCorner = viewapp.current.__floorplan.externalCorners[i];
            let cornerView = new CornerView2D(viewapp.current.__floorplan, viewapp.current.__options, modelCorner);
            viewapp.current.__floorplanElementsHolder.addChild(cornerView);
            viewapp.current.__externalCorners2d.push(cornerView);
            viewapp.current.__externalEntities2d.push(cornerView);
        }
      
        handleWindowResize(viewapp.current);
    };

    const switchMode = (mode,app) => {
       
        if (viewapp.current.__mode === floorplannerModes.EDIT_ISLANDS && mode !== floorplannerModes.EDIT_ISLANDS) {
            viewapp.current.__floorplan.update();
        }
        switch (mode) {
            case floorplannerModes.DRAW:
                viewapp.current.__mode = floorplannerModes.DRAW;
                viewapp.current.__floorplanContainer.plugins.pause('drag');
                for (let i = 0; i < viewapp.current.__entities2D.length; i++) {
                    viewapp.current.__entities2D[i].interactive = false;
                }
                __changeCursorMode(app);
                viewapp.current._temporaryWall.update();
                viewapp.current._temporaryWall.visible = true;
                viewapp.current.__groupTransformer.visible = false;
                viewapp.current.__groupTransformer.selected = null;
                break;
            case floorplannerModes.EDIT_ISLANDS:
                viewapp.current.__mode = floorplannerModes.EDIT_ISLANDS;
                if (viewapp.current.__currentSelection instanceof Room) {
                    viewapp.current.__groupTransformer.visible = true;
                    viewapp.current.__groupTransformer.selected = viewapp.current.__currentSelection;
                } else {
                    viewapp.current.__groupTransformer.visible = false;
                    viewapp.current.__groupTransformer.selected = null;
                }

                viewapp.current.__floorplanContainer.plugins.pause('drag');
                for (let i = 0; i < viewapp.current.__corners2d.length; i++) {
                    viewapp.current.__corners2d[i].interactive = false;
                }
                for (let i = 0; i < viewapp.current.__walls2d.length; i++) {
                    viewapp.current.__walls2d[i].interactive = false;
                }
                __changeCursorMode(app);
                break;
            case floorplannerModes.MOVE:
                viewapp.current.__mode = floorplannerModes.MOVE;
                for (let i = 0; i < viewapp.current.__entities2D.length; i++) {
                    viewapp.current.__entities2D[i].interactive = true;
                }
                viewapp.current._temporaryWall.visible = false;
                viewapp.current.__groupTransformer.visible = false;
                viewapp.current.__groupTransformer.selected = null;
                viewapp.current.__lastNode = null;
                viewapp.current.__floorplanContainer.plugins.resume('drag');
                __changeCursorMode(app);
                break;
            default:
                throw new Error('Unknown Viewer2D mode');
        }
    };
    const __changeCursorMode =(app)=> {
        
        let cursor = (viewapp.current.__mode === floorplannerModes.DRAW) ? 'crosshair' : 'pointer';
        viewapp.current.renderer.plugins.interaction.cursorStyles.crosshair = cursor;
        viewapp.current.renderer.plugins.interaction.cursorStyles.default = cursor;
        viewapp.current.renderer.plugins.interaction.setCursorMode(cursor);
    }

    const __selectionMonitor = (evt,app) => {
   
        viewapp.current.__currentSelection = null;
        viewapp.current.__groupTransformer.visible = false;
        viewapp.current.__groupTransformer.selected = null;
        viewapp.current.__eventDispatcher.dispatchEvent({ type: EVENT_NOTHING_2D_SELECTED });
        for (let i = 0; i < viewapp.current.__entities2D.length; i++) {
            let entity = viewapp.current.__entities2D[i];
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
                viewapp.current.__eventDispatcher.dispatchEvent({ type: EVENT_WALL_2D_CLICKED, item: evt.item.wall, entity: evt.item });
            } else if (evt.item instanceof CornerView2D) {
                item = evt.item.corner;
                viewapp.current.__eventDispatcher.dispatchEvent({ type: EVENT_CORNER_2D_CLICKED, item: evt.item.corner, entity: evt.item });
            } else if (evt.item instanceof RoomView2D) {
                item = evt.item.room;
                viewapp.current.__eventDispatcher.dispatchEvent({ type: EVENT_ROOM_2D_CLICKED, item: evt.item.room, entity: evt.item });
            }
            if (viewapp.current.__mode === floorplannerModes.EDIT_ISLANDS) {
                viewapp.current.__groupTransformer.visible = true;
                viewapp.current.__groupTransformer.selected = item;
            }
            viewapp.current.__currentSelection = item;
        }
    };

    const __drawModeMouseDown = (evt,app) => {
        
        if (IS_TOUCH_DEVICE) {
           
            __drawModeMouseUp(evt,app);
        }
    };

    const __drawModeMouseUp = (evt,app) => {
        if (viewapp.current.__mode === floorplannerModes.DRAW) {
           
            let co = evt.data.getLocalPosition(viewapp.current.__floorplanContainer);
            let cmCo = new Vector2(co.x, co.y);
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || viewapp.current.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }

            let existingCorners = viewapp.current.__floorplan.corners.slice(0);
            let existingRooms = viewapp.current.__floorplan.rooms.slice(0);
            // This creates the corner already
            let corner = viewapp.current.__floorplan.newCorner(cmCo.x, cmCo.y);            

            // further create a newWall based on the newly inserted corners
            // (one in the above line and the other in the previous mouse action
            // of start drawing a new wall)
            if (viewapp.current.__lastNode != null) {
                viewapp.current.__floorplan.newWall(viewapp.current.__lastNode, corner);
                viewapp.current.__floorplan.newWallsForIntersections(viewapp.current.__lastNode, corner);
                //this.__tempWall.visible = false;
                // this.switchMode(floorplannerModes.MOVE);
            }
            if (corner.mergeWithIntersected() && viewapp.current.__lastNode != null) {
                viewapp.current._temporaryWall.visible = false;
                viewapp.current.__lastNode = null;
                switchMode(floorplannerModes.MOVE,app);
            }

            if(existingRooms.length !== viewapp.current.__floorplan.rooms.length){
                viewapp.current._temporaryWall.visible = false;
                viewapp.current.__lastNode = null;
                switchMode(floorplannerModes.MOVE,app);
                return;
            }

            if (viewapp.current.__lastNode === null && viewapp.current.__mode === floorplannerModes.DRAW) {
                viewapp.current._temporaryWall.visible = true;
            }

            if (IS_TOUCH_DEVICE && corner && viewapp.current.__lastNode !== null) {
                viewapp.current._temporaryWall.visible = false;
                viewapp.current.__lastNode = null;
            } else {
                viewapp.current.__lastNode = corner;
            }
        }
    };

    const __drawModeMouseMove = (evt,app) => {
        if (viewapp.current.__mode === floorplannerModes.DRAW) {
          
            let co = evt.data.getLocalPosition(viewapp.current.__floorplanContainer);
            let cmCo = new Vector2(co.x, co.y);
            let lastNode = undefined;
            cmCo.x = Dimensioning.pixelToCm(cmCo.x);
            cmCo.y = Dimensioning.pixelToCm(cmCo.y);
            if (Configuration.getBooleanValue(snapToGrid) || viewapp.current.__snapToGrid) {
                cmCo.x = Math.floor(cmCo.x / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
                cmCo.y = Math.floor(cmCo.y / Configuration.getNumericValue(snapTolerance)) * Configuration.getNumericValue(snapTolerance);
            }
            if (viewapp.current.__lastNode !== null) {
                viewapp.current._temporaryWall.update(viewapp.current.__lastNode, cmCo);
            } else {
                viewapp.current._temporaryWall.update(lastNode, undefined, cmCo);
            }
        }
    };
    const __cornerMoved= (evt,app) => {
        if (viewapp.current.__mode === floorplannerModes.EDIT_ISLANDS) {
            return;
        }
        viewapp.current.__groupTransformer.visible = false;
        viewapp.current.__groupTransformer.selected = null;
    }

    const handleWindowResize = (app) => {
  
        let heightMargin = viewapp.current.__canvasHolder.offsetTop;
        let widthMargin = viewapp.current.__canvasHolder.offsetLeft;

        let w = (viewapp.current.__options.resize) ? window.innerWidth - widthMargin : viewapp.current.__canvasHolder.clientWidth;
        let h = (viewapp.current.__options.resize) ? window.innerHeight - heightMargin : viewapp.current.__canvasHolder.clientHeight;

        viewapp.current.__currentWidth = w;
        viewapp.current.__currentHeight = h;

        viewapp.current.renderer.resize(w, h);
        viewapp.current.renderer.view.style.width = w + 'px';
        viewapp.current.renderer.view.style.height = h + 'px';
        viewapp.current.renderer.view.style.display = 'block';
        viewapp.current.__floorplanContainer.resize(w, h, viewapp.current.__worldWidth, viewapp.current.__worldHeight);


        viewapp.current.renderer.render(viewapp.current.stage);
        __zoomed(app);
        __panned(app);
    };
    return null;
});

export default Viewer2D;
