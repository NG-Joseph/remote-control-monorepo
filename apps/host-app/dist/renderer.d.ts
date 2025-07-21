declare class HostAppUI {
    private selectedSourceId;
    private allowedKeys;
    private isConnected;
    private isInRoom;
    private isSharing;
    private readonly availableKeys;
    constructor();
    private initializeUI;
    private setupEventListeners;
    private setupElectronListeners;
    private loadScreenSources;
    private renderScreenSources;
    private selectScreenSource;
    private joinRoom;
    private leaveRoom;
    private stopScreenShare;
    private renderAllowedKeys;
    private toggleAllowedKey;
    private updateConnectionStatus;
    private updateRoomStatus;
    private updateShareStatus;
    private logActivity;
}
