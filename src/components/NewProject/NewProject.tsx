import { IonButton, IonButtons, IonCol, IonContent, IonGrid, IonIcon, IonInput, IonLabel, IonNote, IonRow, IonTextarea, IonTitle, IonToolbar, useIonToast } from "@ionic/react";
import { close } from "ionicons/icons";
import { FunctionComponent, useState } from "react";
import { useUserStore } from "../../store/userStore";
import { useProjectStore } from "../../store/projectStore";

interface NewProjectModalProps {
    onClose: () => void
}

const NewProjectModal: FunctionComponent<NewProjectModalProps> = ({ onClose }) => {
    const { user } = useUserStore();
    const {
        projects,
        isLoading,
        error,
        subscribeToProjects,
        unsubscribeFromProjects,
        addProject,
        updateProject,
        deleteProject
    } = useProjectStore();

    const [presentToast] = useIonToast();
    const [projectName, setProjectName] = useState('Untitled Project');
    const [projectDescription, setProjectDescription] = useState("");


    const handleOnSave = async () => {
        if (projectName === "") { 
            presentToast("Project Name is required!", 2000)
            return;
        }
        if (projectDescription === "") {
            presentToast("Project Description is required!", 2000)
            return;
        }
        if (!user) return;
        try {
            await addProject(user.uid, {
                name: projectName,
                description: projectDescription,
            });
            presentToast({
                message: "Project Created Successfully!",
                color: 'success'
            })
            onClose();
        } catch (error) {
            console.error('Failed to add project:', error);
        }

    }

    return (<>
        <IonToolbar color={'primary'}>
            <IonTitle>
                New Project
            </IonTitle>
            <IonButtons slot="end">
                <IonButton onClick={() => onClose()} >
                    <IonIcon icon={close}></IonIcon>
                </IonButton>
            </IonButtons>
        </IonToolbar>
        <IonContent className="ion-padding">

            <IonGrid>
                <IonRow>
                    <IonCol>
                        <IonLabel position="stacked">Project Name</IonLabel>
                        <IonInput fill="solid" value={projectName} placeholder="Enter Project Name" onIonChange={(e: any) => setProjectName(e.detail.value ?? "")} />
                    </IonCol>
                </IonRow>
                <IonRow>
                    <IonCol>
                        <IonLabel position="stacked">Project Description</IonLabel>
                        <IonTextarea
                            rows={10}
                            fill="solid"
                            value={projectDescription}
                            placeholder="Enter Project Description"
                            autoGrow={true}
                            onIonChange={(e) => setProjectDescription(e.detail.value ?? "")}
                        />

                    </IonCol>
                </IonRow>
                <IonNote>
                    The project name and description will be used as metadata to identify and manage project information within the workflow.
                </IonNote>
            </IonGrid>
            <IonButton mode="ios" onClick={handleOnSave} expand="block">Get Started!</IonButton>
        </IonContent>
    </>);
}

export default NewProjectModal;