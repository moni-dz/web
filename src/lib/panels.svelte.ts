import { createContext } from 'svelte';

export class PanelState {
    active = $state<string | null>(null);
    focusHandler: ((id: string) => void) | null = null;

    focus(id: string) {
        this.focusHandler?.(id);
    }
}

export const [getPanelState, setPanelState] = createContext<PanelState>();
