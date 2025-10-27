import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonGrid, IonHeader, IonRow, IonSpinner, IonTitle, IonToolbar, useIonLoading } from "@ionic/react";
import { FunctionComponent, useEffect, useState } from "react";
import { NodeBreadcrumbs } from "../NodeBreadcrumbs/NodeBreadcrumbs";
import { MindNode } from "../../services/CanvasManager";
import { auth } from '../../firebase';
import { callSummarieAPI } from "../../services/api";
import { useParams } from "react-router";
import { useUserStore } from "../../store/userStore";
import { IProject, useProjectStore } from "../../store/projectStore";


interface SummarizeNodeContainerProps {
    canvasNodes: MindNode[];
    summarizeNodeId: number;
}

function getParentPathDetails(nodes: MindNode[], nodeId: number): string {
    const map = new Map<number, MindNode>(nodes.map((n) => [n.id, n]));
    const path: Array<{ title: string, notes: string }> = [];
    let current: MindNode | undefined = map.get(nodeId);

    while (current) {
        path.unshift({
            title: current.title.trim(),
            notes: current.notes || ''
        });
        current = current.parentId !== null ? map.get(current.parentId) : undefined;
    }

    // Join the path with appropriate labels
    return path.map((item, index) => {
        if (index === 0) {
            return `Title: ${item.title}, Description: ${item.notes}`;
        } else {
            return `Sub Title: ${item.title}, Sub Title Description: ${item.notes}`;
        }
    }).join(', ');
}


const SummarizeNodeContainer: FunctionComponent<SummarizeNodeContainerProps> = ({ canvasNodes, summarizeNodeId }) => {
    const [nodeDetails, setNodeDetails] = useState<MindNode>();
    const [summary, setSummary] = useState<string>();

    const { projectId } = useParams<any>();
    const { user } = useUserStore();
    const [currentProject, setCurrentProject] = useState<IProject | null>(null);

    const {
        projects,
        subscribeToProjects,
        unsubscribeFromProjects,
        updateProject,
    } = useProjectStore();

    useEffect(() => {
        if (user) {
            subscribeToProjects(user.uid);
        }

        return () => {
            unsubscribeFromProjects();
        };
    }, [user, subscribeToProjects, unsubscribeFromProjects]);

    const [loading, setLoading] = useState(false);


    useEffect(() => {
        const currentProject = projects.find(p => p.id === projectId)
        setCurrentProject(currentProject || null)
        console.log({ currentProject });
        if (currentProject && currentProject.aiSummary) {
            const summary = currentProject.aiSummary;
            setSummary(summary.find(x => x.nodeId === summarizeNodeId)?.summary || "");

        }

    }, [projects, summarizeNodeId])



    useEffect(() => {
        const node = canvasNodes.find(x => x.id === summarizeNodeId)
        if (node) {
            setNodeDetails(node);
            if (node.aiSummary) {
                setSummary(node.aiSummary);
            }
        }

    }, [canvasNodes, summarizeNodeId])

    const elobrateNode = async () => {
        const parentDetails = getParentPathDetails(canvasNodes, summarizeNodeId);
        const textToElaborate = `${parentDetails} : Noe elobrate for title: ${nodeDetails?.title}, Description: ${nodeDetails?.notes}`;
        setLoading(true);
        const elaboration = await callSummarieAPI(textToElaborate);
        setSummary(elaboration.elaboration);
        if (currentProject) {
            let aiSummary: any = [];
            if (currentProject.aiSummary) {
                aiSummary = currentProject.aiSummary;
            }
            aiSummary.push({ nodeId: summarizeNodeId, summary: elaboration.elaboration })
            updateProject(currentProject.id, {
                "aiSummary": aiSummary
            })
        }
        setLoading(false);
        console.log(elaboration);
    }



    return (<>

        <IonHeader>
            <IonToolbar >
                <IonTitle>Summarize</IonTitle>
            </IonToolbar>
            <IonToolbar >
                <NodeBreadcrumbs nodes={canvasNodes} nodeId={summarizeNodeId} />
            </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">

            <IonCard mode="ios">
                <IonCardHeader>
                    <IonCardTitle>Note</IonCardTitle>
                </IonCardHeader>

                <IonCardContent>{nodeDetails?.notes || "Not Available"}</IonCardContent>
            </IonCard>
            <IonCard mode="ios">
                <IonCardHeader>
                    <IonCardTitle>AI Summary</IonCardTitle>
                </IonCardHeader>

                <IonCardContent>
                    {
                        summary ?
                            <div dangerouslySetInnerHTML={{ __html: (summary || "") }} />
                            :
                            <>
                                {
                                    loading ? <IonButton color={'warning'}>Creating Summary &nbsp;  <IonSpinner name="dots"></IonSpinner></IonButton> : (
                                        <>
                                            <p>No Summary Available</p>
                                            <IonButton onClick={() => elobrateNode()} color={'warning'}>Create Summary for this node</IonButton>
                                        </>
                                    )
                                }


                            </>
                    }
                    <div dangerouslySetInnerHTML={{ __html: (summary || "") }} />
                    {/* <pre>{summary}</pre> */}
                </IonCardContent>
            </IonCard>




        </IonContent>
    </>);
}

export default SummarizeNodeContainer;