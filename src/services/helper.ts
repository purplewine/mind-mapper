import { fabric } from "fabric";
import { Connection, DEFAULT_CONNECTOR_COLOR, DEFAULT_NODE_COLOR, DEFAULT_TEXT_COLOR, MindNode, NodeSize, NodeSizes } from "./contants";




 export function createBezierPath(from: { x: number; y: number }, to: { x: number; y: number }, color: string): fabric.Path {
    const dx = to.x - from.x;
    const cp1x = from.x + dx * 0.5;
    const cp1y = from.y;
    const cp2x = to.x - dx * 0.5;
    const cp2y = to.y;
    const pathString = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
    const path = new fabric.Path(pathString, { stroke: color || DEFAULT_CONNECTOR_COLOR, strokeWidth: 3, fill: "", selectable: false, evented: false });
    return path;
  }

  export function  _getProcessedChildNodeProperties(parent: MindNode, nodeSizes: NodeSizes, canvas: fabric.Canvas ): { childX: number, childY: number, nodeColor: string, textColor: string, sizeType: NodeSize } {
    const parentCenter = parent.group.getCenterPoint();
    const nodeColor = DEFAULT_NODE_COLOR;
    const textColor = DEFAULT_TEXT_COLOR;
    const sizeType = "medium";

    const childCount = parent.children.length;
    const totalChildren = childCount + 1;
    const angleStep = Math.PI / Math.max(totalChildren, 2);
    const startAngle = -Math.PI / 4;
    const angle = startAngle + angleStep * childCount;
    const distance = 250;

    let childX = parentCenter.x + distance * Math.cos(angle);
    let childY = parentCenter.y + distance * Math.sin(angle);

    const size = nodeSizes[sizeType];
    if (!canvas.width || !canvas.height) return { childX, childY, nodeColor, textColor, sizeType };
    childX = Math.max(size.width / 2 + 50, Math.min(canvas.width - size.width / 2 - 50, childX));
    childY = Math.max(size.height / 2 + 50, Math.min(canvas.height - size.height / 2 - 50, childY));

    return {
      childX, childY, nodeColor, textColor, sizeType
    }
  }
 
 export function _getCalculatedJSON(nodes: MindNode[], connections: Connection[], nodeIdCounter: number) {
    const data = {
      nodes: nodes.map((node) => ({
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
        backgroundColor: node.group.item(0).fill,
        textColor: node.group.item(1)?.fill || "#fff",
        isCollapsed: node.isCollapsed
      })),
      connections: connections.map((c) => ({ from: c.from, to: c.to })),
      nodeIdCounter: nodeIdCounter
    };
    const jsonString = JSON.stringify(data, null, 2);
    return jsonString;
  }

export function _getProcessedText(nodeSizes: NodeSizes, text: string) {

    const maxWidth = 250;
    const maxLines = 5;
    const avgCharWidth = nodeSizes["medium"].fontSize * 0.6; // Approximate character width
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

 export function _getRandomBrightColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 65 + Math.random() * 25; // 65-90%
    const lightness = 40 + Math.random() * 15;  // 40-55% (darker for contrast)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }