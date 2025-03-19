import { useEffect } from "react";
import { toast } from "sonner";

export const ChatNotifications = ({
  socket,
  userId,
  currentChatroomId,
  chatrooms,
  unreadCounts,
  setUnreadCounts,
}) => {
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data.sender === userId) return;

      if (data.chatroom !== currentChatroomId) {
        setUnreadCounts((prev) => {
          const currentCount = Number(prev[data.chatroom]) || 0;
          const newCount = currentCount + 1;
          return { ...prev, [data.chatroom]: newCount };
        });

        const room = chatrooms.find((r) => r._id === data.chatroom);
        toast.info(`New message in ${room ? room.name : "chatroom"}`);
        window.electron.sysNoti("New Message", `New message from ${room ? room.name : "chatroom"}`);
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, userId, currentChatroomId, chatrooms]);

  useEffect(() => {
    async function updateBadge() {
      if (!unreadCounts) {
        window.electron.setBadgeNotiCount(0);
        return;
      }
  
      let notiCount = 0;
      for (let room in unreadCounts) {
        notiCount += unreadCounts[room];
      }
      await window.electron.setBadgeNotiCount(notiCount);
    }
    updateBadge();

  }, [unreadCounts])

  return null;
};
