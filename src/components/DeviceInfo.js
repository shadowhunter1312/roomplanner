export class DeviceInfo {
    // eslint-disable-next-line no-useless-constructor
    constructor() {

    }

    static isTouchDevice() {
        try {
            document.createEvent('TouchEvent');
            return true;
        } catch (e) {
            return false;
        }
    }
}

export const IS_TOUCH_DEVICE = DeviceInfo.isTouchDevice();