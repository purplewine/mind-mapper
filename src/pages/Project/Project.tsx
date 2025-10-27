import { IonPage, IonContent, useIonLoading } from "@ionic/react"
import MindMapper from "../../components/CanvasContainer/CanvasContainer"
import { Header } from "../../components/Header/Header"
import { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import { IProject, useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";


export const Project = () => {
    const { projectId } = useParams<any>();
    const { user } = useUserStore();
    const [currentProject, setCurrentProject] = useState<IProject | null>(null);
    const [presentLoading, dismissLoading] = useIonLoading();
    const {
        projects,
        isLoading,
        error,
        subscribeToProjects,
        unsubscribeFromProjects,
        updateProjectWithDebounce,
        addProject,
        updateProject,
        deleteProject
    } = useProjectStore();

    useEffect(() => {
        if (user) {
            subscribeToProjects(user.uid);
        }

        return () => {
            unsubscribeFromProjects();
        };
    }, [user, subscribeToProjects, unsubscribeFromProjects]);


    useEffect(() => {
        if(isLoading) {
            presentLoading({message : "Loading State...", mode:"ios"})
        } else {
            dismissLoading()
        }
    }, [isLoading])

    useEffect(() => {
        const currentProject = projects.find(p => p.id === projectId)
        setCurrentProject(currentProject || null)
        console.log({currentProject});
    }, [projects])

    

    return (
        <IonPage>
            {/* <IonContent fullscreen> */}
                <Header />
                {
                    currentProject && <MindMapper updateProjectWithDebounce={updateProjectWithDebounce} project={currentProject} />
                }

            {/* </IonContent> */}
        </IonPage>
    )
}