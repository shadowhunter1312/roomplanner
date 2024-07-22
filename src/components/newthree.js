// FloorPlanApp.js
import React, { Component } from 'react';
import Viewer2D from './viewer2d/2dview.js';
import { Model } from './model/model';
import defaultRoom from './design.json';
import { EVENT_LOADED } from './core/events.js';
import SidebarButtons from './sidebar/index.js';
import Viewer3D from './viewer3d/3dview.js';
import { BlueprintJS } from './blueprint.js';


class FloorPlanApp extends Component {
    constructor(props) {
        super(props);
        this.viewer2DRef = React.createRef();
        this.canvasHolderRef = React.createRef();
        this.canvas3DHolderRef = React.createRef();
        this.model = new Model();
        this.state = {
            mode: 'MOVE',
            mode2: '2D'
        };
        this.model.addEventListener(EVENT_LOADED, () => {
            console.log('LOAD SERIALIZED JSON ::: ');
        });
        let opts = {
            viewer2d: {
                id: this.canvasHolderRef,
                viewer2dOptions: {
                    'corner-radius': 12.5,
                    'boundary-point-radius': 5.0,
                    'boundary-line-thickness': 2.0,
                    'boundary-point-color': '#030303',
                    'boundary-line-color': '#090909',
                    pannable: true,
                    zoomable: true,
                    scale: false,
                    rotate: true,
                    translate: true,
                    dimlinecolor: '#3E0000',
                    dimarrowcolor: '#FF0000',
                    dimtextcolor: '#000000',
                    pixiAppOptions: {
                        resolution: 1,
                    },
                    pixiViewportOptions: {
                        passiveWheel: false,
                    }
                },
            },
            viewer3d: {
                id: this.canvas3DHolderRef,
                viewer3dOptions: {
                    occludedWalls: false,
                    occludedRoofs: false
                }
            },
            textureDir: "models/textures/",
            widget: false,
            resize: true,
        };
        this.model.loadSerialized(JSON.stringify(defaultRoom));

        this.blueprint = new BlueprintJS(opts);
       // this.viewer3DHelper = new RoomPlannerHelper(this.model, this.model.floorplan, this.roomplanner);

    }
    switchMode = (mode2) => {
        this.setState({ mode2 });   
    }

    render() {
        const { mode2 } = this.state;
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <SidebarButtons viewer2DRef={this.viewer2DRef} />
            <button onClick={() => this.switchMode(mode2 === '2D' ? '3D' : '2D')}>
                    Switch to {mode2 === '2D' ? '3D' : '2D'} View
                </button>
                <div ref={this.canvasHolderRef} style={{ display: mode2 === '2D' ? 'block' : 'none', width: '100%', height: '100%' }}>
            
                        <Viewer2D ref={this.viewer2DRef} canvasHolderRef={this.canvasHolderRef} floorplan={this.model.floorplan} />
             
                   
</div>
                    <div ref={this.canvas3DHolderRef} style={{ display: mode2 === '3D' ? 'block' : 'none', width: '100%', height: '100%' }}>
                        <Viewer3D canvasHolderRef={this.canvas3DHolderRef} model={this.model} />
                    </div>
            </div>
        );
    }
}

export default FloorPlanApp;
