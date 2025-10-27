// src/NodeModal.tsx
import React, { useEffect, useRef, useState } from "react";
import type { JSX } from '@ionic/core/components';

import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonInput,
    IonTextarea,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonSelect,
    IonSelectOption,
} from "@ionic/react";
import { close as closeIcon, cloudUpload as uploadIcon } from "ionicons/icons";

type MediaFile = { name: string; url: string; type: string };

type NodeModalProps = {
    open: boolean;
    onClose: () => void;
    nodeData: any | null;
    onSave: (updated: any) => void;
};

export default function NodeModal({ onClose, nodeData, onSave }: NodeModalProps) {
    const [segment, setSegment] = useState<"text" | "notes" | "media" | "settings">("text");
    const [title, setTitle] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [nodeColor, setNodeColor] = useState<string>("red");
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

    const titleTextRef = useRef<HTMLIonTextareaElement>(null);

    useEffect(() => {
        if (nodeData) {
            setTitle(nodeData.title === "Untitled Node" ? "" : nodeData.title || "");
            setNotes(nodeData.notes || "");
            setMediaFiles(nodeData.media || []);
            setNodeColor(nodeData.color || "red");
        } else {
            setTitle("");
            setNotes("");
            setMediaFiles([]);
            setNodeColor("red");
        }
    }, [nodeData]);

    useEffect(() => {
        const setFocus = async () => {
            // Access the method directly on the ref's current value
            if (titleTextRef.current) {
                const element = await titleTextRef.current.getInputElement();
                element.focus();
            }
        };

        // Use a timeout to ensure the component is fully rendered
        setTimeout(setFocus, 150);
    }, []); // Run only once on mount

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        const readers = files.map(
            (f) =>
                new Promise<MediaFile>((res) => {
                    const r = new FileReader();
                    r.onload = (ev) => res({ name: f.name, url: ev.target?.result as string, type: f.type });
                    r.readAsDataURL(f);
                })
        );
        Promise.all(readers).then((arr) => setMediaFiles((m) => [...m, ...arr]));
        // Reset input value so same file can be uploaded again if needed
        if (e.target) e.target.value = "";
    }

    function handleSave() {
        onSave({ ...nodeData, title, notes, media: mediaFiles });
    }

    return (
        <>

            <IonHeader>
                <IonToolbar color={'light'}>
                    <IonTitle>{ title === "" ? "Untitled Node" : title.length > 20 ? `${title.slice(20, title.length)}...`: title }</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose}>
                            <IonIcon slot="icon-only" icon={closeIcon} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
                <IonToolbar color={'light'}>
                    <IonSegment color={'secondary'} value={segment} onIonChange={(e) => setSegment(e.detail.value as any)}>
                        <IonSegmentButton value="text">
                            <IonLabel>Text</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="notes">
                            <IonLabel>Notes</IonLabel>
                        </IonSegmentButton>
                        <IonSegmentButton value="media">
                            <IonLabel>Media</IonLabel>
                        </IonSegmentButton>
                        {/* <IonSegmentButton value="settings">
                            <IonLabel>Settings</IonLabel>
                        </IonSegmentButton> */}
                    </IonSegment>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                {segment === "text" && (
                    <IonGrid>
                        <IonRow>
                            <IonCol>
                                <IonLabel position="stacked">Node Title</IonLabel>
                                <IonTextarea
                                    autoFocus
                                    ref={titleTextRef}
                                    rows={10}
                                    fill="solid"
                                    value={title}
                                    placeholder="Enter node title"
                                    autoGrow={true}
                                    onIonChange={(e) => setTitle(e.detail.value ?? "")}
                                />
                                {/* <IonInput fill="solid"  value={title} placeholder="Enter node title" onIonChange={(e) => setTitle(e.detail.value ?? "")} /> */}
                            </IonCol>
                        </IonRow>
                    </IonGrid>
                )}

                {segment === "notes" && (
                    <IonGrid>
                        <IonRow>
                            <IonCol>
                                <IonLabel position="stacked">Notes</IonLabel>
                                <IonTextarea
                                    rows={10}
                                    fill="solid"
                                    value={notes}
                                    placeholder="Add notes..."
                                    autoGrow={true}
                                    onIonChange={(e) => setNotes(e.detail.value ?? "")}
                                />
                            </IonCol>
                        </IonRow>
                    </IonGrid>
                )}

                {segment === "media" && (
                    <>
                        <IonGrid>
                            <IonRow>
                                <IonCol>
                                    <IonButton color={'secondary'} expand="block" fill="outline" onClick={() => document.getElementById("node-media-input")?.click()}>
                                        <IonIcon slot="start" icon={uploadIcon} />
                                        Upload Media
                                    </IonButton>
                                    <input
                                        id="node-media-input"
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        style={{ display: "none" }}
                                        onChange={handleFileChange}
                                    />
                                </IonCol>
                            </IonRow>

                            <IonRow>
                                {mediaFiles.map((m, i) => (
                                    <IonCol size="4" key={i}>
                                        {m.type.startsWith("image/") ? (
                                            <IonImg src={m.url} alt={m.name} style={{ width: "100%", height: "auto", borderRadius: 6 }} />
                                        ) : (
                                            <video src={m.url} controls style={{ width: "100%", borderRadius: 6 }} />
                                        )}
                                    </IonCol>
                                ))}
                            </IonRow>
                        </IonGrid>
                    </>
                )}
                {segment === "settings" && (
                    <>
                        <IonGrid>
                            <IonRow>
                                <IonCol>
                                    <IonLabel>Additional settings can go here.</IonLabel>
                                </IonCol>
                            </IonRow>

                            <IonRow>
                                <IonCol>
                                    <IonLabel position="stacked">Node Color</IonLabel>
                                    <IonSelect value={nodeColor} onIonChange={(e) => setNodeColor(e.detail.value)}>
                                        <IonSelectOption value="red">Red</IonSelectOption>
                                        <IonSelectOption value="green">Green</IonSelectOption>
                                        <IonSelectOption value="blue">Blue</IonSelectOption>
                                    </IonSelect>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
                    </>
                )}
            </IonContent>

            <IonFooter>
                <IonToolbar>
                    <IonButtons slot="end" style={{ paddingRight: 12 }}>
                        <IonButton mode="ios" onClick={onClose}>Cancel</IonButton>
                        <IonButton mode="ios" color={'secondary'} onClick={handleSave}>
                            Save
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonFooter>
        </>

    );
}
