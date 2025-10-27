import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';


export interface IProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aiSummary?: {nodeId: number, summary: string}[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  jsonString: string;
}

interface ProjectState {
  projects: IProject[];
  isLoading: boolean;
  error: string | null;

  autoSaveTimeouts: Map<string, NodeJS.Timeout>,
  lastSavedData: Map<string, string>;
  unsubscribe: (() => void) | null;
  
  // Actions
  subscribeToProjects: (userId: string) => void;
  unsubscribeFromProjects: () => void;
  addProject: (userId: string, projectData: Omit<IProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProject: (projectId: string, projectData: any)=> Promise<void>;
  updateProjectWithDebounce: (projectId: string, projectData: Partial<Omit<IProject, 'id' | 'userId' | 'createdAt'>>, delay?: number) => void;
  deleteProject: (projectId: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  unsubscribe: null,
   autoSaveTimeouts: new Map(),
  lastSavedData: new Map(),


  subscribeToProjects: (userId: string) => {
    // Unsubscribe from previous listener if exists
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }

    set({ isLoading: true, error: null });

    try {
      const projectsRef = collection(db, 'projects');
      const q = query(
        projectsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribeFn = onSnapshot(
        q,
        (snapshot) => {
          const projectsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as IProject[];

          set({ projects: projectsData, isLoading: false, error: null });
        },
        (error) => {
          console.error('Error fetching projects:', error);
          set({ error: error.message, isLoading: false });
        }
      );

      set({ unsubscribe: unsubscribeFn });
    } catch (error: any) {
      console.error('Error setting up projects listener:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  unsubscribeFromProjects: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null, projects: [] });
    }
  },

  addProject: async (userId: string, projectData) => {
    set({ error: null });
    try {
      const projectsRef = collection(db, 'projects');
      const docRef = await addDoc(projectsRef, {
        ...projectData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding project:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateProject: async (projectId: string, projectData) => {
    set({ error: null });
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        ...projectData,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Error updating project:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateProjectWithDebounce: (projectId: string, projectData: any, delay = 1000) => {
    console.log('autosaving...');
    
    const { autoSaveTimeouts, lastSavedData, updateProject } = get();

    // Check if data has actually changed
    const newDataString = JSON.stringify(projectData);
    const lastSaved = lastSavedData.get(projectId);
    
    if (lastSaved === newDataString) {
      // No changes, skip update
      return;
    }

    // Clear existing timeout for this project
    const existingTimeout = autoSaveTimeouts.get(projectId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        await updateProject(projectId, projectData);
        // Update last saved data after successful save
        lastSavedData.set(projectId, newDataString);
        autoSaveTimeouts.delete(projectId);
        set({ 
          autoSaveTimeouts: new Map(autoSaveTimeouts),
          lastSavedData: new Map(lastSavedData)
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, delay);

    autoSaveTimeouts.set(projectId, timeoutId);
    set({ autoSaveTimeouts: new Map(autoSaveTimeouts) });
  },
  

  deleteProject: async (projectId: string) => {
    set({ error: null });
    try {
      const projectRef = doc(db, 'projects', projectId);
      await deleteDoc(projectRef);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      set({ error: error.message });
      throw error;
    }
  },

  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
}));