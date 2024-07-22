// FloorPlanApp.js
import React, { Component } from 'react';
import Viewer2D from './viewer2d/2dview.js';
import { Model } from './model/model';
import defaultRoom from './design.json';
import { EVENT_LOADED } from './core/events.js';
import SidebarButtons from './sidebar/index.js';
import Viewer3D from './viewer3d/3dview.js';
import { BlueprintJS } from './blueprint.js';
import Sidebar from './texturelib/texture.js';
import * as floor_textures_json from './floor_textures.json';
//import * as wall_textures_json from './wall_textures.json';

class FloorPlanApp extends Component {
    constructor(props) {
        super(props);
        this.viewer2DRef = React.createRef();
        this.canvasHolderRef = React.createRef();
        this.canvas3DHolderRef = React.createRef();
        this.sidebarRef = React.createRef();
        this.model = new Model();
        this.state = {
            mode: 'MOVE',
            mode2: '2D',
            isTextureVisible: false
        };
        this.blueprint =null;

        //  this.model.loadSerialized(JSON.stringify(defaultRoom));
        // this.viewer3DHelper = new RoomPlannerHelper(this.model, this.model.floorplan, this.roomplanner);
    }
    componentDidMount() {
        if (!this.blueprint) {
        const opts = {
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



        this.blueprint = new BlueprintJS(opts);
        this.blueprint.model.addEventListener(EVENT_LOADED, () => {
            console.log('LOAD SERIALIZED JSON ::: ');
        });
        this.blueprint.model.loadSerialized(JSON.stringify(defaultRoom));
    }
    }
    setViewer2DModeToDraw = () => {
       
        if (this.blueprint) {
            this.blueprint.setViewer2DModeToDraw();
        }
    };

    setViewer2DModeToMove = () => {
        if (this.state.blueprint) {
            this.state.blueprint.setViewer2DModeToMove();
        }
    };
    switchMode = () => {
        this.blueprint.switchView()
        if (this.blueprint.currentView === 2) {
            this.canvasHolderRef.current.style.display = 'block';
            this.canvas3DHolderRef.current.style.display = 'none';
        }else if (this.blueprint.currentView === 3) {
            this.canvasHolderRef.current.style.display = 'none';
            this.canvas3DHolderRef.current.style.display = 'block';
        }
    }
  
    toggleTextureSidebar = () => {
        this.setState(prevState => ({ isTextureSidebarOpen: !prevState.isTextureSidebarOpen }));
    }

    selectFloorTexture = (data) => {
        console.log(data)
       
        let floor_texture_pack = floor_textures_json[data.value];

  
        let floor_texture_keys = Object.keys(floor_textures_json);
       
        floor_texture_pack.color= '#FFFFFF'
      //  this.blueprint.roomplanningHelper.setRoomFloorColor(data);
        this.blueprint.roomplanningHelper.roomTexturePack = floor_texture_pack;
    }
    render() {
        const { mode2, isTextureSidebarOpen } = this.state;
        return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <SidebarButtons setViewer2DModeToDraw={this.setViewer2DModeToDraw}
                    setViewer2DModeToMove={this.setViewer2DModeToMove}
                    switchViewer2DToTransform={this.switchViewer2DToTransform} />
                <button onClick={() => this.switchMode(mode2 === '2D' ? '3D' : '2D')}>
                    Switch to {mode2 === '2D' ? '3D' : '2D'} View
                </button>
                <button onClick={this.toggleTextureSidebar}>
                
                    {isTextureSidebarOpen ? 'Close' : 'Open'} Texture Sidebar
                </button>
                <div ref={this.canvasHolderRef} style={{ width: '100%', height: '100%' ,position: 'fixed'}}>
                    {/* 2D Canvas content goes here */}
                </div>
                <div ref={this.canvas3DHolderRef} style={{ display: 'none', width: '100%', height: '100%',position: 'fixed' }}>
                    {/* 3D Canvas content goes here */}
                </div>
                {isTextureSidebarOpen && <Sidebar onTextureSelect={this.selectFloorTexture} onClose={this.toggleTextureSidebar} />}
            </div>
        );
    }
}

export default FloorPlanApp;
