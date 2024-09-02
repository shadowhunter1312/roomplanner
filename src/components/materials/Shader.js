import {
  MeshPhysicalMaterial,
  Vector2,
  Color,
  TextureLoader,
  RepeatWrapping,
  CanvasTexture,
  DoubleSide, // Import DoubleSide
} from 'three';

export class TiledMaterial extends MeshPhysicalMaterial {
  constructor(parameters, textureMapPack, scene) {
    super({
      side: DoubleSide, // Enable backface rendering

    });
    console.log("2222")
    this.textureMapPack = textureMapPack || {};
    this.__scene = scene;
  this.createTileTexture('#ffffff', '#333333', 256, 2,this.textureMapPack.colormap);
 console.log(this.textureMapPack)
    // Load textures
     // Function to create the tile texture with a grout line


    // Set initial properties

  }

  createTileTexture(tileColor, groutColor, tileSize,groutSize,imageSrc) {
    const canvas = document.createElement('canvas');
    canvas.width = tileSize;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');

    // Draw grout (border)
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const innerSize = tileSize - groutSize * 2;
      ctx.drawImage(image, groutSize, groutSize, innerSize, innerSize);

      // Create texture from the canvas after the image is loaded
      const texture = new CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(5, 5);  // Adjust repetition as needed
  // Adjust the repeat to your needs
  this.map = texture;
      this.needsUpdate = true;
      this.__scene.needsUpdate = true;
    }
    
  }


}
