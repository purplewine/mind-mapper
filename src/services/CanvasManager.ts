import { fabric } from "fabric";
import { TreeLayoutEngine, DEFAULT_LAYOUT_CONFIG, LayoutConfig } from './LayoutEngine';
import {
  _getCalculatedJSON,
  _getProcessedChildNodeProperties,
  _getProcessedText,
  _getRandomBrightColor,
  createBezierPath
} from "../services/helper";

// ============================================
// Constants
// ============================================

const DEFAULT_NODE_COLOR = "#ffffff";
const DEFAULT_TEXT_COLOR = "#000000";
const DEFAULT_CANVAS_BG_COLOR = "#d8dade";
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1;

const FABRIC_DEFAULTS = {
  cornerColor: "#ffffff",
  cornerStrokeColor: "#2dd55b",
  borderColor: "#2dd55b",
  cornerSize: 8,
  transparentCorners: false,
  cornerStyle: 'circle'
} as const;

const ZOOM_STEP = 0.1;
const ZOOM_WHEEL_SENSITIVITY = 0.989;

// ============================================
// Types
// ============================================

type FabricTransform = fabric.Transform;
type NodeFabricObject = fabric.Object & { nodeId?: number };

export interface MediaFile {
  name: string;
  url: string;
  type: string;
}

export interface MindNode {
  id: number;
  group: fabric.Group;
  x: number;
  y: number;
  parentId: number | null;
  children: number[];
  size: NodeSize;
  width: number;
  height: number;
  title: string;
  notes: string;
  media: MediaFile[];
  isCollapsed: boolean;
  aiSummary?: string;
  color: string;
}

export interface AIMindNodeStructure {
  header: string;
  description: string;
  sources: Array<{ name: string; link: string }>;
  children: AIMindNodeStructure[];
}

export interface Connection {
  from: number;
  to: number;
  path?: fabric.Path;
}

export type NodeSize = "small" | "medium" | "large" | "xlarge";

interface NodeSizeConfig {
  width: number;
  height: number;
  fontSize: number;
}

type NodeSizes = Record<NodeSize, NodeSizeConfig>;

interface NodeDetails {
  text: string;
  description: string;
}

// ============================================
// Canvas Manager
// ============================================

export default class CanvasManager {
  public canvas: fabric.Canvas;
  public nodes: MindNode[] = [];
  private connections: Connection[] = [];
  private nodeIdCounter = 0;
  private layoutEngine: TreeLayoutEngine;

  // Interaction state
  private isPanMode = false;
  private isDragging = false;
  private lastPosX = 0;
  private lastPosY = 0;
  private zoomLevel = 1;

  // Callbacks
  private onOpenNode: (node: MindNode) => void;
  private onAIControlClick?: (event: MouseEvent, node: MindNode) => void;
  private openSummarizer?: () => void;

  private readonly nodeSizes: NodeSizes = {
    small: { width: 120, height: 50, fontSize: 14 },
    medium: { width: 150, height: 60, fontSize: 16 },
    large: { width: 180, height: 70, fontSize: 24 },
    xlarge: { width: 220, height: 85, fontSize: 32 },
  };

  constructor(
    canvasEl: HTMLCanvasElement,
    nodeJson: string | null,
    onOpenNode: (node: MindNode) => void,
    onAIControlClick?: (event: MouseEvent, node: MindNode) => void,
    openSummarizer?: () => void
  ) {
    this.onOpenNode = onOpenNode;
    this.onAIControlClick = onAIControlClick;
    this.openSummarizer = openSummarizer;

    this.canvas = this.initializeCanvas(canvasEl);
    this.applyFabricDefaults();
    this.setupEvents();
    this.setupWindowListeners();

    if (nodeJson) {
      this.recreateCanvasFromJson(nodeJson);
    }

    this.layoutEngine = this.createLayoutEngine();
  }

  // ============================================
  // Initialization
  // ============================================

  private initializeCanvas(canvasEl: HTMLCanvasElement): fabric.Canvas {
    const wrapper = canvasEl.parentElement || document.body;
    return new fabric.Canvas(canvasEl, {
      width: wrapper.clientWidth,
      height: wrapper.clientHeight,
      backgroundColor: DEFAULT_CANVAS_BG_COLOR,
    });
  }

  private applyFabricDefaults(): void {
    Object.assign(fabric.Object.prototype, FABRIC_DEFAULTS);
  }

  private createLayoutEngine(): TreeLayoutEngine {
    const config: LayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      horizontalSpacing: 500,
      verticalGap: 50
    };

    return new TreeLayoutEngine(
      this.canvas,
      this.nodes,
      this.connections,
      config
    );
  }

  private setupWindowListeners(): void {
    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = (): void => {
    this.resizeCanvas();
  };

  private resizeCanvas(): void {
    const wrapper = this.canvas.getElement().parentElement;
    if (!wrapper) return;

    this.canvas.setDimensions({
      width: wrapper.clientWidth,
      height: wrapper.clientHeight
    });
    this.canvas.renderAll();
  }

  // ============================================
  // Event Setup
  // ============================================

  private setupEvents(): void {
    this.setupSelectionEvents();
    this.setupMouseEvents();
    this.setupDoubleClickEvent();
  }

  private setupSelectionEvents(): void {
    this.canvas.on("selection:created", this.handleSelection);
    this.canvas.on("selection:updated", this.handleSelection);
  }

  private handleSelection = (e: fabric.IEvent): void => {
    const activeObject = (e as any).selected?.[0] as NodeFabricObject;
    if (activeObject?.nodeId !== undefined) {
      this.showMinimizeControl(activeObject.nodeId);
    }
  };

  private setupMouseEvents(): void {
    this.canvas.on("mouse:down", this.handleMouseDown);
    this.canvas.on("mouse:move", this.handleMouseMove);
    this.canvas.on("mouse:up", this.handleMouseUp);
    this.canvas.on("mouse:wheel", this.handleMouseWheel);
    this.canvas.on("object:moving", this.handleObjectMoving);
  }

  private handleMouseDown = (e: fabric.IEvent): void => {
    const event = e.e as MouseEvent;

    if (this.isPanMode) {
      this.startPanning(event);
      return;
    }

    // Handle custom button clicks
    const target = e.target as any;
    if (target?.isEditButton && target.nodeId !== undefined) {
      const node = this.findNode(target.nodeId);
      if (node) this.onOpenNode(node);
    }
  };

  private startPanning(event: MouseEvent): void {
    this.isDragging = true;
    this.canvas.selection = false;
    this.lastPosX = event.clientX;
    this.lastPosY = event.clientY;
  }

  private handleMouseMove = (e: fabric.IEvent): void => {
    if (!this.isPanMode || !this.isDragging) return;

    const event = e.e as MouseEvent;
    const vpt = this.canvas.viewportTransform!;

    vpt[4] += event.clientX - this.lastPosX;
    vpt[5] += event.clientY - this.lastPosY;

    this.canvas.requestRenderAll();
    this.lastPosX = event.clientX;
    this.lastPosY = event.clientY;
  };

  private handleMouseUp = (): void => {
    if (this.isPanMode) {
      this.isDragging = false;
    }
  };

  private handleMouseWheel = (opt: fabric.IEvent): void => {
    const event = opt.e as WheelEvent;
    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey) {
      this.handleZoomWheel(event);
    } else {
      this.handlePanWheel(event);
    }
  };

  private handleZoomWheel(event: WheelEvent): void {
    const delta = event.deltaY;
    let zoom = this.canvas.getZoom();
    zoom *= Math.pow(ZOOM_WHEEL_SENSITIVITY, delta);

    this.canvas.zoomToPoint(
      { x: event.offsetX, y: event.offsetY },
      zoom
    );
  }

  private handlePanWheel(event: WheelEvent): void {
    const vpt = this.canvas.viewportTransform!;
    vpt[4] -= event.deltaX;
    vpt[5] -= event.deltaY;
    this.canvas.setViewportTransform(vpt);
    this.canvas.requestRenderAll();
  }

  private handleObjectMoving = (e: fabric.IEvent): void => {
    const target = e.target as NodeFabricObject;
    if (target?.nodeId !== undefined) {
      this.updateNodeConnections(target.nodeId);
    }
  };

  private setupDoubleClickEvent(): void {
    const upperCanvas = (this.canvas as any).upperCanvasEl;
    fabric.util.addListener(upperCanvas, 'dblclick', this.handleDoubleClick);
  }

  private handleDoubleClick = (e: MouseEvent): void => {
    const target = (this.canvas as any).findTarget(e);
    if (target?.nodeId !== undefined) {
      this.openSummarizer?.();
      // this.openNodeModalForNodeId(target.nodeId);
    }
  };

  // ============================================
  // Node Management
  // ============================================

  addNode(nodeDetails: NodeDetails, nodeId?: number, parentId: number | null = null): number {
    const position = this.calculateRandomPosition();
    const updatedNodeId = this.createNode(
      position.x,
      position.y,
      nodeDetails.text,
      DEFAULT_NODE_COLOR,
      DEFAULT_TEXT_COLOR,
      parentId,
      "medium",
      nodeId
    );

    const node = this.findNode(updatedNodeId);
    if (node) {
      node.notes = nodeDetails.description;
    }

    return updatedNodeId;
  }

  private calculateRandomPosition(): { x: number; y: number } {
    const width = this.canvas.width ?? 800;
    const height = this.canvas.height ?? 600;

    return {
      x: Math.random() * (width - 300) + 150,
      y: Math.random() * (height - 150) + 75
    };
  }

  createNode(
    x: number,
    y: number,
    text: string,
    bgColor: string,
    textColor: string,
    parentId: number | null = null,
    sizeType: NodeSize = "small",
    forcedId?: number
  ): number {
    const nodeId = forcedId ?? this.nodeIdCounter++;
    if (parentId === null) {
      sizeType = "large";
    }
    const group = this.createNodeGroup(x, y, text, bgColor, textColor, sizeType, parentId);

    const node = this.createNodeObject(nodeId, group, x, y, text, sizeType, parentId);

    this.nodes.push(node);
    this.handleNodeParenting(nodeId, parentId);

    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();

    return nodeId;
  }

  private createNodeGroup(
    x: number,
    y: number,
    text: string,
    bgColor: string,
    textColor: string,
    sizeType: NodeSize,
    parentId: number | null
  ): fabric.Group {
    const size = this.nodeSizes[sizeType];
    const textObj = this.createTextObject(text, textColor, size, parentId);
    const rect = this.createRectObject(textObj, bgColor, size);

    const group = new fabric.Group([rect, textObj], {
      left: x,
      top: y,
      selectable: true,
      lockMovementX: true,
      lockMovementY: true,
      hasBorders: true,
      lockRotation: true,
      originX: "center",
      originY: "center",
    } as any);

    group.controls = this.createNodeControls();

    return group;
  }

  private createTextObject(
    text: string,
    textColor: string,
    size: NodeSizeConfig,
    parentId: number | null
  ): fabric.Text {
    return new fabric.Text(_getProcessedText(this.nodeSizes, text), {
      fontSize: size.fontSize,
      fill: textColor,
      fontFamily: "Lato, opensans, sans-serif",
      fontWeight: parentId === null ? "800" : "400",
      originX: "center",
      originY: "center",
      textAlign: "center",
      splitByGrapheme: true,
    } as any);
  }

  private createRectObject(textObj: fabric.Text, bgColor: string, size: NodeSizeConfig): fabric.Rect {

    const innerWidth = size.width + ((textObj.width || 1) * (textObj.scaleX || 1));
    const innerHeight = size.height + ((textObj.height || 1) * (textObj.scaleY || 1));

    // const innerWidth = 25 + ((textObj.width || 1) * (textObj.scaleX || 1));
    // const innerHeight = 25 + ((textObj.height || 1) * (textObj.scaleY || 1));

    return new fabric.Rect({
      left: -innerWidth / 2,
      top: -innerHeight / 2,
      width: innerWidth,
      height: innerHeight,
      fill: bgColor,
      rx: 10,
      ry: 10,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.2)',
        blur: 10,
        offsetX: 0,
        offsetY: 4
      })
    } as any);
  }

  private createNodeObject(
    nodeId: number,
    group: fabric.Group,
    x: number,
    y: number,
    text: string,
    sizeType: NodeSize,
    parentId: number | null
  ): MindNode {
    const size = this.nodeSizes[sizeType];
    (group as any).nodeId = nodeId;

    return {
      id: nodeId,
      group,
      x,
      y,
      parentId,
      children: [],
      size: sizeType,
      width: size.width,
      height: size.height,
      title: text,
      notes: "",
      media: [],
      aiSummary: "",
      isCollapsed: false,
      color: _getRandomBrightColor()
    };
  }

  private handleNodeParenting(nodeId: number, parentId: number | null): void {
    if (parentId === null) return;

    const parent = this.findNode(parentId);
    if (parent) {
      parent.children.push(nodeId);
      this.createConnection(parentId, nodeId);
    }
  }

  addChildNode(parentId: number): void {
    const parent = this.findNode(parentId);
    if (!parent) return;

    // Use parent's position as temporary position
    // autoArrange will position it correctly
    const tempX = parent.x + 1000;
    const tempY = parent.y;

    const newNodeId = this.createNode(
      tempX,
      tempY,
      'Untitled Node',
      DEFAULT_NODE_COLOR,
      DEFAULT_TEXT_COLOR,
      parentId,
      "medium"
    );

    // Auto-arrange will calculate proper positions
    this.autoArrange();
    this.openNodeModalForNodeId(newNodeId);
  }

  deleteSelectedNode(): void {
    const activeObject = this.canvas.getActiveObject() as NodeFabricObject;
    if (!activeObject?.nodeId) return;

    if (activeObject.nodeId === 0) {
      alert("Cannot delete the central node.");
      return;
    }

    this.deleteNode(activeObject.nodeId);
    this.autoArrange();
  }

  deleteNode(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;

    // Delete children recursively
    node.children.forEach(childId => this.deleteNode(childId));

    // Remove connections
    this.removeNodeConnections(nodeId);

    // Remove from parent's children
    this.removeFromParent(nodeId, node.parentId);

    // Remove from canvas and nodes array
    this.canvas.remove(node.group);
    this.nodes = this.nodes.filter(n => n.id !== nodeId);

    this.canvas.renderAll();
  }

  private removeNodeConnections(nodeId: number): void {
    this.connections = this.connections.filter(conn => {
      if (conn.from === nodeId || conn.to === nodeId) {
        if (conn.path) {
          this.canvas.remove(conn.path);
        }
        return false;
      }
      return true;
    });
  }

  private removeFromParent(nodeId: number, parentId: number | null): void {
    if (parentId === null) return;

    const parent = this.findNode(parentId);
    if (parent) {
      parent.children = parent.children.filter(id => id !== nodeId);
    }
  }

  saveNodeDetails(updated: Partial<MindNode> & { id: number }): void {
    const node = this.findNode(updated.id);
    if (!node) return;

    const nodeIndex = this.nodes.findIndex(n => n.id === updated.id);

    // Remove old node
    this.canvas.remove(node.group);
    this.nodes.splice(nodeIndex, 1);

    // Create updated node
    this.addNode(
      {
        text: updated.title || node.title,
        description: updated.notes || node.notes
      },
      node.id,
      node.parentId
    );

    // Update additional properties
    const updatedNode = this.findNode(updated.id);
    if (updatedNode) {
      updatedNode.media = updated.media || node.media;
      updatedNode.aiSummary = updated.aiSummary || node.aiSummary;
      updatedNode.group.setCoords();
      this.updateNodeConnections(updatedNode.id);
    }

    this.autoArrange();
  }

  // ============================================
  // Connection Management
  // ============================================

  createConnection(fromId: number, toId: number): void {
    const fromNode = this.findNode(fromId);
    const toNode = this.findNode(toId);

    if (!fromNode || !toNode) return;

    const path = createBezierPath(
      fromNode.group.getCenterPoint(),
      toNode.group.getCenterPoint(),
      fromNode.color
    );

    this.connections.push({ from: fromId, to: toId, path });
    this.canvas.add(path);
    this.canvas.sendToBack(path);
  }

  updateNodeConnections(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;

    const center = node.group.getCenterPoint();
    node.x = center.x;
    node.y = center.y;

    this.connections.forEach(conn => {
      if (conn.from !== nodeId && conn.to !== nodeId) return;

      const fromNode = this.findNode(conn.from);
      const toNode = this.findNode(conn.to);

      if (!fromNode || !toNode) return;

      // Remove old path
      if (conn.path) {
        this.canvas.remove(conn.path);
      }

      // Create new path
      conn.path = createBezierPath(
        fromNode.group.getCenterPoint(),
        toNode.group.getCenterPoint(),
        fromNode.color
      );

      this.canvas.add(conn.path);
      this.canvas.sendToBack(conn.path);
    });

    this.canvas.renderAll();
  }

  // ============================================
  // Layout Management
  // ============================================

  autoArrange(): void {
    // Reinitialize layout engine with current nodes and connections
    // This ensures it has the latest state
    this.layoutEngine = this.createLayoutEngine();
    this.hideCollapsedChildren();
    this.layoutEngine.arrange();
  }

  hideCollapsedChildren(): void {
    this.layoutEngine.hideCollapsedChildren();
  }

  // ============================================
  // AI Node Structure
  // ============================================

  createChildNodeStructure(parentId: number, nodeDetails: AIMindNodeStructure): void {
    const parent = this.findNode(parentId);
    if (!parent) return;

    // Update parent notes and sources
    this.updateParentWithAIData(parent, nodeDetails);

    // Create child nodes recursively
    this.createNodesRecursively(parentId, nodeDetails.children);
    this.autoArrange();
  }

  private updateParentWithAIData(parent: MindNode, nodeDetails: AIMindNodeStructure): void {
    parent.notes = parent.notes
      ? `${parent.notes}\n\n${nodeDetails.description}`
      : nodeDetails.description;

    if (nodeDetails.sources?.length > 0) {
      const sourcesText = this.formatSources(nodeDetails.sources);
      parent.notes = `${parent.notes}\n\nSources:\n${sourcesText}`;
    }
  }

  private formatSources(sources: Array<{ name: string; link: string }>): string {
    return sources
      .map(source => `${source.name}: ${source.link}`)
      .join('\n');
  }

  private createNodesRecursively(parentId: number, children: AIMindNodeStructure[]): void {
    if (!children?.length) return;

    children.forEach(child => {
      const parent = this.findNode(parentId);
      if (!parent) return;

      const newNodeId = this.createChildWithAIData(parent, child);

      if (child.children?.length > 0) {
        this.createNodesRecursively(newNodeId, child.children);
      }
    });
  }

  private createChildWithAIData(parent: MindNode, child: AIMindNodeStructure): number {
    // Use parent's position as temporary position
    // autoArrange will position it correctly
    const tempX = parent.x + 200;
    const tempY = parent.y;

    const newNodeId = this.createNode(
      tempX,
      tempY,
      child.header,
      DEFAULT_NODE_COLOR,
      DEFAULT_TEXT_COLOR,
      parent.id,
      "medium"
    );

    const newNode = this.findNode(newNodeId);
    if (newNode) {
      newNode.notes = child.description || '';

      if (child.sources?.length > 0) {
        const sourcesText = this.formatSources(child.sources);
        newNode.notes += `\n\nSources:\n${sourcesText}`;
      }
    }

    return newNodeId;
  }

  // ============================================
  // Controls
  // ============================================

  private createNodeControls(): Record<string, fabric.Control> {
    return {
      mr: this.createAddChildControl(),
      ml: this.createAIControl(),
      br: this.createMinimizeControl(),
      bl: this.createMaximizeControl(),
    };
  }

  private showMinimizeControl(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (!node || node.children.length === 0) return;

    node.group.setControlsVisibility({
      br: !(node.isCollapsed),
      bl: node.children.length === 0 ? false : node.isCollapsed,
      mr: !(node.isCollapsed),
    });
  }

  private createAddChildControl(): fabric.Control {
    const icon = "data:image/svg+xml,%3Csvg width='596' height='596' viewBox='0 0 596 596' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M278.76 560.52C431.61 560.52 555.52 436.61 555.52 283.76C555.52 130.91 431.61 7 278.76 7C125.91 7 2 130.91 2 283.76C2 436.61 125.91 560.52 278.76 560.52Z' fill='%230054e9'/%3E%3Cpath d='M112.416 259V309H444.474V259H112.416Z' fill='white'/%3E%3Cpath d='M303 118H253V450H303V118Z' fill='white'/%3E%3C/svg%3E%0A";

    return this.createControlWithIcon(icon, 0.5, 0, 20, 0, (target) => {
      if (target.nodeId !== undefined) {
        this.addChildNode(target.nodeId);
      }
    });
  }

  private createAIControl(): fabric.Control {
    const icon = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23FFC409'/%3E%3Cpath d='M10.0881 19.5C10.0044 19.5001 9.92159 19.4818 9.84563 19.4465C9.76967 19.4112 9.70238 19.3596 9.64847 19.2955C9.59456 19.2314 9.55535 19.1562 9.53359 19.0753C9.51182 18.9944 9.50804 18.9097 9.52251 18.8272V18.8238L10.4009 14H7.00001C6.90561 14 6.81314 13.9733 6.7333 13.9229C6.65346 13.8726 6.5895 13.8006 6.54884 13.7154C6.50817 13.6302 6.49245 13.5353 6.5035 13.4415C6.51454 13.3478 6.5519 13.2591 6.61126 13.1857L13.4603 4.71879C13.5383 4.61983 13.6465 4.54913 13.7685 4.5175C13.8904 4.48586 14.0193 4.49504 14.1356 4.54362C14.2518 4.59221 14.3489 4.67753 14.4121 4.78653C14.4753 4.89554 14.501 5.02223 14.4853 5.14723C14.4853 5.15661 14.4828 5.16567 14.4813 5.17504L13.5997 10H17C17.0944 10.0001 17.1869 10.0268 17.2667 10.0772C17.3466 10.1275 17.4105 10.1995 17.4512 10.2846C17.4918 10.3698 17.5076 10.4648 17.4965 10.5586C17.4855 10.6523 17.4481 10.741 17.3888 10.8144L10.5388 19.2813C10.4849 19.3493 10.4165 19.4043 10.3384 19.4422C10.2604 19.48 10.1749 19.4998 10.0881 19.5Z' fill='black'/%3E%3C/svg%3E%0A";

    return this.createControlWithIcon(icon, 0.5, -0.5, 0, 0, (target, event) => {
      if (target.nodeId !== undefined && this.onAIControlClick) {
        const node = this.findNode(target.nodeId);
        if (node) {
          this.onAIControlClick(event, node);
        }
      }
    }, 30);
  }

  private createMinimizeControl(): fabric.Control {
    const icon = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 108 108' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='54' cy='54' r='54' fill='%23E0E0E0'/%3E%3Cpath d='M28 54L81 54' stroke='black' stroke-width='17' stroke-linecap='round'/%3E%3C/svg%3E%0A";

    return this.createControlWithIcon(icon, 0, 0.5, 0, 20, (target) => {
      if (target.nodeId !== undefined) {
        this.minimizeNode(target.nodeId);
        this.autoArrange();

      }
    });
  }

  private createMaximizeControl(): fabric.Control {
    const icon = "data:image/svg+xml,%3Csvg width='108' height='108' viewBox='0 0 108 108' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='54' cy='54' r='54' fill='%23E0E0E0'/%3E%3Cpath d='M27 54L80 54' stroke='black' stroke-width='17' stroke-linecap='round'/%3E%3Cpath d='M58 76L80 54' stroke='black' stroke-width='17' stroke-linecap='round'/%3E%3Cpath d='M58 32L80 54' stroke='black' stroke-width='17' stroke-linecap='round'/%3E%3C/svg%3E%0A";

    return this.createControlWithIcon(icon, 0, 0.5, 0, 20, (target) => {
      if (target.nodeId !== undefined) {
        const node = this.findNode(target.nodeId);
        if (node) {
          this.minimizeSublings(target.nodeId);
          node.isCollapsed = false;
          const rect = node.group.getObjects().find(o => o.type === "rect");
          if (rect) {
            rect.set({
              fill: DEFAULT_NODE_COLOR
            });
          }
          this.autoArrange();
          this.canvas.discardActiveObject();
          this.canvas.requestRenderAll();

          this.fitVisibleDescendantsInView(node.id);
        }
      }
    });
  }


  private minimizeNode(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    if (node) {
      node.isCollapsed = true;
      const rect = node.group.getObjects().find(o => o.type === "rect");
      if (rect) {
        rect.set({
          fill: "#fff6db"
        });
      }
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
    }
  }

  private minimizeSublings(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    if (node && node.parentId !== null) {
      const parentNode = this.findNode(node.parentId)
      if (parentNode) {
        parentNode.children.forEach(childId => {
          if (childId !== nodeId) {
            this.minimizeAllDecendants(childId);
          }
        });
      }
      
    }
  }

  private minimizeAllDecendants(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (!node) return;
    if (node) {
      if (node.children.length > 0) {
        for (const childNode of node.children) {
          this.minimizeAllDecendants(childNode);
        }
        this.minimizeNode(nodeId);
      }
    }
  }


  private fitVisibleDescendantsInView(parentNodeId: number, animated: boolean = true): void {
    // Get all visible descendants recursively
    const visibleNodes = this.getAllVisibleDescendants(parentNodeId);

    // Include the parent node itself
    const parentNode = this.nodes.find(n => n.id === parentNodeId);
    if (parentNode) {
      visibleNodes.push(parentNode);
    }

    if (visibleNodes.length === 0) return;

    // Get bounding box of all visible nodes
    const bounds = this.getNodesBoundingBox(visibleNodes);

    if (!bounds) return;

    const padding = 50;
    const canvasWidth = this.canvas.width ?? 800;
    const canvasHeight = this.canvas.height ?? 600;

    // Calculate zoom level to fit all visible nodes
    const zoomX = canvasWidth / (bounds.width + padding * 2);
    const zoomY = canvasHeight / (bounds.height + padding * 2);
    const targetZoom = Math.min(zoomX, zoomY, MAX_ZOOM);

    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    if (animated) {
      this.animateViewport(targetZoom, centerX, centerY);
    } else {
      this.zoomLevel = Math.max(targetZoom, MIN_ZOOM);
      this.canvas.setZoom(this.zoomLevel);

      const vpt = this.canvas.viewportTransform!;
      vpt[4] = canvasWidth / 2 - centerX * this.zoomLevel;
      vpt[5] = canvasHeight / 2 - centerY * this.zoomLevel;

      this.canvas.requestRenderAll();
    }
  }

  private getAllVisibleDescendants(parentNodeId: number): MindNode[] {
    const visibleNodes: MindNode[] = [];
    const queue: number[] = [parentNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // Get direct children of current node
      const children = this.nodes.filter(n => n.parentId === currentId);

      for (const child of children) {
        // Only include if the node is visible
        if (child.group.visible) {
          visibleNodes.push(child);

          // If this child has visible children, add it to queue to process its children
          const hasVisibleChildren = this.nodes.some(
            n => n.parentId === child.id && n.group.visible
          );

          if (hasVisibleChildren) {
            queue.push(child.id);
          }
        }
      }
    }

    return visibleNodes;
  }

  private getNodesBoundingBox(nodes: MindNode[]): {
    left: number;
    top: number;
    width: number;
    height: number
  } | null {
    if (nodes.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      const bounds = node.group.getBoundingRect(true); // true for absolute coords

      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.left + bounds.width);
      maxY = Math.max(maxY, bounds.top + bounds.height);
    });

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private animateViewport(targetZoom: number, centerX: number, centerY: number): void {
    const startZoom = this.zoomLevel;
    const canvasWidth = this.canvas.width ?? 800;
    const canvasHeight = this.canvas.height ?? 600;

    const startVpt = [...this.canvas.viewportTransform!];
    const targetVpt = [
      targetZoom, 0, 0, targetZoom,
      canvasWidth / 2 - centerX * targetZoom,
      canvasHeight / 2 - centerY * targetZoom
    ];

    const duration = 400; // ms - slightly longer for bigger movements
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out for smoother animation)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.zoomLevel = startZoom + (targetZoom - startZoom) * eased;
      this.canvas.setZoom(this.zoomLevel);

      const vpt = this.canvas.viewportTransform!;
      vpt[4] = startVpt[4] + (targetVpt[4] - startVpt[4]) * eased;
      vpt[5] = startVpt[5] + (targetVpt[5] - startVpt[5]) * eased;

      this.canvas.requestRenderAll();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private createControlWithIcon(
    iconSrc: string,
    x: number,
    y: number,
    offsetX: number,
    offsetY: number,
    handler: (target: NodeFabricObject, event: MouseEvent) => void,
    size: number = 24
  ): fabric.Control {
    const img = new Image();
    img.src = iconSrc;

    return new fabric.Control({
      x,
      y,
      offsetX,
      offsetY,
      cursorStyle: 'pointer',
      mouseUpHandler: (eventData: MouseEvent, transform: FabricTransform) => {
        const target = transform.target as NodeFabricObject;
        if (target) {
          handler(target, eventData);
        }
        this.canvas.requestRenderAll();
        return true;
      },
      render: (
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: any,
        fabricObject: fabric.Object
      ) => {
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
    });
  }

  // ============================================
  // Pan & Zoom
  // ============================================

  togglePanMode(enable: boolean): void {
    this.isPanMode = enable;

    if (enable) {
      this.enablePanMode();
    } else {
      this.disablePanMode();
    }

    this.canvas.setViewportTransform(this.canvas.viewportTransform!);
  }

  private enablePanMode(): void {
    this.canvas.defaultCursor = "grab";
    this.canvas.hoverCursor = "grab";
    this.nodes.forEach(node => {
      node.group.set({ selectable: false, evented: false });
    });
  }

  private disablePanMode(): void {
    this.canvas.defaultCursor = "default";
    this.canvas.hoverCursor = "move";
    this.nodes.forEach(node => {
      node.group.set({ selectable: true, evented: true });
    });
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + ZOOM_STEP, MAX_ZOOM); // Optional: add max limit
    this.applyZoom();
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - ZOOM_STEP, MIN_ZOOM); // Optional: add min limit
    this.applyZoom();
  }

  private applyZoom(): void {
    const center = this.canvas.getCenter();
    const point = this.getZoomPoint();

    // Calculate the point in viewport coordinates
    const viewportPoint = fabric.util.transformPoint(
      point,
      this.canvas.viewportTransform!
    );

    // Set zoom level
    this.canvas.setZoom(this.zoomLevel);

    // Calculate new viewport transform to keep the zoom point stationary
    const newViewportPoint = fabric.util.transformPoint(
      point,
      this.canvas.viewportTransform!
    );

    // Adjust viewport to compensate for the shift
    const vpt = this.canvas.viewportTransform!;
    vpt[4] += viewportPoint.x - newViewportPoint.x;
    vpt[5] += viewportPoint.y - newViewportPoint.y;

    this.canvas.requestRenderAll();
  }

  private getZoomPoint(): fabric.Point {
    const activeObject = this.canvas.getActiveObject();

    if (activeObject) {
      return activeObject.getCenterPoint();
    }

    const rootNode = this.nodes.find(n => n.parentId === null);
    if (rootNode) {
      return rootNode.group.getCenterPoint();
    }

    // Use canvas center in world coordinates
    const center = this.canvas.getCenter();
    return new fabric.Point(center.left, center.top);
  }

  zoomToObject(nodeId: number, zoomLevel: number = 2): void {
    const node = this.findNode(nodeId);
    if (!node) return;

    const center = node.group.getCenterPoint();
    const vpw = this.canvas.getWidth();
    const vph = this.canvas.getHeight();

    const x = vpw / 2 - center.x * zoomLevel;
    const y = vph / 2 - center.y * zoomLevel;

    this.canvas.setZoom(zoomLevel);
    this.canvas.viewportTransform = [zoomLevel, 0, 0, zoomLevel, x, y];
    this.canvas.requestRenderAll();
  }

  // ============================================
  // Import/Export
  // ============================================

  exportJSON(): void {
    const data = this.serializeCanvas();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    this.downloadFile(blob, `mindmap_${Date.now()}.json`);
  }

  private serializeCanvas(): any {
    return {
      nodes: this.nodes.map(node => ({
        id: node.id,
        x: node.x,
        y: node.y,
        title: node.title,
        notes: node.notes,
        media: node.media,
        aiSummary: node.aiSummary,
        size: node.size,
        parentId: node.parentId,
        children: node.children,
        backgroundColor: node.group.item(0)?.fill,
        textColor: node.group.item(1)?.fill || "#fff",
        isCollapsed: node.isCollapsed,
      })),
      connections: this.connections.map(c => ({
        from: c.from,
        to: c.to
      })),
      nodeIdCounter: this.nodeIdCounter
    };
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getCalculatedJSON(): any {
    return _getCalculatedJSON(this.nodes, this.connections, this.nodeIdCounter);
  }

  recreateCanvasFromJson(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      this.clearCanvas();
      this.rebuildFromData(data);
    } catch (error) {
      console.error("Failed to recreate canvas from JSON:", error);
      throw error;
    }
  }

  private clearCanvas(): void {
    this.canvas.clear();
    this.canvas.backgroundColor = DEFAULT_CANVAS_BG_COLOR;
    this.nodes = [];
    this.connections = [];
    this.nodeIdCounter = 0;
  }

  private rebuildFromData(data: any): void {
    // Create nodes
    if (data.nodes) {
      data.nodes.forEach((n: any) => {
        this.createNode(
          n.x,
          n.y,
          n.title || "Node",
          n.backgroundColor || DEFAULT_NODE_COLOR,
          n.textColor || DEFAULT_TEXT_COLOR,
          n.parentId,
          n.size || "medium",
          n.id
        );
      });
    }

    // Create connections
    if (data.connections) {
      data.connections.forEach((c: any) => {
        this.createConnection(c.from, c.to);
      });
    }

    // Restore counter
    if (data.nodeIdCounter) {
      this.nodeIdCounter = data.nodeIdCounter;
    }

    // Restore additional node data
    if (data.nodes) {
      data.nodes.forEach((n: any) => {
        const node = this.findNode(n.id);
        if (node) {
          node.notes = n.notes || "";
          node.media = n.media || [];
          node.aiSummary = n.aiSummary || "";
          node.isCollapsed = n.isCollapsed || false;
        }
      });
    }
  }

  importFromFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const jsonString = event.target?.result as string;
        this.recreateCanvasFromJson(jsonString);
      } catch (error) {
        console.error("Invalid JSON file:", error);
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  // ============================================
  // Utility Methods
  // ============================================

  private findNode(nodeId: number): MindNode | undefined {
    return this.nodes.find(n => n.id === nodeId);
  }

  openNodeModalForNodeId(nodeId: number): void {
    const node = this.findNode(nodeId);
    if (node) {
      this.onOpenNode(node);
    }
  }

  // ============================================
  // Cleanup
  // ============================================

  dispose(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // Remove canvas event listeners
    this.canvas.off('selection:created', this.handleSelection);
    this.canvas.off('selection:updated', this.handleSelection);
    this.canvas.off('mouse:down', this.handleMouseDown);
    this.canvas.off('mouse:move', this.handleMouseMove);
    this.canvas.off('mouse:up', this.handleMouseUp);
    this.canvas.off('mouse:wheel', this.handleMouseWheel);
    this.canvas.off('object:moving', this.handleObjectMoving);

    // Dispose canvas
    this.canvas.dispose();

    // Clear references
    this.nodes = [];
    this.connections = [];
    (this.canvas as any) = null;
  }
}