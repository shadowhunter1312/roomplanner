const { Configuration, gridSpacing, snapTolerance, boundsY, boundsX, dragOnlyY, dragOnlyX, directionalDrag, snapToGrid, itemStatistics, configDimUnit } = require("../core/configuration");

export class ConfigurationHelper {
    constructor() {
        this.__snapToGrid = Configuration.getBooleanValue(snapToGrid);
        this.__directionalDrag = Configuration.getBooleanValue(directionalDrag);
        this.__dragOnlyX = Configuration.getBooleanValue(dragOnlyX);
        this.__dragOnlyY = Configuration.getBooleanValue(dragOnlyY);
        this.__boundsX = Configuration.getNumericValue(boundsX);
        this.__boundsY = Configuration.getNumericValue(boundsY);
        this.__snapTolerance = Configuration.getNumericValue(snapTolerance);
        this.__gridSpacing = Configuration.getNumericValue(gridSpacing);
        this.__itemStatistics = Configuration.getBooleanValue(itemStatistics);
        this.__configDimUnit = Configuration.getStringValue(configDimUnit);
    }

    get snapToGrid() {
        return this.__snapToGrid;
    }
    set snapToGrid(flag) {
        this.__snapToGrid = flag;
        Configuration.setValue(snapToGrid, flag);
    }

    get directionalDrag() {
        return this.__directionalDrag;
    }
    set directionalDrag(flag) {
        this.__directionalDrag = flag;
        Configuration.setValue(directionalDrag, flag);
    }

    get dragOnlyX() {
        return this.__dragOnlyX;
    }
    set dragOnlyX(flag) {
        this.__dragOnlyX = flag;
        Configuration.setValue(dragOnlyX, flag);
    }

    get dragOnlyY() {
        return this.__dragOnlyY;
    }
    set dragOnlyY(flag) {
        this.__dragOnlyY = flag;
        Configuration.setValue(dragOnlyY, flag);
    }

    get boundsX() {
        return this.__boundsX;
    }
    set boundsX(value) {
        this.__boundsX = value;
        Configuration.setValue(boundsX, value);
    }

    get boundsY() {
        return this.__boundsY;
    }

    set boundsY(value) {
        this.__boundsY = value;
        Configuration.setValue(boundsY, value);
    }


    get snapTolerance() {
        return this.__snapTolerance;
    }

    set snapTolerance(value) {
        this.__snapTolerance = value;
        Configuration.setValue(snapTolerance, value);
    }

    get gridSpacing() {
        return this.__gridSpacing;
    }

    set gridSpacing(value) {
        this.__gridSpacing = value;
        Configuration.setValue(gridSpacing, value);
    }

    get itemStatistics(){
        return this.__itemStatistics;
    }

    set itemStatistics(flag){
        this.__itemStatistics = flag;
        Configuration.setValue(itemStatistics, flag);
    }

    get configDimUnit(){
        return this.__configDimUnit;
    }

    set configDimUnit(dimUnitValue){
        Configuration.setValue(configDimUnit, dimUnitValue);
    }
}