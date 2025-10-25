import { IonCard, IonContent, IonPage } from '@ionic/react';
import GoogleLoginButton from '../../components/signInButton/SignInButton';
import './Login.css'

const Login: React.FC = () => {
  return (
    <IonPage>
      <IonContent className="login-container ">
        <div className="login-card-container">

        <IonCard mode='ios' className='login-card ion-padding'>

        <div className="flex flex-col items-center justify-center h-full">
        <div className="login-logo-container">
            <img src="./mindmap-logo.png" alt="" />
        </div>
          <div className="text-center mb-8">
            <p className="text-center text-3xl font-bold mb-2">Welcome User!</p>
            {/* <p className="text-gray-600">Sign in to continue</p> */}
          </div>
          <GoogleLoginButton />
        </div>
        </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;