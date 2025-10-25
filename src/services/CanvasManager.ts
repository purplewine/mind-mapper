import { fabric } from "fabric";
import { addChildControl, addMoreOptionControl } from "./Controls";
type FabricTransform = fabric.Transform;
type NodeFabricObject = fabric.Object & { nodeId?: string };

const DEFAULT_NODE_COLOR = "#ffffff";
const DEFAULT_TEXT_COLOR = "#000000";
const DEFAULT_CONNECTOR_COLOR = "#0054e9";
const DEFAULT_CANVAS_BG_COLOR = "#d8dade";

/**
 * Lightweight types used by the manager
 */
export interface MediaFile {
  name: string;
  url: string;
  type: string;
}

export interface MindNode {
  id: number;
  group: any; // fabric.Group (typed as any to be permissive; replace with fabric.Group if you have type defs)
  x: number;
  y: number;
  parentId: number | null;
  children: number[];
  size: "small" | "medium" | "large" | "xlarge";
  width: number;
  height: number;
  title: string;
  notes: string;
  media: MediaFile[];
  isCollapsed: boolean;
}

export interface Connection {
  from: number;
  to: number;
  path: any; // fabric.Path
}

fabric.Object.prototype.cornerColor = "#ffffff";
fabric.Object.prototype.cornerStrokeColor = "#2dd55b";
fabric.Object.prototype.borderColor = "#2dd55b";
fabric.Object.prototype.cornerSize = 8;
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerStyle = 'circle';





export default class CanvasManager {
  canvas: fabric.Canvas;
  nodes: MindNode[] = [];
  connections: Connection[] = [];
  nodeIdCounter = 0;
  onOpenNode: (node: MindNode) => void;
  onAIControlClick?: (event: any, node: MindNode) => void;
  isPanMode = false;
  isDragging = false;
  lastPosX = 0;
  lastPosY = 0;

  nodeSizes = {
    small: { width: 120, height: 50, fontSize: 14 },
    medium: { width: 150, height: 60, fontSize: 16 },
    large: { width: 180, height: 70, fontSize: 18 },
    xlarge: { width: 220, height: 85, fontSize: 20 },
  } as const;

  constructor(canvasEl: HTMLCanvasElement, onOpenNode: (node: MindNode) => void, onAIControlClick?: (event: any, node: MindNode) => void) {
    const wrapper = canvasEl.parentElement || document.body;
    this.canvas = new fabric.Canvas(canvasEl, {
      width: wrapper.clientWidth,
      height: wrapper.clientHeight, backgroundColor: DEFAULT_CANVAS_BG_COLOR,
    });
    this.onOpenNode = onOpenNode;
    this.onAIControlClick = onAIControlClick;

    this.setupEvents();
    window.addEventListener("resize", () => this.resizeCanvas());
    this.resizeCanvas();
    fabric.util.addListener((this.canvas as any).upperCanvasEl, 'dblclick', (e: any) => {
      // Your double-click logic for the canvas
      const target = (this.canvas as any).findTarget(e);
      if (target) {
        console.log('Double-clicked on object of type:', target);
        if (typeof target.nodeId !== "undefined") {
          const nodeId = target.nodeId as number;
          this.openNodeModalForNodeId(nodeId);
        }
      } else {
        console.log('Double-clicked on empty canvas area.');
      }
    });

  }

  resizeCanvas(): void {
    const wrapper = (this.canvas.getElement() as HTMLCanvasElement).parentElement;
    if (!wrapper) return;
    this.canvas.setDimensions({ width: wrapper.clientWidth, height: wrapper.clientHeight });
    this.canvas.renderAll();
  }

  setupEvents(): void {
    this.canvas.on("mouse:down", (e: any) => {
      if (this.isPanMode) {
        this.isDragging = true;
        this.canvas.selection = false;
        this.lastPosX = e.e.clientX;
        this.lastPosY = e.e.clientY;
        return;
      }

      if (e.target && e.target.isEditButton) {
        const nodeId = e.target.nodeId as number;
        const node = this.nodes.find((n) => n.id === nodeId);
        if (node) this.onOpenNode(node);
        return;
      }
    });

    this.canvas.on("mouse:move", (e: any) => {
      if (this.isPanMode && this.isDragging) {
        const vpt = this.canvas.viewportTransform!;
        vpt[4] += e.e.clientX - this.lastPosX;
        vpt[5] += e.e.clientY - this.lastPosY;
        this.canvas.requestRenderAll();
        this.lastPosX = e.e.clientX;
        this.lastPosY = e.e.clientY;
      }
    });

    this.canvas.on("mouse:up", () => {
      if (this.isPanMode) this.isDragging = false;
    });

    this.canvas.on("object:moving", (e: any) => {
      if (e.target && typeof e.target.nodeId !== "undefined") this.updateNodeConnections(e.target.nodeId);
    });

    this.canvas.on("mouse:wheel", (opt: any) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
      if (opt.e.ctrlKey) {
        const delta = opt.e.deltaY;
        let zoom = this.canvas.getZoom();
        zoom *= Math.pow(0.989, delta);
        this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      } else {
        const e = opt.e;
        const vpt = this.canvas.viewportTransform!;
        vpt[4] -= e.deltaX;
        vpt[5] -= e.deltaY;
        this.canvas.setViewportTransform(vpt);
        this.canvas.requestRenderAll();
      }
    });
  }

  addNode(nodeDetails: { text: string, description: string }, nodeId?: number, parentId: any = null): number {
    const sizeType: MindNode["size"] = "medium";
    const bg = DEFAULT_NODE_COLOR;
    const textC = DEFAULT_TEXT_COLOR;
    let x: number, y: number;

    x = Math.random() * ((this.canvas.width ?? 800) - 300) + 150;
    y = Math.random() * ((this.canvas.height ?? 600) - 150) + 75;

    const updatedNodeId = this.createNode(x, y, nodeDetails.text, bg, textC, parentId, sizeType, nodeId);
    const node = this.nodes.find((n) => n.id === updatedNodeId);
    if (node) {
      node.notes = nodeDetails.description;
    }
    return updatedNodeId;

  }

  createNode(
    x: number,
    y: number,
    text: string,
    bgColor: string,
    textColor: string,
    parentId: number | null = null,
    sizeType: MindNode["size"] = "medium",
    forcedId?: number
  ): number {
    const nodeId = forcedId ?? this.nodeIdCounter++;
    const size = this.nodeSizes[sizeType];


    // Create text object with wrapping enabled
    const textObj = new fabric.Text(this._getProcessedText(text), {
      fontSize: size.fontSize,
      fill: textColor,
      fontFamily: "Lato, opensans, sans-serif",
      fontWeight: parentId === null ? "400" : "300",
      originX: "center",
      originY: "center",
      splitByGrapheme: true, // Better word wrapping
    } as any);






    const innerWidth = 25 + ((textObj.width || 1) * (textObj.scaleX || 1));
    const innerHeight = 25 + ((textObj.height || 1) * (textObj.scaleY || 1));

    const rect = new fabric.Rect({
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


    const group = new fabric.Group([rect, textObj], {
      left: x,
      top: y,
      selectable: true,

      hasBorders: true,
      lockRotation: true,
      originX: "center",
      originY: "center",
    } as any);

    // attach convenience property
    (group as any).nodeId = nodeId;



    const node: MindNode = {
      id: nodeId,
      group: group as any,
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
      isCollapsed: false,
    };

    group.controls = {
      mr: this.createAddChildControl(),
      // tr: this.addMoreOptionControl(),
      ml: this.addAIControl(),

    };

    this.nodes.push(node);

    if (parentId !== null) {
      const parent = this.nodes.find((n) => n.id === parentId);
      if (parent) {
        parent.children.push(nodeId);
        this.createConnection(parentId, nodeId);
      }
    }

    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
    return nodeId;
  }



  addChildNode(parentId: number): void {
    const parent = this.nodes.find(n => n.id === parentId);
    if (!parent) return;

    const parentCenter = parent.group.getCenterPoint();
    const nodeColor = DEFAULT_NODE_COLOR;
    const textColor = DEFAULT_TEXT_COLOR;
    const sizeType: MindNode["size"] = "medium";

    const childCount = parent.children.length;
    const totalChildren = childCount + 1;
    const angleStep = Math.PI / Math.max(totalChildren, 2);
    const startAngle = -Math.PI / 4;
    const angle = startAngle + angleStep * childCount;
    const distance = 250;

    let childX = parentCenter.x + distance * Math.cos(angle);
    let childY = parentCenter.y + distance * Math.sin(angle);

    const size = this.nodeSizes[sizeType];
    if (!this.canvas.width || !this.canvas.height) return;
    childX = Math.max(size.width / 2 + 50, Math.min(this.canvas.width - size.width / 2 - 50, childX));
    childY = Math.max(size.height / 2 + 50, Math.min(this.canvas.height - size.height / 2 - 50, childY));

    const newNodeId = this.createNode(childX, childY, 'Child Node Child Node Child Node Child Node Child Node Child Node Child Node', nodeColor, textColor, parentId, sizeType);

    // checkAndResolveOverlaps(newNodeId);
    this.autoArrange()
  }

  createConnection(fromId: number, toId: number): void {
    const fromNode = this.nodes.find((n) => n.id === fromId);
    const toNode = this.nodes.find((n) => n.id === toId);
    if (!fromNode || !toNode) return;
    const fromCenter = fromNode.group.getCenterPoint();
    const toCenter = toNode.group.getCenterPoint();
    const path = this.createBezierPath(fromCenter, toCenter);
    this.connections.push({ from: fromId, to: toId, path });
    this.canvas.add(path);
    this.canvas.sendToBack(path);
  }

  createBezierPath(from: { x: number; y: number }, to: { x: number; y: number }): any {
    const dx = to.x - from.x;
    const cp1x = from.x + dx * 0.5;
    const cp1y = from.y;
    const cp2x = to.x - dx * 0.5;
    const cp2y = to.y;
    const pathString = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
    const path = new fabric.Path(pathString, { stroke: DEFAULT_CONNECTOR_COLOR, strokeWidth: 3, fill: "", selectable: false, evented: false } as any);
    return path;
  }

  updateNodeConnections(nodeId: number): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const center = node.group.getCenterPoint();
    node.x = center.x;
    node.y = center.y;
    this.connections.forEach((conn) => {
      if (conn.from === nodeId || conn.to === nodeId) {
        const fromNode = this.nodes.find((n) => n.id === conn.from);
        const toNode = this.nodes.find((n) => n.id === conn.to);
        if (fromNode && toNode) {
          this.canvas.remove(conn.path);
          conn.path = this.createBezierPath(fromNode.group.getCenterPoint(), toNode.group.getCenterPoint());
          this.canvas.add(conn.path);
          this.canvas.sendToBack(conn.path);
        }
      }
    });
    this.canvas.renderAll();
  }

  deleteSelectedNode(): void {
    const activeObject = this.canvas.getActiveObject() as NodeFabricObject | null;
    if (!activeObject) return;

    if (activeObject && typeof activeObject.nodeId !== "undefined") {
      if (activeObject.nodeId === null) return;
      if (activeObject.nodeId as any == 0) {
        alert("Cannot delete the central node.");
      } else {
        this.deleteNode(activeObject.nodeId);
      }
    }
    this.autoArrange();
  }

  deleteNode(nodeId: any): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.children.length > 0) node.children.forEach((c) => this.deleteNode(c));
    this.connections = this.connections.filter((conn) => {
      if (conn.from === nodeId || conn.to === nodeId) {
        this.canvas.remove(conn.path);
        return false;
      }
      return true;
    });
    if (node.parentId !== null) {
      const parent = this.nodes.find((n) => n.id === node.parentId);
      if (parent) parent.children = parent.children.filter((id) => id !== nodeId);
    }
    this.canvas.remove(node.group);
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);
    this.canvas.renderAll();
  }

  togglePanMode(enable: boolean): void {
    this.isPanMode = enable;
    if (enable) {
      this.canvas.defaultCursor = "grab";
      this.canvas.hoverCursor = "grab";
      this.nodes.forEach((node) => node.group.set({ selectable: false, evented: false }));
    } else {
      this.canvas.defaultCursor = "default";
      this.canvas.hoverCursor = "move";
      this.nodes.forEach((node) => {
        node.group.set({ selectable: true, evented: true })
      });

    }

    this.canvas.setViewportTransform(this.canvas.viewportTransform as any);
  }


  autoArrange(): void {
    const rootNodes = this.nodes.filter(n => n.parentId === null);
    if (rootNodes.length === 0) return;

    // Calculate node depths and assign levels
    const nodeDepths = new Map<number, number>();
    const nodesByLevel = new Map<number, number[]>();
    let maxNodesInLevel = 0;

    const calculateDepth = (nodeId: number, depth = 0): void => {
      nodeDepths.set(nodeId, depth);

      if (!nodesByLevel.has(depth)) {
        nodesByLevel.set(depth, []);
      }
      nodesByLevel.get(depth)!.push(nodeId);

      // Track maximum nodes in any level
      maxNodesInLevel = Math.max(maxNodesInLevel, nodesByLevel.get(depth)!.length);

      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;
      node.children.forEach(childId => calculateDepth(childId, depth + 1));
    };

    rootNodes.forEach(root => calculateDepth(root.id));

    if (nodeDepths.size === 0) return;

    // Calculate layout parameters
    const depthValues = Array.from(nodeDepths.values());
    const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0;

    const horizontalSpacing = 300; // spacing between levels
    const verticalGap = 40;        // minimum gap between nodes
    const startX = 150;            // starting X position
    const canvasHeight = this.canvas.height ?? 600;

    // Group nodes by parent to handle sibling groups
    const nodesByParent = new Map<number | null, number[]>();
    this.nodes.forEach(node => {
      const parentId = node.parentId;
      if (!nodesByParent.has(parentId)) {
        nodesByParent.set(parentId, []);
      }
      nodesByParent.get(parentId)!.push(node.id);
    });

    // Calculate heights for nodes
    const getNodeHeight = (nodeId: number): number => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return 100;
      return node.group.getScaledHeight() || 100;
    };

    // Calculate total height needed for a group of siblings
    const calculateSiblingsHeight = (nodeIds: number[]): number => {
      let totalHeight = 0;
      nodeIds.forEach((nodeId, index) => {
        totalHeight += getNodeHeight(nodeId);
        if (index < nodeIds.length - 1) {
          totalHeight += verticalGap;
        }
      });
      return totalHeight;
    };

    // Track the next available Y position for each level to prevent overlaps
    const nextAvailableY = new Map<number, number>();
    // Store node positions temporarily
    const nodePositions = new Map<number, { x: number; y: number }>();

    // console.log({ maxNodesInLevel, maxDepth });

    // PASS 1: Calculate positions bottom-up (post-order traversal)
    const calculatePositions = (nodeId: number, x: number, preferredY: number, level: number): { y: number; minY: number; maxY: number } => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return { y: preferredY, minY: preferredY, maxY: preferredY };

      const nodeHeight = getNodeHeight(nodeId);
      const childIds = nodesByParent.get(nodeId) || [];

      if (childIds.length === 0) {
        // Leaf node - position with overlap prevention
        const minYAllowed = nextAvailableY.get(level) || -Infinity;

        // Calculate where the top of the node would be if centered at preferredY
        const preferredTop = preferredY - (nodeHeight / 2);

        // If preferred position overlaps with previous nodes, shift down
        const actualTop = Math.max(preferredTop, minYAllowed);
        const actualY = actualTop + (nodeHeight / 2);

        nodePositions.set(nodeId, { x, y: actualY });

        // Reserve space: bottom of this node + gap
        const nodeBottom = actualTop + nodeHeight;
        nextAvailableY.set(level, nodeBottom + verticalGap);

        return { y: actualY, minY: actualTop, maxY: nodeBottom };
      } else {
        // Parent node - first position children, then center parent
        const childX = x + horizontalSpacing;
        const childLevel = level + 1;
        const totalChildrenHeight = calculateSiblingsHeight(childIds);

        let childStartY = preferredY - (totalChildrenHeight / 2);
        let firstChildY = 0;
        let lastChildY = 0;
        let childrenMinY = Infinity;
        let childrenMaxY = -Infinity;

        childIds.forEach((childId, index) => {
          const childHeight = getNodeHeight(childId);
          const childCenterY = childStartY + (childHeight / 2);

          const result = calculatePositions(childId, childX, childCenterY, childLevel);

          if (index === 0) firstChildY = result.y;
          if (index === childIds.length - 1) lastChildY = result.y;

          childrenMinY = Math.min(childrenMinY, result.minY);
          childrenMaxY = Math.max(childrenMaxY, result.maxY);

          // Update start position for next child based on actual position
          childStartY = result.maxY + verticalGap;
        });

        // Center parent between first and last child
        const centeredY = (firstChildY + lastChildY) / 2;

        // Check for overlap at parent's level
        const minYAllowed = nextAvailableY.get(level) || -Infinity;

        // Calculate where the top of the parent node would be
        const preferredTop = centeredY - (nodeHeight / 2);
        const actualTop = Math.max(preferredTop, minYAllowed);
        const actualY = actualTop + (nodeHeight / 2);

        nodePositions.set(nodeId, { x, y: actualY });

        // Reserve space: bottom of this node + gap
        const nodeBottom = actualTop + nodeHeight;
        nextAvailableY.set(level, nodeBottom + verticalGap);

        // Return the combined bounds of parent and children
        return {
          y: actualY,
          minY: Math.min(actualTop, childrenMinY),
          maxY: Math.max(nodeBottom, childrenMaxY)
        };
      }
    };

    // Start positioning from root nodes
    if (rootNodes.length === 1) {
      calculatePositions(rootNodes[0].id, startX, canvasHeight / 2, 0);
    } else {
      const totalRootsHeight = calculateSiblingsHeight(rootNodes.map(n => n.id));
      let currentY = (canvasHeight / 2) - (totalRootsHeight / 2);

      rootNodes.forEach((rootNode) => {
        const rootHeight = getNodeHeight(rootNode.id);
        const rootCenterY = currentY + (rootHeight / 2);

        const result = calculatePositions(rootNode.id, startX, rootCenterY, 0);
        currentY = result.maxY + verticalGap;
      });
    }

    // PASS 2: Apply positions to actual nodes
    nodePositions.forEach((pos, nodeId) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;

      node.x = pos.x;
      node.y = pos.y;

      try {
        node.group.set({ left: pos.x, top: pos.y });
        node.group.setCoords();
      } catch (err) {
        console.warn(`Failed to position group for node ${node.id}`, err);
      }

      this.updateNodeConnections(nodeId);
    });

    // Update connections with smoother curves
    this.connections.forEach(conn => {
      const fromNode = this.nodes.find(n => n.id === conn.from);
      const toNode = this.nodes.find(n => n.id === conn.to);

      if (fromNode && toNode) {
        // If an old path exists, remove it
        if (conn.path) {
          try {
            this.canvas.remove(conn.path);
          } catch {
            // ignore removal error
          }
        }

        const fromCenter = fromNode.group.getCenterPoint();
        const toCenter = toNode.group.getCenterPoint();

        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;

        // Adjust control points based on distance but cap them
        const controlPointOffset = Math.min(Math.abs(dx) * 0.3, 100);

        const pathString = `M ${fromCenter.x} ${fromCenter.y} 
          C ${fromCenter.x + controlPointOffset} ${fromCenter.y},
            ${toCenter.x - controlPointOffset} ${toCenter.y},
            ${toCenter.x} ${toCenter.y}`;

        const newPath = new fabric.Path(pathString, {
          stroke: DEFAULT_CONNECTOR_COLOR,
          strokeWidth: 3,
          fill: '',
          selectable: false,
          evented: false
        });

        conn.path = newPath;
        this.canvas.add(newPath);
        this.canvas.sendToBack(newPath);
      }
    });

    // Optionally center the view on the first root node
    if (rootNodes.length > 0) {
      const rootNode = rootNodes[0];
      const zoom = this.canvas.getZoom();
      const center = this.canvas.getCenter();

      this.canvas.setViewportTransform([
        zoom, 0, 0, zoom,
        100,
        center.top - rootNode.y * zoom - 50
      ]);
    }

    this.canvas.renderAll();
  }
  openNodeModalForNodeId(nodeId: any): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    this.onOpenNode(node);
  }

  saveNodeDetails(updated: Partial<MindNode> & { id: number; title?: string; notes?: string; media?: MediaFile[] }): void {
    console.log('Save Node Details being called', updated);

    const node = this.nodes.find((n) => n.id === updated.id);
    const nodeIndex = this.nodes.findIndex((n) => n.id === updated.id);
    console.log({ node });
    if (node) {
      this.canvas.remove(node.group);
      // remove old node
      this.nodes.splice(nodeIndex, 1);
      // add new node with updated details
      this.addNode({ text: updated.title || node.title, description: updated.notes || node.notes }, node.id, node.parentId);
      // Update other properties as needed
      node.notes = updated.notes || node.notes;
      node.media = updated.media || node.media;
      node.group.setCoords();
      this.updateNodeConnections(node.id);
      this.canvas.renderAll();

    }
    this.autoArrange();


    if (!node) return;

  }

  exportJSON(): void {
    const data = {
      nodes: this.nodes.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        title: node.title,
        notes: node.notes,
        media: node.media,
        size: node.size,
        parentId: node.parentId,
        children: node.children,
        backgroundColor: node.group.item(0).fill,
        textColor: node.group.item(1)?.fill || "#fff",
      })),
      connections: this.connections.map((c) => ({ from: c.from, to: c.to })),
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindmap_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFromFile(e: Event & { target: HTMLInputElement }): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev: ProgressEvent<FileReader>) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        this.canvas.clear();
        this.nodes = [];
        this.connections = [];
        this.nodeIdCounter = 0;
        if (data.nodes)
          data.nodes.forEach((n: any) =>
            this.createNode(n.x, n.y, n.title || "Node", n.backgroundColor || DEFAULT_CANVAS_BG_COLOR, n.textColor || "#fff", n.parentId, n.size || "medium")
          );
        if (data.connections) data.connections.forEach((c: any) => this.createConnection(c.from, c.to));
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert("Invalid JSON");
      }
    };
    r.readAsText(f);
  }




  createAddChildControl(): fabric.Control {
    const icon =
      `data:image/svg+xml,%3Csvg width='596' height='596' viewBox='0 0 596 596' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M278.76 560.52C431.61 560.52 555.52 436.61 555.52 283.76C555.52 130.91 431.61 7 278.76 7C125.91 7 2 130.91 2 283.76C2 436.61 125.91 560.52 278.76 560.52Z' fill='%230054e9'/%3E%3Cpath d='M112.416 259V309H444.474V259H112.416Z' fill='white'/%3E%3Cpath d='M303 118H253V450H303V118Z' fill='white'/%3E%3C/svg%3E%0A`;

    const img = new Image();
    img.src = icon;

    const control = new fabric.Control({
      x: 0.5,
      y: 0,
      offsetX: 20,
      cursorStyle: 'pointer',
      mouseUpHandler: (eventData: MouseEvent, transform: FabricTransform): any => {
        const target = transform.target as NodeFabricObject | undefined;
        if (!target) {
          console.warn('addChildControl: missing transform.target');
          return true;
        }
        const canvas = target.canvas;
        // console.log({ targetId: target });

        if (target.nodeId !== null && typeof target.nodeId !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.addChildNode(target.nodeId as any);
        } else {
          console.warn('addChildControl: target.nodeId missing', target);
        }

        // Optionally you might want to re-render:
        this.canvas?.requestRenderAll();
      },
      render: (ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: any,
        fabricObject: fabric.Object) => {
        // console.log({ ctx });

        const size = 24;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      },
      // cornerSize: 24,
      // withConnection: true,
    });
    return control;
  }

  addMoreOptionControl(): fabric.Control {
    const icon =
      "data:image/svg+xml,%3Csvg width='596' height='596' viewBox='0 0 596 596' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_9130_19159)'%3E%3Cg filter='url(%23filter0_d_9130_19159)'%3E%3Cpath d='M278.76 560.52C431.61 560.52 555.52 436.61 555.52 283.76C555.52 130.91 431.61 7 278.76 7C125.91 7 2 130.91 2 283.76C2 436.61 125.91 560.52 278.76 560.52Z' fill='white'/%3E%3Cpath d='M545.52 283.76C545.52 431.087 426.087 550.52 278.76 550.52C131.432 550.52 12 431.087 12 283.76C12 136.432 131.432 17 278.76 17C426.087 17 545.52 136.432 545.52 283.76Z' stroke='%23DADADA' stroke-width='20'/%3E%3C/g%3E%3Ccircle cx='158.05' cy='284' r='40.0498' fill='%236C6C64'/%3E%3Ccircle cx='279' cy='284' r='40.0498' fill='%236C6C64'/%3E%3Ccircle cx='399.95' cy='284' r='40.0498' fill='%236C6C64'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='filter0_d_9130_19159' x='-8' y='1' width='573.52' height='573.52' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='BackgroundImageFix'/%3E%3CfeColorMatrix in='SourceAlpha' type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='hardAlpha'/%3E%3CfeOffset dy='4'/%3E%3CfeGaussianBlur stdDeviation='5'/%3E%3CfeComposite in2='hardAlpha' operator='out'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/%3E%3CfeBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_9130_19159'/%3E%3CfeBlend mode='normal' in='SourceGraphic' in2='effect1_dropShadow_9130_19159' result='shape'/%3E%3C/filter%3E%3CclipPath id='clip0_9130_19159'%3E%3Crect width='595.275' height='595.275' fill='%236c519f'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A";

    const img = new Image();
    img.src = icon;

    const control = new fabric.Control({
      x: 0.5,
      y: -0.5,
      cursorStyle: 'pointer',
      mouseUpHandler: (eventData: MouseEvent, transform: FabricTransform): any => {
        const target = transform.target as NodeFabricObject | undefined;
        if (target && target.nodeId !== null && typeof target.nodeId !== 'undefined') {
          this.openNodeModalForNodeId(target.nodeId);
        }
      },
      render: (
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: any,
        fabricObject: fabric.Object
      ) => {
        const size = 24;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
    });

    return control;
  }

  addAIControl(): fabric.Control {
    const icon =
      "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23FFC409'/%3E%3Cpath d='M10.0881 19.5C10.0044 19.5001 9.92159 19.4818 9.84563 19.4465C9.76967 19.4112 9.70238 19.3596 9.64847 19.2955C9.59456 19.2314 9.55535 19.1562 9.53359 19.0753C9.51182 18.9944 9.50804 18.9097 9.52251 18.8272V18.8238L10.4009 14H7.00001C6.90561 14 6.81314 13.9733 6.7333 13.9229C6.65346 13.8726 6.5895 13.8006 6.54884 13.7154C6.50817 13.6302 6.49245 13.5353 6.5035 13.4415C6.51454 13.3478 6.5519 13.2591 6.61126 13.1857L13.4603 4.71879C13.5383 4.61983 13.6465 4.54913 13.7685 4.5175C13.8904 4.48586 14.0193 4.49504 14.1356 4.54362C14.2518 4.59221 14.3489 4.67753 14.4121 4.78653C14.4753 4.89554 14.501 5.02223 14.4853 5.14723C14.4853 5.15661 14.4828 5.16567 14.4813 5.17504L13.5997 10H17C17.0944 10.0001 17.1869 10.0268 17.2667 10.0772C17.3466 10.1275 17.4105 10.1995 17.4512 10.2846C17.4918 10.3698 17.5076 10.4648 17.4965 10.5586C17.4855 10.6523 17.4481 10.741 17.3888 10.8144L10.5388 19.2813C10.4849 19.3493 10.4165 19.4043 10.3384 19.4422C10.2604 19.48 10.1749 19.4998 10.0881 19.5Z' fill='black'/%3E%3C/svg%3E%0A"
    const img = new Image();
    img.src = icon;

    const control = new fabric.Control({
      x: 0.5,
      y: -0.5,

      sizeX: 30,
      sizeY: 30,
      cursorStyle: 'pointer',
      mouseUpHandler: (eventData: MouseEvent, transform: FabricTransform): any => {
        const target = transform.target as NodeFabricObject | undefined;
        if (target && target.nodeId !== null && typeof target.nodeId !== 'undefined') {
          if (!this.onAIControlClick) {
            console.warn('AI Control clicked, but no handler defined');
            return;
          }
          this.onAIControlClick(eventData, this.nodes.find((n: any) => n.id === target.nodeId)!);
        }
      },
      render: (
        ctx: CanvasRenderingContext2D,
        left: number,
        top: number,
        _styleOverride: any,
        fabricObject: fabric.Object
      ) => {
        const size = 30;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
    });

    return control;

  }


  _getProcessedText(text: string) {

    const maxWidth = 250;
    const maxLines = 5;
    const avgCharWidth = this.nodeSizes["medium"].fontSize * 0.6; // Approximate character width
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    let processedText = '';
    let lineCount = 0;
    let remainingText = text;

    while (remainingText.length > 0 && lineCount < maxLines) {
      if (remainingText.length <= maxCharsPerLine) {
        processedText += remainingText;
        break;
      }

      // Find last space within maxCharsPerLine to avoid breaking words
      let breakPoint = remainingText.lastIndexOf(' ', maxCharsPerLine);
      if (breakPoint === -1 || breakPoint === 0) {
        breakPoint = maxCharsPerLine;
      }

      processedText += remainingText.substring(0, breakPoint);
      remainingText = remainingText.substring(breakPoint).trim();

      lineCount++;

      if (remainingText.length > 0 && lineCount < maxLines) {
        processedText += '\n';
      }
    }


    if (remainingText.length > 0 && remainingText.length > maxCharsPerLine) {
      processedText += '...';
    }
    return processedText;
  }

  dispose(): void {
    this.canvas.dispose();
    // optional: remove listeners we added on window (if needed)
    // window.removeEventListener('resize', this.resizeCanvas) // careful: bound reference required
    // null out canvas reference
    // @ts-ignore
    this.canvas = null as any;
  }
}
