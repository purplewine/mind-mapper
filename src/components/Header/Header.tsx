import { IonHeader, IonToolbar, IonAvatar, IonTitle, IonButtons, useIonPopover } from "@ionic/react"
import { useUserStore } from "../../store/userStore";
import { ProfileMenu } from "../ProfileMenu/ProfileMenu";


export const Header = () => {
    const { user, isLoading, setUser, setLoading } = useUserStore();

     const [presentProfileMenu, dismissProfileMenu] = useIonPopover(ProfileMenu, {
        onDismiss: (data: any, role: string) => dismissProfileMenu(data, role),
      });
    
      function gotoHomePage() {
        window.location.replace('/')
      }
    
    return (
        <IonHeader>
        <IonToolbar color={'primary'}>
          <IonAvatar  className="cursor-pointer" onClick={() => gotoHomePage()} slot="start">
            <img style={{ padding: 10 }} alt="Mindmapper logo" src="/mindmap-logo.png" />
          </IonAvatar>

          <IonTitle  className="cursor-pointer" onClick={() => gotoHomePage()}>Mindmapper</IonTitle>
          <IonButtons className='' slot="end">
            {
              user && user.photoURL && (
                <IonAvatar className="cursor-pointer" onClick={(e: any) =>
                  presentProfileMenu({
                    mode: "ios",
                    event: e,
                    onDidDismiss: (e: CustomEvent) => console.log(`Popover dismissed with role: ${e.detail.role}`),
                  })
                }>
                  <img style={{ padding: 10 }} className="w-8 h-8 rounded-full"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous" src={user?.photoURL} alt="" />
                </IonAvatar>
              )
            }

          </IonButtons>
        </IonToolbar>
      </IonHeader>
    )
}