import { IonBreadcrumb, IonBreadcrumbs } from "@ionic/react";
import { MindNode } from "../../services/CanvasManager";

// 🧭 Helper: find breadcrumb path for a given nodeId
function getBreadcrumbPath(nodes: MindNode[], nodeId: number): string[] {
    const map = new Map<number, MindNode>(nodes.map((n) => [n.id, n]));
    const path: string[] = [];
    let current: MindNode | undefined = map.get(nodeId);

    while (current) {
        path.unshift(current.title.trim());
        current = current.parentId !== null ? map.get(current.parentId) : undefined;
    }

    return path;
}

interface INodeBreadCrumb {
    nodes: MindNode[], nodeId: number
}
export const NodeBreadcrumbs: React.FC<INodeBreadCrumb> = ({ nodes, nodeId }) => {
  const parts = getBreadcrumbPath(nodes, nodeId);

  return (
    <IonBreadcrumbs >
      {parts.map((part, i) => (
        <IonBreadcrumb
          key={i}
        >
          {part}
        </IonBreadcrumb>
      ))}
    </IonBreadcrumbs>
  );
};
