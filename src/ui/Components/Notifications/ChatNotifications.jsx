import { useEffect } from "react";
import { toast } from "sonner";

export const ChatNotifications = ({
  socket,
  userId,
  currentChatroomId,
  chatrooms = [],
  setUnreadCounts
}) => {
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.sender === userId) return;
      // If the message belongs to a chatroom that is not currently open, update the count.
      if (data.chatroom !== currentChatroomId) {
        setUnreadCounts(prev => {
          const prevCount = prev[data.chatroom] || 0;
          let newCount = prevCount + 1;
          if (newCount >= 10) newCount = 10; // We'll display "9+" when count is 10 or more.
          return { ...prev, [data.chatroom]: newCount };
        });
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, userId, currentChatroomId, setUnreadCounts]);

  return null;
};
