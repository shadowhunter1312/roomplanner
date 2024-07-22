import { Configuration, configDimUnit } from "./core/configuration";
import { dimCentiMeter } from "./core/constants";
import { Model } from "./model/model";


import { ConfigurationHelper } from "./helpers/ConfigurationHelper";
import { FloorPlannerHelper } from "./helpers/FloorplannerHelper";
import { RoomPlannerHelper } from "./helpers/RoomplannerHelper";
import  Viewer2D  from './viewer2d/2dview.js';
import { floorplannerModes } from "./viewer2d/2dview.js";
import Viewer3D from './viewer3d/3dview.js';
class BlueprintJS {
    constructor(options) {
        Configuration.setValue(configDimUnit, dimCentiMeter);

        this.options = options;
        this.model = new Model();

        let viewer3dOptions = this.options.viewer3d.viewer3dOptions || {};
        viewer3dOptions.resize = this.options.resize ? true : false;
        this.viewer3D = new Viewer3D( this.model, options.viewer3d.id, viewer3dOptions);

        this.configurationHelper = new ConfigurationHelper();
        this.floorplanningHelper = null;
        this.roomplanningHelper = new RoomPlannerHelper(this.model, this.model.floorplan, this.viewer3D);

        if (!options.widget) {
            let viewer2dOptions = this.options.viewer2d.viewer2dOptions || {};
            viewer2dOptions.resize = this.options.resize ? true : false;
           this.viewer2D = new Viewer2D(options.viewer2d.id, this.model.floorplan, viewer2dOptions);
           
         this.floorplanningHelper = new FloorPlannerHelper(this.model.floorplan, this.viewer2D);
        }

        this.view_now = 3;
        this.switchView();
    }

    switchView() {
        if (this.options.widget) {
            return;
        }
        console.log(this.view_now)
        this.viewer2D.switchMode(floorplannerModes.MOVE);
        if (this.view_now === 3 && !this.options.widget) {
            this.view_now = 2;
           
         //   document.getElementById(this.options.viewer2d.id).style.visibility = "visible";
          //  document.getElementById(this.options.viewer3d.id).style.visibility = "hidden";
            this.viewer3D.enabled = false;
        } else if (this.view_now === 2 && !this.options.widget) {
            this.view_now = 3;
        //    document.getElementById(this.options.viewer2d.id).style.visibility = "hidden";
        //    document.getElementById(this.options.viewer3d.id).style.visibility = "visible";
            this.viewer3D.enabled = true;
        }
    }

    setViewer2DModeToDraw() {
        if (this.options.widget) {
            return;
        }
        this.viewer2D.switchMode(floorplannerModes.DRAW);
    }

    setViewer2DModeToMove() {
        if (this.options.widget) {
            return;
        }
        this.viewer2D.switchMode(floorplannerModes.MOVE);
    }

    switchViewer2DToTransform() {
        if (this.options.widget) {
            return;
        }
        this.viewer2D.switchMode(floorplannerModes.EDIT_ISLANDS);
    }

    // updateView3D() {
    //     this.viewer3D.needsUpdate = true;
    // }

    get currentView() {
        return this.view_now;
    }
}

export { BlueprintJS };
