import Enum from 'es6-enum';

/** Dimensioning in Inch. */
export const dimInch = 'inch';

/** Dimensioning in feetAndInch. */
export const dimFeetAndInch = 'feetAndInch';

/** Dimensioning in Feet. */
export const dimFeet = 'feet';

/** Dimensioning in Meter. */
export const dimMeter = 'm';

/** Dimensioning in Centi Meter. */
export const dimCentiMeter = 'cm';

/** Dimensioning in Milli Meter. */
export const dimMilliMeter = 'mm';

export const availableDimUnits = [dimInch, dimFeetAndInch, dimFeet, dimMeter, dimCentiMeter, dimMilliMeter];

export const VIEW_TOP = 'topview';
export const VIEW_FRONT = 'frontview';
export const VIEW_RIGHT = 'rightview';
export const VIEW_LEFT = 'leftview';
export const VIEW_ISOMETRY = 'isometryview';

export const WALL_STANDARD_THICKNESS = 20; // in cm
export const WALL_OFFSET_THICKNESS = 15; // in cm
export const WALL_STANDARD_HEIGHT = 300; // in cm

export const WallTypes = Enum('STRAIGHT', 'CURVED');

export const TEXTURE_DEFAULT_REPEAT = 300;
export const TEXTURE_DEFAULT_REFLECTIVE = 0.5;
export const TEXTURE_DEFAULT_SHININESS = 0.5;
export const TEXTURE_DEFAULT_ROTATION = 0;

export const defaultWallTexture = {
    "ambientmap": "TextureSources/textures/Wall/Stone_Wall_012_SD/Stone_Wall_ambientOcclusion.jpg",
    "colormap": "TextureSources/textures/Wall/Stone_Wall_012_SD/Stone_Wall_basecolor.jpg",
    "roughnessmap": "TextureSources/textures/Wall/Stone_Wall_012_SD/Stone_Wall_roughness.jpg",
    "bumpmap": "TextureSources/textures/Wall/Stone_Wall_012_SD/Stone_Wall_height.png",
    "normalmap": "TextureSources/textures/Wall/Stone_Wall_012_SD/Stone_Wall_normal.jpg",
    rotation: TEXTURE_DEFAULT_ROTATION
};

export const defaultFloorTexture = {
    color: '#FFFFFF',
    emissive: '#181818',
    repeat: TEXTURE_DEFAULT_REPEAT,
    ambientmap: 'TextureSources/textures/Floor/Stone_Tiles_004/Stone_Tiles_004_ambientOcclusion.jpg',
    colormap: 'TextureSources/textures/Floor/Stone_Tiles_004/Stone_Tiles_004_basecolor.jpg',
    roughnessmap: 'TextureSources/textures/Floor/Stone_Tiles_004/Stone_Tiles_004_roughness.jpg',
    normalmap: 'TextureSources/textures/Floor/Stone_Tiles_004/Stone_Tiles_004_normal.jpg',
    rotation: TEXTURE_DEFAULT_ROTATION
};

export const TEXTURE_PROPERTY_COLOR = 'color';
export const TEXTURE_PROPERTY_REPEAT = 'repeat';
export const TEXTURE_PROPERTY_ROTATE = 'rotation';
export const TEXTURE_PROPERTY_REFLECTIVE = 'reflective';
export const TEXTURE_PROPERTY_SHININESS = 'shininess';

export const DEFAULT_FONT_3D_PATH = 'font/helvetiker_regular.typeface.json';

export const TEXTURE_NO_PREVIEW = 'textures/NoPreview.jpg';
export const SPOT_LIGHT = 'SpotLight';
export const DIR_LIGHT = 'DirectionalLight';
export const POINT_LIGHT = 'PointLight';
export const RECT_LIGHT = 'RectAreaLight';
export const HEM_LIGHT = 'HemisphereLight';
export const AMB_LIGHT = 'AmbientLight';
export const SUN_LIGHT = 'SunLight';
