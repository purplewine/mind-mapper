
import { fabric } from 'fabric';

export interface TreeNode {
  id: number;
  parentId: number | null;
  children: number[];
  x: number;
  y: number;
  group: fabric.Group;
  color?: string;
  isCollapsed?: boolean;
}

export interface Connection {
  from: number;
  to: number;
  path?: fabric.Path;
}

export interface LayoutConfig {
  horizontalSpacing: number;
  verticalGap: number;
  startX: number;
  defaultNodeHeight: number;
  defaultConnectorColor: string;
}

export interface NodeBounds {
  y: number;
  minY: number;
  maxY: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  horizontalSpacing: 300,
  verticalGap: 40,
  startX: 150,
  defaultNodeHeight: 100,
  defaultConnectorColor: '#666666'
};

// ============================================
// Core Layout Calculator
// ============================================

export class TreeLayoutCalculator {
  private nodeDepths = new Map<number, number>();
  private nodesByLevel = new Map<number, number[]>();
  private nodesByParent = new Map<number | null, number[]>();
  private nextAvailableY = new Map<number, number>();
  private nodePositions = new Map<number, { x: number; y: number }>();
  
  constructor(
    private nodes: TreeNode[],
    private config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
  ) {
    this.buildParentChildMap();
  }

  /**
   * Build parent-child relationship map
   */
  private buildParentChildMap(): void {
    this.nodes.forEach(node => {
      const parentId = node.parentId;
      if (!this.nodesByParent.has(parentId)) {
        this.nodesByParent.set(parentId, []);
      }
      this.nodesByParent.get(parentId)!.push(node.id);
    });
  }

  /**
   * Calculate depth for each node in the tree
   */
  private calculateDepth(nodeId: number, depth = 0): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    this.nodeDepths.set(nodeId, depth);

    if (!this.nodesByLevel.has(depth)) {
      this.nodesByLevel.set(depth, []);
    }
    this.nodesByLevel.get(depth)!.push(nodeId);

    // Only traverse children if node is not collapsed
    if (!node.isCollapsed) {
      node.children.forEach(childId => this.calculateDepth(childId, depth + 1));
    }
  }

  /**
   * Get node height with fallback
   */
  private getNodeHeight(nodeId: number): number {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return this.config.defaultNodeHeight;
    return node.group.getScaledHeight() || this.config.defaultNodeHeight;
  }

  /**
   * Calculate total height needed for a group of siblings
   */
  private calculateSiblingsHeight(nodeIds: number[]): number {
    let totalHeight = 0;
    nodeIds.forEach((nodeId, index) => {
      totalHeight += this.getNodeHeight(nodeId);
      if (index < nodeIds.length - 1) {
        totalHeight += this.config.verticalGap;
      }
    });
    return totalHeight;
  }

  /**
   * Calculate positions for nodes (post-order traversal)
   */
  private calculatePositions(
    nodeId: number,
    x: number,
    preferredY: number,
    level: number
  ): NodeBounds {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { y: preferredY, minY: preferredY, maxY: preferredY };

    const nodeHeight = this.getNodeHeight(nodeId);
    // Get children only if node is not collapsed
    const childIds = node.isCollapsed ? [] : (this.nodesByParent.get(nodeId) || []);

    if (childIds.length === 0) {
      // Leaf node - position with overlap prevention
      return this.positionLeafNode(nodeId, x, preferredY, level, nodeHeight);
    } else {
      // Parent node - position children first, then center parent
      return this.positionParentNode(nodeId, x, preferredY, level, nodeHeight, childIds);
    }
  }

  /**
   * Position a leaf node
   */
  private positionLeafNode(
    nodeId: number,
    x: number,
    preferredY: number,
    level: number,
    nodeHeight: number
  ): NodeBounds {
    const minYAllowed = this.nextAvailableY.get(level) || -Infinity;
    const preferredTop = preferredY - nodeHeight / 2;
    const actualTop = Math.max(preferredTop, minYAllowed);
    const actualY = actualTop + nodeHeight / 2;

    this.nodePositions.set(nodeId, { x, y: actualY });

    const nodeBottom = actualTop + nodeHeight;
    this.nextAvailableY.set(level, nodeBottom + this.config.verticalGap);

    return { y: actualY, minY: actualTop, maxY: nodeBottom };
  }

  /**
   * Position a parent node and its children
   */
  private positionParentNode(
    nodeId: number,
    x: number,
    preferredY: number,
    level: number,
    nodeHeight: number,
    childIds: number[]
  ): NodeBounds {
    const childX = x + this.config.horizontalSpacing;
    const childLevel = level + 1;
    const totalChildrenHeight = this.calculateSiblingsHeight(childIds);

    let childStartY = preferredY - totalChildrenHeight / 2;
    let firstChildY = 0;
    let lastChildY = 0;
    let childrenMinY = Infinity;
    let childrenMaxY = -Infinity;

    // Position all children
    childIds.forEach((childId, index) => {
      const childHeight = this.getNodeHeight(childId);
      const childCenterY = childStartY + childHeight / 2;

      const result = this.calculatePositions(childId, childX, childCenterY, childLevel);

      if (index === 0) firstChildY = result.y;
      if (index === childIds.length - 1) lastChildY = result.y;

      childrenMinY = Math.min(childrenMinY, result.minY);
      childrenMaxY = Math.max(childrenMaxY, result.maxY);

      childStartY = result.maxY + this.config.verticalGap;
    });

    // Center parent between first and last child
    const centeredY = (firstChildY + lastChildY) / 2;
    const minYAllowed = this.nextAvailableY.get(level) || -Infinity;
    const preferredTop = centeredY - nodeHeight / 2;
    const actualTop = Math.max(preferredTop, minYAllowed);
    const actualY = actualTop + nodeHeight / 2;

    this.nodePositions.set(nodeId, { x, y: actualY });

    const nodeBottom = actualTop + nodeHeight;
    this.nextAvailableY.set(level, nodeBottom + this.config.verticalGap);

    return {
      y: actualY,
      minY: Math.min(actualTop, childrenMinY),
      maxY: Math.max(nodeBottom, childrenMaxY)
    };
  }

  /**
   * Calculate layout for the entire tree
   */
  calculate(canvasHeight: number): Map<number, { x: number; y: number }> {
    const rootNodes = this.nodes.filter(n => n.parentId === null);
    if (rootNodes.length === 0) return this.nodePositions;

    // Calculate depths for all nodes
    rootNodes.forEach(root => this.calculateDepth(root.id));

    if (this.nodeDepths.size === 0) return this.nodePositions;

    // Position nodes starting from roots
    if (rootNodes.length === 1) {
      this.calculatePositions(
        rootNodes[0].id,
        this.config.startX,
        canvasHeight / 2,
        0
      );
    } else {
      this.positionMultipleRoots(rootNodes, canvasHeight);
    }

    return this.nodePositions;
  }

  /**
   * Position multiple root nodes
   */
  private positionMultipleRoots(rootNodes: TreeNode[], canvasHeight: number): void {
    const totalRootsHeight = this.calculateSiblingsHeight(rootNodes.map(n => n.id));
    let currentY = canvasHeight / 2 - totalRootsHeight / 2;

    rootNodes.forEach(rootNode => {
      const rootHeight = this.getNodeHeight(rootNode.id);
      const rootCenterY = currentY + rootHeight / 2;

      const result = this.calculatePositions(
        rootNode.id,
        this.config.startX,
        rootCenterY,
        0
      );
      currentY = result.maxY + this.config.verticalGap;
    });
  }
}

// ============================================
// Connection Path Generator
// ============================================

export class ConnectionPathGenerator {
  constructor(
    private config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
  ) {}

  /**
   * Create a Bezier curve path between two points
   */
  createBezierPath(
    from: fabric.Point,
    to: fabric.Point,
    color: string
  ): fabric.Path {
    const dx = to.x - from.x;
    const controlPointOffset = Math.min(Math.abs(dx) * 0.3, 100);

    const pathString = `M ${from.x} ${from.y} 
      C ${from.x + controlPointOffset} ${from.y},
        ${to.x - controlPointOffset} ${to.y},
        ${to.x} ${to.y}`;

    return new fabric.Path(pathString, {
      stroke: color || this.config.defaultConnectorColor,
      strokeWidth: 3,
      fill: '',
      selectable: false,
      evented: false
    });
  }

  /**
   * Update all connections based on node positions
   */
  updateConnections(
    canvas: fabric.Canvas,
    nodes: TreeNode[],
    connections: Connection[],
    isNodeVisible: (nodeId: number) => boolean
  ): void {
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);

      if (!fromNode || !toNode) return;

      // Check if both nodes are visible
      const shouldShow = isNodeVisible(conn.from) && isNodeVisible(conn.to);

      // Remove old path
      if (conn.path) {
        try {
          canvas.remove(conn.path);
        } catch {
          // Ignore removal error
        }
      }

      // Create new path only if both nodes are visible
      if (shouldShow) {
        const fromCenter = fromNode.group.getCenterPoint();
        const toCenter = toNode.group.getCenterPoint();

        conn.path = this.createBezierPath(fromCenter, toCenter, fromNode.color || '');
        canvas.add(conn.path);
        canvas.sendToBack(conn.path);
      } else {
        conn.path = undefined;
      }
    });
  }
}

// ============================================
// Main Layout Engine
// ============================================

export class TreeLayoutEngine {
  private layoutCalculator: TreeLayoutCalculator;
  private pathGenerator: ConnectionPathGenerator;

  constructor(
    private canvas: fabric.Canvas,
    private nodes: TreeNode[],
    private connections: Connection[],
    private config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
  ) {
    this.layoutCalculator = new TreeLayoutCalculator(nodes, config);
    this.pathGenerator = new ConnectionPathGenerator(config);
  }

  /**
   * Check if a node is visible (no collapsed ancestors)
   */
  isNodeVisible(nodeId: number): boolean {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return false;
    if (node.parentId === null) return true;

    let currentNode = node;
    while (currentNode.parentId !== null) {
      const parent = this.nodes.find(n => n.id === currentNode.parentId);
      if (!parent) return false;
      if (parent.isCollapsed) return false;
      currentNode = parent;
    }

    return true;
  }

  /**
   * Apply calculated positions to nodes
   */
  private applyPositions(positions: Map<number, { x: number; y: number }>): void {
    positions.forEach((pos, nodeId) => {
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
    });
  }

  /**
   * Center viewport on the first root node
   */
  private centerViewport(): void {
    const rootNodes = this.nodes.filter(n => n.parentId === null);
    if (rootNodes.length === 0) return;

    const rootNode = rootNodes[0];
    const zoom = this.canvas.getZoom();
    const center = this.canvas.getCenter();

    this.canvas.setViewportTransform([
      zoom, 0, 0, zoom,
      100,
      center.top - rootNode.y * zoom - 50
    ]);
  }

  /**
   * Execute the layout algorithm
   */
  arrange(): void {
    const canvasHeight = this.canvas.height ?? 600;

    // Calculate positions
    const positions = this.layoutCalculator.calculate(canvasHeight);

    // Apply positions to nodes
    this.applyPositions(positions);

    // Update connections
    this.pathGenerator.updateConnections(
      this.canvas,
      this.nodes,
      this.connections,
      this.isNodeVisible.bind(this)
    );

    // Center viewport
    this.centerViewport();

    // Render
    this.canvas.renderAll();
  }

  /**
   * Hide nodes with collapsed ancestors
   */
  hideCollapsedChildren(): void {
    this.nodes.forEach(node => {
      const visible = this.isNodeVisible(node.id);
      node.group.set({ visible });
    });

    this.connections.forEach(conn => {
      if (!conn.path) return;
      const shouldShow = this.isNodeVisible(conn.from) && this.isNodeVisible(conn.to);
      conn.path.set({ visible: shouldShow });
    });

    this.canvas.renderAll();
  }
}
