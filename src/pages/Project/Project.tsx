import { IonPage, IonContent } from "@ionic/react"
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

    useEffect(() => {
        if (user) {
            subscribeToProjects(user.uid);
        }

        return () => {
            unsubscribeFromProjects();
        };
    }, [user, subscribeToProjects, unsubscribeFromProjects]);


    useEffect(() => {
        console.log(projectId);
        
        const currentProject = projects.find(p => p.id === projectId)
        setCurrentProject(currentProject || null)
        console.log({currentProject});
    }, [projects])

    return (
        <IonPage>
            <IonContent fullscreen>
                <Header />
                {
                    currentProject && <MindMapper project={currentProject} />
                }

            </IonContent>
        </IonPage>
    )
}