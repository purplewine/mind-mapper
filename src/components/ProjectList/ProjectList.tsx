import { useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { useProjectStore } from '../../store/projectStore';
import { IonItem, IonLabel, IonList, useIonLoading, useIonModal } from '@ionic/react';
import { NoProject } from '../NoProject/NoProject';
import NewProjectModal from '../NewProject/NewProject';


const ProjectList: React.FC = () => {
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

    const [presentLoading, dismissLoading] = useIonLoading();
    
    useEffect(() => {
        if (user) {
            subscribeToProjects(user.uid);
        }

        return () => {
            unsubscribeFromProjects();
        };
    }, [user, subscribeToProjects, unsubscribeFromProjects]);

     const [presentNewProjectModal, dismissNewProjectModal] = useIonModal(NewProjectModal, {
        onClose : () => { dismissNewProjectModal() }
    });

    function openNewProjectModal() {
        presentNewProjectModal()
    }

    // const handleAddProject = async () => {
    //     if (!user) return;

    //     try {
    //         await addProject(user.uid, {
    //             name: 'New Project',
    //             description: 'Project description',
    //         });
    //     } catch (error) {
    //         console.error('Failed to add project:', error);
    //     }
    // };

    const handleUpdateProject = async (projectId: string) => {
        try {
            await updateProject(projectId, {
                name: 'Updated Project Name',
            });
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            await deleteProject(projectId);
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    };

    useEffect(() => {
        if(isLoading) {
            presentLoading({message : "Loading State...", mode:"ios"})
        } else {
            dismissLoading()
        }
    }, [isLoading])

    if (isLoading) return <div>Loading projects...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className='ion-padding'>
            <h2>Your Projects</h2>
            <hr />

            {
                projects.length === 0 && <>
                    <NoProject />
                </>
            }
            {
                projects.length > 0 && (
                    <>
                        <IonList >
                            <IonItem button onClick={openNewProjectModal}>
                                <IonLabel>Create New Project</IonLabel>
                            </IonItem>
                            {projects.map((project) => (

                                    <IonItem key={project.id} button detail={true} routerLink={`/project/${project.id}`}>
                                        <IonLabel>
                                            <h2> {project.name}</h2>
                                            <p>{project.description}</p>
                                        </IonLabel>
                                    </IonItem>

                            ))}
                        </IonList>

                    </>
                )
            }
            {/* <button onClick={handleAddProject}>Add Project</button>
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <button onClick={() => handleUpdateProject(project.id)}>Edit</button>
          <button onClick={() => handleDeleteProject(project.id)}>Delete</button>
        </div>
      ))} */}
        </div>
    );
};

export default ProjectList;