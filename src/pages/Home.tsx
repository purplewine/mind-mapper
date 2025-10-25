import { IonAvatar, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, useIonPopover } from '@ionic/react';

import './Home.css';
import MindMapper from '../components/CanvasContainer/CanvasContainer';
import GoogleLoginButton from '../components/signInButton/SignInButton';
import { useUserStore } from '../store/userStore';
import { ProfileMenu } from '../components/ProfileMenu/ProfileMenu';
import { Header } from '../components/Header/Header';
import ProjectList from '../components/ProjectList/ProjectList';



const Home: React.FC = () => {


 
  return (
    <IonPage>
      <IonContent fullscreen>
        <Header />
        <ProjectList />
      </IonContent>
    </IonPage>
  );
};

export default Home;
