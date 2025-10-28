
// ============================================
// Constants
// ============================================

export const DEFAULT_NODE_COLOR = "#ffffff";
export const DEFAULT_TEXT_COLOR = "#000000";
export const DEFAULT_CANVAS_BG_COLOR = "#d8dade";
export const DEFAULT_CONNECTOR_COLOR = "#0054e9";


export const FABRIC_DEFAULTS = {
  cornerColor: "#ffffff",
  cornerStrokeColor: "#2dd55b",
  borderColor: "#2dd55b",
  cornerSize: 8,
  transparentCorners: false,
  cornerStyle: 'circle'
} as const;

export const ZOOM_STEP = 0.1;
export const ZOOM_WHEEL_SENSITIVITY = 0.989;

// ============================================
// Types
// ============================================

export type FabricTransform = fabric.Transform;
export type NodeFabricObject = fabric.Object & { nodeId?: number };

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

export interface NodeSizeConfig {
  width: number;
  height: number;
  fontSize: number;
}

export type NodeSizes = Record<NodeSize, NodeSizeConfig>;

export interface NodeDetails {
  text: string;
  description: string;
}
