// Common types for the remote control platform
// Message types enum
export var MessageType;
(function (MessageType) {
    MessageType["OFFER"] = "offer";
    MessageType["ANSWER"] = "answer";
    MessageType["ICE_CANDIDATE"] = "ice-candidate";
    MessageType["JOIN_ROOM"] = "join-room";
    MessageType["LEAVE_ROOM"] = "leave-room";
    MessageType["CONTROL_COMMAND"] = "control-command";
    // Host discovery messages
    MessageType["REGISTER_HOST"] = "register-host";
    MessageType["HOST_REGISTERED"] = "host-registered";
    MessageType["GET_HOSTS"] = "get-hosts";
    MessageType["HOSTS_LIST"] = "hosts-list";
    MessageType["CONNECT_TO_HOST"] = "connect-to-host";
    MessageType["HOST_CONNECTED"] = "host-connected";
})(MessageType || (MessageType = {}));
//# sourceMappingURL=index.js.map