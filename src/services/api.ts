import { auth } from "../firebase";
const API_URL = 'http://localhost:3000/api';

export const callSummarieAPI = async (textToElaborate: string) => {
    try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

        if (!token) {
            console.error('No authentication token available');
            return null;
        }

        const response = await fetch(`${API_URL}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text: textToElaborate })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Elaboration:', data.elaboration);
        return data;
    } catch (error) {
        console.error('Error calling protected API:', error);
        return null;
    }
};

export const createChildrenMindMap = async (textToElaborate: string) => {
    try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

        if (!token) {
            console.error('No authentication token available');
            return null;
        }

        const response = await fetch(`${API_URL}/createMindMap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text: textToElaborate })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Elaboration:', data.elaboration);
        return data;
    } catch (error) {
        console.error('Error calling protected API:', error);
        return null;
    }
};

