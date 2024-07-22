import { BufferGeometry, DoubleSide, Mesh, Shape, ShapeGeometry, Vector2 } from "three";
import { FloorMaterial3D } from "../materials/FloorMaterial3D";
import {Utils} from '../core/utils.js'

export class BoundaryView3D extends Mesh{
    constructor(scene, floorplan, options, boundary){
        super();
        this.__scene = scene;
        this.__boundary = boundary;
        this.__floorplan = floorplan;

        this.__floorPlane = null;
        this.__drawBoundary();
    }

    removeFromScene(){
        if(!this.__floorPlane){
            return;
        }
        this.__scene.remove(this.__floorPlane);
    }

    __drawBoundary(){
        if(this.__boundary && this.__boundary.points.length)       {
            if(this.__boundary.isValid){
                this.removeFromScene();
                this.__floorPlane = this.__buildFloor();
                this.__floorPlane.position.y = -0.5;
                this.__scene.add(this.__floorPlane);
            }
        }
    }

    __buildFloor() {
        let points = [];
        this.__boundary.points.forEach((corner) => {
            points.push(new Vector2(corner.x, corner.y));
        });
        let floorSize = new Vector2(this.__boundary.width, this.__boundary.height);//this.room.floorRectangleSize.clone();
        let shape = new Shape(points);
        let geometry = new ShapeGeometry(shape);
        const uvAttribute = geometry.getAttribute('uv');
        for (let i = 0;i < uvAttribute.count; i++){
            const uv = new Vector2();
            uv.fromBufferAttribute(uvAttribute, i);
            uvAttribute.setXY();
        }

        // geometry.faceVertexUvs[0] = [];

        // geometry.faces.forEach((face) => {
        //     let vertA = geometry.vertices[face.a];
        //     let vertB = geometry.vertices[face.b];
        //     let vertC = geometry.vertices[face.c];
        //     geometry.faceVertexUvs[0].push([Utils.vertexToUv(vertA, floorSize), Utils.vertexToUv(vertB, floorSize), Utils.vertexToUv(vertC, floorSize)]);
        // });

        geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0];
        // geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        geometry.uvsNeedUpdate = true;
        // console.log('COLOR FOR BOUNDARY REGION ::: ', this.__boundary.style.color);
        let material = new FloorMaterial3D({ color: this.__boundary.style.color, side: DoubleSide }, this.__boundary.style, this.__scene);
        let useGeometry = geometry;//new BufferGeometry().fromGeometry(geometry);

        material.dimensions = new Vector2(this.__boundary.width, this.__boundary.height);

        let floor = new Mesh(useGeometry, material);
        floor.rotation.set(Math.PI * 0.5, 0, 0);
        return floor;
    }
}