import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useUserStore } from '../../store/userStore';
import { auth } from '../../firebase';
import { IonAvatar, IonButton } from '@ionic/react';


const GoogleLoginButton = () => {
  const { user, isLoading, setUser, setLoading, setError, logout } = useUserStore();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      };

      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to sign out');
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.photoURL && (
            <IonAvatar>

                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to initials if image fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
            </IonAvatar>
        )}
        {!user.photoURL && user.displayName && (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium">{user.displayName || user.email}</span>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <IonButton mode='ios' expand="block" size="large" onClick={handleGoogleSignIn} >
         {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </IonButton>   
    // <button
    //   onClick={handleGoogleSignIn}
    //   disabled={isLoading}
    //   className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    // >
     
    //   <span className="text-sm font-medium text-gray-700">
    //     {isLoading ? 'Signing in...' : 'Sign in with Google'}
    //   </span>
    // </button>
  );
};

export default GoogleLoginButton;