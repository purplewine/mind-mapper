import { IonContent, IonItem, IonList } from "@ionic/react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useUserStore } from "../../store/userStore";

interface IProfileMenu {
    onDismiss: () => void
} 

export const ProfileMenu: React.FC<IProfileMenu> = ({ onDismiss }) => {
    const { user, isLoading, setUser, setLoading, setError, logout } = useUserStore();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            logout();
            onDismiss();
            
        } catch (error: any) {
            console.error('Logout error:', error);

        }
    };
    return (
        <IonContent className="ion-padding">
            <IonList lines="none">
                <IonItem onClick={handleSignOut}>
                    Sign Out
                </IonItem>
            </IonList>
        </IonContent>
    )
};