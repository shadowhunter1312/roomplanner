import { Graphics, Text } from 'pixi.js';
import { Dimensioning } from '../core/dimensioning';

class TemporaryWall extends Graphics {
    constructor() {
        super();
        this.__textfield = new Text('Length: ', { fontFamily: 'Arial', fontSize: 14, fill: "black", align: 'center' });
        // this.__textfield.pivot.x = this.__textfield.pivot.y = 0.5;
        this.addChild(this.__textfield);
    }

    __toPixels(vector) {
        vector.x = Dimensioning.cmToPixel(vector.x);
        vector.y = Dimensioning.cmToPixel(vector.y);
        return vector;
    }

    update(corner, endPoint, startPoint) {
        this.clear();
        this.__textfield.visible = false;
        if (corner !== undefined && endPoint !== undefined) {
            let pxCornerCo = this.__toPixels(corner.location.clone());
            let pxEndPoint = this.__toPixels(endPoint.clone());
            let vect = endPoint.clone().sub(corner.location);
            let midPoint = (pxEndPoint.clone().sub(pxCornerCo).multiplyScalar(0.5)).add(pxCornerCo);;

            this.lineStyle(10, 0x008CBA);
            this.moveTo(pxCornerCo.x, pxCornerCo.y);
            this.lineTo(pxEndPoint.x, pxEndPoint.y);

            this.beginFill(0x008CBA, 0.5);
            this.drawCircle(pxEndPoint.x, pxEndPoint.y, 10);

            this.__textfield.position.x = midPoint.x;
            this.__textfield.position.y = midPoint.y;
            this.__textfield.text = Dimensioning.cmToMeasure(vect.length());
            this.__textfield.visible = true;
        }
        if (startPoint !== undefined) {
            let pxStartCo = this.__toPixels(startPoint);
            this.beginFill(0x008cba, 0.5);
            this.drawCircle(pxStartCo.x, pxStartCo.y, 10);
        }
    }
}

export default TemporaryWall;
