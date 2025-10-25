import { IonButton, IonContent, IonIcon, useIonModal } from "@ionic/react"

import './NoProject.css'
import { folderOpenOutline } from "ionicons/icons"
import NewProjectModal from "../NewProject/NewProject";
export const NoProject = () => {

    const [presentNewProjectModal, dismissNewProjectModal] = useIonModal(NewProjectModal, {
        onClose : () => { dismissNewProjectModal() }
    });

    function openNewProjectModal() {
        presentNewProjectModal()
    }
    return (
        <div className="no-project-container" >
            <img src="/undraw_file-manager_yics.svg" alt="" />
            <p>You don't have any projects yet.</p>
            <IonButton onClick={openNewProjectModal} mode="ios">Create New Project</IonButton>
        </div>
    )
}