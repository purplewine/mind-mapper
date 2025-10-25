import { IonContent, IonIcon, IonItem, IonLabel, IonList } from "@ionic/react";

import { airplane, wifi, bluetooth, call, documentTextOutline, shuffleOutline } from "ionicons/icons";

export const Popover = () => <IonContent>

     <IonList lines="none">
        <IonItem>
          <IonIcon aria-hidden="true" icon={documentTextOutline} slot="start"></IonIcon>
          <IonLabel>Summarize this node</IonLabel>
        </IonItem>
        <IonItem>
          <IonIcon aria-hidden="true" icon={shuffleOutline} slot="start"></IonIcon>
          <IonLabel>Create Sub Nodes</IonLabel>
        </IonItem>
        {/* <IonItem>
          <IonIcon aria-hidden="true" icon={bluetooth} slot="start"></IonIcon>
          <IonLabel>Bluetooth</IonLabel>
        </IonItem>
        <IonItem>
          <IonIcon aria-hidden="true" icon={call} slot="start"></IonIcon>
          <IonLabel>Cellular</IonLabel>
        </IonItem> */}
      </IonList>

</IonContent>;