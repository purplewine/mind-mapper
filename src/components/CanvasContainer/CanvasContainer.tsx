// MindMapper.tsx
import React, { useState, useEffect, useRef } from 'react';
import Dock from './../Dock/Dock';
import { IonButton, IonButtons, IonIcon, IonPopover, IonTitle, IonToolbar, useIonAlert, useIonModal, useIonPopover, useIonToast } from '@ionic/react';
import './Canvas.css';
import { archiveOutline, downloadOutline, gitMergeOutline, handRightOutline, settingsOutline } from 'ionicons/icons';
import CanvasManager from '../../services/CanvasManager';
import NodeModal from './NodeModal';
import { Popover } from './Popover';
import { IProject } from '../../store/projectStore';

interface IMindMapper {
    project: IProject
}

const MindMapper: React.FC<IMindMapper> = ({ project }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const managerRef = useRef<CanvasManager | null>(null);

    const [currentProject, setCurrentProject] = useState<IProject>(project)

    useEffect(() => {
        setCurrentProject(project)
        console.log({ project });

    }, [project])

    const importFileInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [panMode, setPanMode] = useState<boolean>(false);
    const [presentNodeModal, dismissNodeModal] = useIonModal(NodeModal, {
        onClose: (data: string, role: string) => { dismissNodeModal(data, role); setSelectedNode(null); },
        nodeData: selectedNode,
        onSave: (updated: any) => {
            console.log({ updated });

            managerRef.current?.saveNodeDetails(updated);
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

    const aiControlClick = (e: any, node: any) => {
        console.log(e, node);
        console.log(popover.current);

        popoverBtnRef.current?.style.setProperty('position', 'absolute');
        popoverBtnRef.current!.style.setProperty('left', `${e.pageX}px`);
        popoverBtnRef.current!.style.setProperty('top', `${e.pageY}px`);
        popoverBtnRef.current!.click();

    }



    useEffect(() => {

        setTimeout(() => {

            if (!canvasRef.current) return;
            console.log('Canvas called');

            managerRef.current = new CanvasManager(canvasRef.current,
                onNodeDBClick,
                aiControlClick
            );
            managerRef.current?.addNode({ text: currentProject.name, description: (currentProject.description || '') });
            managerRef.current?.autoArrange();
            return () => {
                managerRef.current?.dispose();
                managerRef.current = null;
            };
        }, 100)


    }, []);


    return (

        <>

            <IonToolbar mode='ios' color={'light'}>
                <IonTitle>{currentProject?.name}</IonTitle>
                <IonButtons slot="end">
                    <input type="file" ref={importFileInputRef} id="importFile" accept=".json" style={{ display: "none" }} onChange={(e: any) => managerRef.current?.importFromFile(e)} />
                    <IonButton mode='ios' fill="solid" color={'primary'} onClick={() => {
                        importFileInputRef.current?.click();
                    }}>
                        <IonIcon slot="start" icon={gitMergeOutline}></IonIcon>
                        Import Json File
                    </IonButton>



                </IonButtons>
            </IonToolbar>

            <canvas ref={canvasRef} id="canvas" style={{ width: "100svw", height: "100svh" }} />


            <button ref={popoverBtnRef} onClick={openPopover}></button>
            <IonPopover size="auto" arrow={false} mode='ios' side="right" alignment="end" ref={popover} isOpen={popoverOpen} onDidDismiss={() => setPopoverOpen(false)}>
                <Popover />
            </IonPopover>

            <Dock
                items={bottomDockItems}
                panelHeight={64}
                baseItemSize={50}
                magnification={70}
            />
        </>
    );
}

export default MindMapper;