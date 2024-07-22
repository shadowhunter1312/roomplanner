import { AfterViewInit, Component, ElementRef, Input, ViewChild, HostListener } from '@angular/core';
import * as THREE from 'three';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class CubeComponent implements AfterViewInit {
  title = 'room';
  usver = 'Денисов Илья Dragon3DGRaff';
  
    private cameraPerpective: THREE.PerspectiveCamera;
    private cameraOrtho: THREE.OrthographicCamera;
    private camera:  any;
    roomCount: number = 0;

    private get canvas() : HTMLCanvasElement {
      return this.canvasRef.nativeElement;
    }
        
    @ViewChild('canvas', {static: false})
    private canvasRef: ElementRef;
  
  
    private renderer: THREE.WebGLRenderer;
  
    private scene: THREE.Scene;
    private grid: THREE.LineSegments;

    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private objects: THREE.Mesh[] = [];
    private plane: THREE.Mesh;
   
    private firstPoint: THREE.Vector2 = undefined;
    private lastPoint: THREE.Vector2 = undefined;

    private Phantom: THREE.Mesh;
    private MaterialPhantom:  THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    private MaterialPhantomLine:  THREE.LineBasicMaterial = new THREE.LineBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
  
    private MaterialSubPar: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial( { color: new THREE.Color('lime')} );

  
    private magnitized: boolean = false;
    private magnitPoint: THREE.Vector3 = new THREE.Vector3();
    private phantomMagnetLine;


    public  MODE:string = "_SIMPLEPARRALILLEPIPED";//"_NOTHING";

    private selectables: THREE.Mesh[] = [];
    private linesRoomArray: any[] = [];

   private floorPointsArray: THREE.Vector2[] = [];
   private floorArray: THREE.Mesh[] = [];
   @Input() public viewMode: string = "Ortho"; //"Ortho" "3D"
   @Input() public magnetMode: boolean = false;

    private movement = {
      obj: undefined,
      moving: false,
      startPoint: undefined,
      deltaX: undefined,
      deltaZ: undefined,
      clear: function(){
        this.obj = undefined,
          this.moving = false,
          this.startPoint = undefined,
          this.deltaX = undefined,
          this.deltaZ = undefined
      },
    }

    private testMesh: THREE.Mesh;
    
     coords: string = "Нажмите кнопку \"Комната\", чтобы начать построение. Комнату нужно создавать против часовой стрелки";
   
    @Input() height: number;
  @Input() width: number;

  
    @Input()
    public size: number = 1;
  
    @Input()
    public cameraZ: number = 400;
  
    @Input()
    public fieldOfView: number = 70;
  
    @Input('nearClipping')
    public nearClippingPane: number = 1;
  
    @Input('farClipping')
    public farClippingPane: number = 1000;

    @Input()
    public frustumSize: number = 25;
  
  
  
    
    constructor() { }

    createParallelepiped (x: number, y: number, z: number, widthX: number = 0, widthY: number = 0, height: number, Material: THREE.Material){
      let geometry = new THREE.BoxGeometry(widthX, widthY, height);
      
      let Parallelepiped: THREE.Mesh = new THREE.Mesh(geometry, Material);
      Parallelepiped.position.x = x;
      Parallelepiped.position.y = y;
      Parallelepiped.position.z = z;     

      this.scene.add(Parallelepiped);
      return Parallelepiped;
    }
    createSphereHelper(x: number, y: number, z: number, radius: number){
      let geometry: THREE.SphereBufferGeometry = new THREE.SphereBufferGeometry(radius);
      let sphereHelper: THREE.Mesh = new THREE.Mesh(geometry, this.MaterialPhantom);
      sphereHelper.position.x = x;
      sphereHelper.position.y = y;
      sphereHelper.position.z = z; 
      sphereHelper.name = "Сфера";
      this.scene.add(sphereHelper);
      return sphereHelper;
    };

    //-------------Переключение режимов приложения------------
    buttonMoveClick (event:any){
      this.MODE = "_MOVE"; 
      this.coords = this.MODE;
    }
    buttonParallelepipedClick (event:any){
      this.MODE = "_SIMPLEPARRALILLEPIPED"; 
      this.coords = this.MODE;
    }
    buttonRoomClick (event:any){
      this.MODE = "_ROOMCREATION"; 
      this.coords = this.MODE;
    }
   //----------------------------------------------------------

   //-------------------Переключение режима камеры----------------
   button3DClick(event: any){
   }
   button2DClick(event: any){
    this.viewMode = "Ortho";
     //----------------Camera-------------------------- 
     let aspectRatio = this.getAspectRatio();
     //для OrthographicCamera
     if (this.viewMode === "Ortho"){

     this.cameraOrtho = new THREE.OrthographicCamera(
         this.frustumSize * aspectRatio/-2,
          this.frustumSize * aspectRatio/2,
          this.frustumSize   / 2,
          this.frustumSize   / -2,
          0.001,
          1000         
     );
     this.camera = this.cameraOrtho;
     
     }
     this.camera.position.z = 0;
     this.camera.position.y = 9;
     this.camera.position.x = 0;
     this.camera.lookAt(0,0,0);
    
   }

   createRoomFunction(){
   }

  @HostListener('document:keydown.enter', ['$event']) //при нажанатии на Enter создаем комнату
   onKeydownHandler(event: KeyboardEvent) {
}

evbuttonFinishRoom (event: any){
  this.createRoomFunction();   

}
 drawLine (x: number,y: number,z: number,x1: number,y1: number,z1: number, material: THREE.LineBasicMaterial){
}

   //-------------------------------------------------------------
    
    onDocumentMouseClick (event: any){
    }


onDocumentMouseDown (event: any){
} 
onDocumentMouseMove(event: MouseEvent){
 }
  
 onDocumentMouseUp(event: MouseEvent){  
    }
    
     //----------------------Создание сцены---------------------
    private createScene() {
      
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color( 'lightgrey' );

      
  
      //----------------Camera-------------------------- 
      let aspectRatio = this.getAspectRatio();
      
      
     
      //для OrthographicCamera
      if (this.viewMode === "Ortho"){

      this.cameraOrtho = new THREE.OrthographicCamera(
          this.frustumSize * aspectRatio/-2,
           this.frustumSize * aspectRatio/2,
           this.frustumSize   / 2,
           this.frustumSize   / -2,
           0.001,
           1000         
      );
      this.camera = this.cameraOrtho;
      this.camera.position.z = 0;
      this.camera.position.y = 9;
      this.camera.position.x = 0;
      this.camera.lookAt(0,0,0);
      }

      //для PerspectiveCamera

      if (this.viewMode === "3D"){

      this.cameraPerpective = new THREE.PerspectiveCamera(
        this.fieldOfView,
        aspectRatio,
        this.nearClippingPane,
        this.farClippingPane
      );
      this.camera = this.cameraPerpective;
       this.camera.position.z = 8;
			this.camera.position.y = 9;
			this.camera.position.x = 6;
      this.camera.lookAt(0,0,0);
      }

        //--------------------Главная плоскость построения--------------------
        let geomPlane = new THREE.PlaneBufferGeometry(20,20,2 ,2 );
        let materialPlane = new THREE.MeshBasicMaterial( {color: new THREE.Color('white'), side: THREE.DoubleSide} );
        this.plane = new THREE.Mesh( geomPlane, materialPlane );
        this.plane.rotation.x = 90 *(Math.PI/180);
        this.plane.position.y = -0.001;
        this.plane.name = "mainPlane";
        this.scene.add(this.plane);
        this.objects.push( this.plane);
        
        //-------------------Сетка----------------------
      this.grid = new THREE.GridHelper( 20, 20, 0x0000ff,  new THREE.Color('grey'));
      this.grid.position.y = 0.01;     			
        this.scene.add( this.grid )
    }
  
    private getAspectRatio() {
      return this.canvas.clientWidth / this.canvas.clientHeight;
    }
  
    
    private startRenderingLoop() {   
      if (this.viewMode === "3D"){
        this.camera = this.cameraPerpective;
      }
      else {
        this.camera = this.cameraOrtho;
        // console.log(this.camera);  
      }
      
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setPixelRatio(devicePixelRatio);
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  
      let component: CubeComponent = this;
      (function render() {            
        requestAnimationFrame(render);        
        component.renderer.render(component.scene, component.camera);
               
        // component.animateCube();
       
      }());
    }
  
  
    @HostListener('window:resize', [])
onResize(): void {
  
    // @HostListener('window:resize', ['$event'])
    // public onResize() {

      //                                            ПОЧЕМУ RESIZE НЕ РАБОТАЕТ????

      // this.height = window.innerHeight;
      // this.width = window.innerWidth;
      
      //  this.canvas.width = event.target.innerWidth;
      //  this.canvas.height = event.target.innerHeight;
      //  console.log(event.target.innerWidth);
      //  console.log(this.canvas.clientWidth);
      //  this.canvas.height = event.target.hei;
      //-------------------для PerspectiveCamera-------------
      if (this.viewMode === "3D"){
      this.cameraPerpective.aspect = this.getAspectRatio();
      this.camera = this.cameraPerpective;
      }
      
      //----------------для OrthographicCamera--------------
      if (this.viewMode === "Ortho"){
      this.cameraOrtho.left = - this.frustumSize *  this.getAspectRatio()/2;
      this.cameraOrtho.right =    this.frustumSize *  this.getAspectRatio()/2;
      this.cameraOrtho.top = this.frustumSize/2 ;
      this.cameraOrtho.bottom = - this.frustumSize /2 ;
      this.camera = this.cameraOrtho;
      }
      
      this.camera.updateProjectionMatrix();      
  
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      
    }
  
    //-----------------после загрузки DOM--------------------
    public ngAfterViewInit() {
      this.createScene(); 
         
      this.startRenderingLoop();
      
    }
}