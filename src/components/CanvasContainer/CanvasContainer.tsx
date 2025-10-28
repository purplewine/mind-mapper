// MindMapper.tsx
import React, { useState, useEffect, useRef } from 'react';
import Dock from './../Dock/Dock';
import { IonBreadcrumb, IonBreadcrumbs, IonButton, IonButtons, IonCard, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenu, IonPopover, IonTitle, IonToolbar, useIonAlert, useIonLoading, useIonModal, useIonPopover, useIonToast } from '@ionic/react';
import './Canvas.css';
import { addOutline, archiveOutline, documentTextOutline, downloadOutline, gitMergeOutline, handRightOutline, removeOutline, searchOutline, settingsOutline, shuffleOutline } from 'ionicons/icons';
import CanvasManager from '../../services/CanvasManager';
import NodeModal from './NodeModal';
import { Popover } from './Popover';
import { IProject } from '../../store/projectStore';
import { menuController } from '@ionic/core/components';
import { NodeBreadcrumbs } from '../NodeBreadcrumbs/NodeBreadcrumbs';
import SummarizeNodeContainer from '../SummarizeNodeContainer/SummarizeNodeContainer';
import { createChildrenMindMap } from '../../services/api';
import { MindNode } from '../../services/contants';

interface IMindMapper {
    project: IProject,
    updateProjectWithDebounce: (projecId: string, projectData: any, delay: number) => void
}

const MindMapper: React.FC<IMindMapper> = ({ project, updateProjectWithDebounce }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const managerRef = useRef<CanvasManager | null>(null);
    const [summarizeNodeId, setSummarizeNodeId] = useState(0);
    const [currentProject, setCurrentProject] = useState<IProject>(project)
    const [searchValue, setSearchValue] = useState('');

    const [presentLoading, dismissLoading] = useIonLoading();

    useEffect(() => {
        setCurrentProject(project)
    }, [project])

    const importFileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [canvasNodes, setCanvasNodes] = useState<MindNode[]>([])
    const [panMode, setPanMode] = useState<boolean>(false);
    const [presentNodeModal, dismissNodeModal] = useIonModal(NodeModal, {
        onClose: (data: string, role: string) => { dismissNodeModal(data, role); setSelectedNode(null); },
        nodeData: selectedNode,
        onSave: (updated: any) => {
            console.log({ updated });

            managerRef.current?.saveNodeDetails(updated);
            saveProject();

            dismissNodeModal();
            setSelectedNode(null);
        }
    });

    const [presentToast, dismissToast] = useIonToast();

    const [presentAlert] = useIonAlert();

    const popover = useRef<HTMLIonPopoverElement>(null);
    const popoverBtnRef = useRef<HTMLButtonElement>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const openPopover = (e: any) => {
        popover.current!.event = e;
        setPopoverOpen(true);
    };


    const togglePanMode = () => {
        setPanMode((prev) => {
            const next = !prev;
            if (next)
                presentToast({
                    message: `Pan Mode 'Enabled`, position: 'top', buttons: [{
                        text: 'Dismiss', role: 'info', handler: () => {
                            togglePanMode();
                        },
                    }]
                });
            else
                dismissToast();
            managerRef.current?.togglePanMode(next);
            return next;
        });
    }

    const bottomDockItems = [
        {
            icon: handRightOutline, label: 'Pan Mode', onClick: () => {
                togglePanMode();
            }
        },
        {
            icon: archiveOutline, label: 'Delete Node', onClick: () => {
                presentAlert({
                    mode: 'ios',
                    header: 'Delete Node',
                    message: 'Are you sure you want to delete the selected node?',
                    buttons: [
                        { text: 'Cancel', role: 'cancel' },
                        {
                            text: 'Delete', role: 'destructive', handler: () => {
                                managerRef.current?.deleteSelectedNode();
                            }
                        }
                    ]
                })
            }
        },

        {
            icon: downloadOutline, label: 'Export', onClick: () => {
                managerRef.current?.exportJSON();
            }
        },
        { icon: settingsOutline, label: 'Settings', onClick: () => alert('Settings!') },
    ];


    const onNodeDBClick = (node: any) => {
        setSelectedNode(node);
        presentNodeModal();
    }

    const aiControlClick = async (e: any, node: any) => {
        console.log(e, node);
        console.log(popover.current);

        popoverBtnRef.current?.style.setProperty('position', 'absolute');
        popoverBtnRef.current!.style.setProperty('left', `${e.pageX}px`);
        popoverBtnRef.current!.style.setProperty('top', `${e.pageY}px`);
        popoverBtnRef.current!.click();

        const text = `Title: ${node.title}, Description: ${node.notes}`;

    }




    useEffect(() => {

        setTimeout(() => {

            if (!canvasRef.current) return;
            console.log('Canvas called');
            let jsonString = null;
            if (currentProject && currentProject.jsonString) {
                jsonString = currentProject.jsonString
            }
            managerRef.current = new CanvasManager(canvasRef.current, jsonString,
                onNodeDBClick,
                aiControlClick
            );
            if (!jsonString) managerRef.current?.addNode({ text: currentProject.name, description: (currentProject.description || '') });
            managerRef.current?.autoArrange();

            managerRef.current.canvas.on('object:modified', () => {
                console.log('auto saving...');
                saveProject();

            })
            managerRef.current.canvas.on('object:added', () => {
                console.log('auto saving...');
                saveProject();

            })
            managerRef.current.canvas.on('object:removed', () => {
                console.log('auto saving...');
                saveProject();

            })
            // return () => {
            //     managerRef.current?.dispose();
            //     managerRef.current = null;
            // };
        }, 100);





        return () => {

            managerRef.current?.dispose();
            managerRef.current = null;
        };
    }, []);



    function saveProject() {
        updateProjectWithDebounce(currentProject.id, {
            ...currentProject,
            jsonString: managerRef.current?.getCalculatedJSON()
        }, 1000);
    }

    const openSummarizer = async () => {
        const currentGroup = managerRef.current?.canvas.getActiveObject();
        console.log({ currentGroup });
        const nodeId = (currentGroup as any)?.nodeId;
        setSummarizeNodeId(nodeId);
        setCanvasNodes(managerRef.current?.nodes || [])
        setPopoverOpen(false)
        await menuController.open('end');
    }

    const createChildrenMindMapClick = async () => {
        presentLoading({
            message: 'Creating Children Mind Map...',
            mode: 'ios'
        })
        const currentGroup = managerRef.current?.canvas.getActiveObject();
        console.log({ currentGroup });
        const nodeId = (currentGroup as any)?.nodeId;
        const node = managerRef.current?.nodes.find(x => x.id === nodeId);
        setSummarizeNodeId(nodeId);
        setCanvasNodes(managerRef.current?.nodes || [])
        setPopoverOpen(false)
        const text = `Title: ${node?.title}, Description: ${node?.notes}`;
        const elaboration = await createChildrenMindMap(text);
        managerRef.current?.createChildNodeStructure(nodeId, elaboration.mindmaps);
        dismissLoading();
    }



    return (

        <>
            <button ref={popoverBtnRef} onClick={openPopover}></button>
            <IonMenu side="end" className='side-menu-content' contentId="main-content" >
                <SummarizeNodeContainer canvasNodes={canvasNodes} summarizeNodeId={summarizeNodeId} />
            </IonMenu>
            <IonHeader>
                <IonToolbar mode='ios' color={'light'}>
                    <IonTitle>{currentProject?.name}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent id="main-content">

                <canvas ref={canvasRef} id="canvas" style={{ width: "100svw", height: "100svh" }} />

                <IonPopover size="auto" arrow={false} mode='ios' side="right" alignment="end" ref={popover} isOpen={popoverOpen} onDidDismiss={() => setPopoverOpen(false)}>
                    {/* <Popover /> */}
                    <IonList lines="none">

                        <IonItem button onClick={openSummarizer}>
                            <IonIcon aria-hidden="true" icon={documentTextOutline} slot="start"></IonIcon>
                            <IonLabel>Summarize this node</IonLabel>
                        </IonItem>
                        <IonItem button onClick={createChildrenMindMapClick}>
                            <IonIcon aria-hidden="true" icon={shuffleOutline} slot="start"></IonIcon>
                            <IonLabel>Create Sub Nodes</IonLabel>
                        </IonItem>
                    </IonList>
                </IonPopover>

                <div className="search-container">
                    <IonCard mode='ios'>
                        <IonItem>
                            <IonInput placeholder='Search' value={searchValue} onIonChange={e => setSearchValue(e.detail.value || '')} >
                                <IonButton fill="clear" slot="end" aria-label="search">
                                    <IonIcon slot="icon-only" icon={searchOutline} aria-hidden="true"></IonIcon>
                                </IonButton>
                            </IonInput>
                        </IonItem>
                    </IonCard>
                </div>

                <div className="zoom-container">
                    <IonCard mode='ios' className='ion-padding zoom-container-card'> 
                    <IonButton onClick={() => managerRef.current?.zoomOut()} size={'small'} color={'light'}>
                        <IonIcon icon={removeOutline}></IonIcon>
                    </IonButton>
                    <IonButton  onClick={() => managerRef.current?.zoomIn()} size={'small'}  color={'light'}>
                         <IonIcon icon={addOutline}></IonIcon>
                    </IonButton>
                    
                    </IonCard>
                </div>

                <Dock
                    items={bottomDockItems}
                    panelHeight={64}
                    baseItemSize={50}
                    magnification={70}
                />
            </IonContent>

        </>
    );
}

export default MindMapper;