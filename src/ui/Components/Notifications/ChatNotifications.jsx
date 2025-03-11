import { useEffect } from "react";
import { toast } from "sonner";

export const ChatNotifications = ({
  socket,
  userId,
  currentChatroomId,
  chatrooms = [],  
  setMsgNotifs,
}) => {
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.sender === userId) return;

      if (data.chatroom !== currentChatroomId) {
        
        const room = (chatrooms || []).find((r) => r && r._id === data.chatroom);
        const roomName = room ? room.name : "a chatroom";
        toast(`New message in ${roomName}`);

        setMsgNotifs((prev) => ({
          ...prev,
          [data.chatroom]: true,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, userId, currentChatroomId, chatrooms, setMsgNotifs]);

  return null;
};
