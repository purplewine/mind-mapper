// controls.ts
import { fabric } from 'fabric';

// Helper type: fabric.Object that may include our custom `nodeId` property
type NodeFabricObject = fabric.Object & { nodeId?: string };

// Type for Fabric transform parameter
type FabricTransform = fabric.Transform;

/**
 * More options control - converted to TypeScript
 */
export function addMoreOptionControl(onClickHandler: (eventData: MouseEvent, transform: FabricTransform) => boolean): fabric.Control {
    const icon =
        "data:image/svg+xml,%3Csvg width='596' height='596' viewBox='0 0 596 596' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_9130_19159)'%3E%3Cg filter='url(%23filter0_d_9130_19159)'%3E%3Cpath d='M278.76 560.52C431.61 560.52 555.52 436.61 555.52 283.76C555.52 130.91 431.61 7 278.76 7C125.91 7 2 130.91 2 283.76C2 436.61 125.91 560.52 278.76 560.52Z' fill='white'/%3E%3Cpath d='M545.52 283.76C545.52 431.087 426.087 550.52 278.76 550.52C131.432 550.52 12 431.087 12 283.76C12 136.432 131.432 17 278.76 17C426.087 17 545.52 136.432 545.52 283.76Z' stroke='%23DADADA' stroke-width='20'/%3E%3C/g%3E%3Ccircle cx='158.05' cy='284' r='40.0498' fill='%236C6C64'/%3E%3Ccircle cx='279' cy='284' r='40.0498' fill='%236C6C64'/%3E%3Ccircle cx='399.95' cy='284' r='40.0498' fill='%236C6C64'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='filter0_d_9130_19159' x='-8' y='1' width='573.52' height='573.52' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E%3CfeColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha'/%3E%3CfeOffset dy='4'/%3E%3CfeGaussianBlur stdDeviation='5'/%3E%3CfeComposite in2='hardAlpha' operator='out'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E%3CfeBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_9130_19159'/%3E%3CfeBlend mode='normal' in='SourceGraphic' in2='effect1_dropShadow_9130_19159' result='shape'/%3E%3C/filter%3E%3CclipPath id='clip0_9130_19159'%3E%3Crect width='595.275' height='595.275' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A";

    const img = new Image();
    img.src = icon;

    const control = new fabric.Control({
        x: 0.5,
        y: -0.5,
        cursorStyle: 'pointer',
        mouseUpHandler: onClickHandler,
        render: renderIcon,

    });

    //   function onClickHandler(eventData: MouseEvent, transform: FabricTransform): boolean {
    //     // target may be undefined in some edge cases, guard it
    //     const target = transform.target as NodeFabricObject | undefined;
    //     console.log('Open More Options', target);

    //     if (target && target.nodeId) {
    //       // assume openNodeModalForNode exists in the surrounding scope or imported
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //       (openNodeModalForNode as any)(target.nodeId);
    //     } else {
    //       console.warn('addMoreOptionControl: target or nodeId missing', target);
    //     }

    //     // Indicate we've handled the event
    //     return true;
    //   }

    function renderIcon(
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: any,
        fabricObject: fabric.Object
    ): void {
        const size = (control as any).cornerSize as number;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    return control;
}

/**
 * Add Child Control - converted to TypeScript
 */
export function addChildControl(onClickHandler: (eventData: MouseEvent, transform: FabricTransform) => any): fabric.Control {
    const icon =
        "data:image/svg+xml,%3Csvg width='596' height='596' viewBox='0 0 596 596' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M278.76 560.52C431.61 560.52 555.52 436.61 555.52 283.76C555.52 130.91 431.61 7 278.76 7C125.91 7 2 130.91 2 283.76C2 436.61 125.91 560.52 278.76 560.52Z' fill='%2301AAFF'/%3E%3Cpath d='M112.416 259V309H444.474V259H112.416Z' fill='white'/%3E%3Cpath d='M303 118H253V450H303V118Z' fill='white'/%3E%3C/svg%3E%0A";

    const img = new Image();
    img.src = icon;

    const control = new fabric.Control({
        x: 0.5,
        y: 0,
        offsetX: 20,
        cursorStyle: 'pointer',
        mouseUpHandler: onClickHandler,
        render: (ctx: CanvasRenderingContext2D,
            left: number,
            top: number,
            _styleOverride: any,
            fabricObject: fabric.Object) => {
                console.log({ctx});
                
            const size = (control as any).cornerSize as number;
            ctx.save();
            ctx.translate(left, top);
            ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
        },
        // cornerSize: 24,
        // withConnection: true,
    });

    //   function onClickHandler(eventData: MouseEvent, transform: FabricTransform): boolean {
    //     const target = transform.target as NodeFabricObject | undefined;
    //     if (!target) {
    //       console.warn('addChildControl: missing transform.target');
    //       return true;
    //     }
    //     const canvas = target.canvas;
    //     console.log({ targetId: target });

    //     if (target.nodeId) {
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //       (addChildToNode as any)(target.nodeId);
    //     } else {
    //       console.warn('addChildControl: target.nodeId missing', target);
    //     }

    //     // Optionally you might want to re-render:
    //     // canvas?.requestRenderAll();

    //     return true;
    //   }

    // function renderIcon(
    //     ctx: CanvasRenderingContext2D,
    //     left: number,
    //     top: number,
    //     _styleOverride: any,
    //     fabricObject: fabric.Object
    // ): void {
    //     console.log('sd', ctx);

    //     const size = (control as any).cornerSize as number;
    //     ctx.save();
    //     ctx.translate(left, top);
    //     ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
    //     ctx.drawImage(img, -size / 2, -size / 2, size, size);
    //     ctx.restore();
    // }

    return control;
}

/**
 * Add Sibling Control - converted to TypeScript
 */
export function addSublingControl(parentId: string, onClickHandler: (eventData: MouseEvent, transform: FabricTransform) => boolean): fabric.Control {
    const icon =
        "data:image/svg+xml,%3Csvg width='596' height='596' viewBox='0 0 596 596' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M278.76 560.52C431.61 560.52 555.52 436.61 555.52 283.76C555.52 130.91 431.61 7 278.76 7C125.91 7 2 130.91 2 283.76C2 436.61 125.91 560.52 278.76 560.52Z' fill='%2301AAFF'/%3E%3Cpath d='M112.416 259V309H444.474V259H112.416Z' fill='white'/%3E%3Cpath d='M303 118H253V450H303V118Z' fill='white'/%3E%3C/svg%3E%0A";

    const img = new Image();
    img.src = icon;

    const control = new fabric.Control({
        x: 0,
        y: 0.5,
        offsetY: 20,
        cursorStyle: 'pointer',
        mouseUpHandler: onClickHandler,
        render: renderIcon,
        // cornerSize: 24,
    });

    //   function onClickHandler(eventData: MouseEvent, transform: FabricTransform): boolean {
    //     const target = transform.target as NodeFabricObject | undefined;
    //     if (!target) {
    //       console.warn('addSublingControl: missing transform.target');
    //       return true;
    //     }
    //     const canvas = target.canvas;
    //     // console.log({target});

    //     if (parentId) {
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //       (addChildToNode as any)(parentId);
    //     } else if (target.nodeId) {
    //       // fallback to using target.nodeId if parentId not provided
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //       (addChildToNode as any)(target.nodeId);
    //     } else {
    //       console.warn('addSublingControl: parentId and target.nodeId both missing', { parentId, target });
    //     }

    //     // canvas?.requestRenderAll();
    //     return true;
    //   }

    function renderIcon(
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: any,
        fabricObject: fabric.Object
    ): void {
        const size = (control as any).cornerSize as number;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
    }

    return control;
}

/**
 * NOTE:
 * - This file assumes the existence of these functions in the runtime scope:
 *    - openNodeModalForNode(nodeId: string): void
 *    - addChildToNode(nodeId: string): void
 *
 * If you want, I can add typed declarations / exports for these or provide small stub implementations.
 */
