import React, { useState } from "react";
import { MdOutlineAddBox } from "react-icons/md";
import { Button } from "@/Components/ui/button";
import ConfirmModal from "../Chatroom/ConfirmModal";

export const Sidebar = ({
  username,
  chatrooms,
  msgNotifs,
  currChatroom,
  setCurrChatroom,
  setAddNewChat,
  isNewChatOpen,
  setMsgNotifs,
  darkMode,
  showContent,
  onDeleteChatroom, 
}) => {
  // State to track which chatroom is being considered for deletion.
  const [chatToDelete, setChatToDelete] = useState(null);

  const handleDeleteClick = (roomId) => {
    setChatToDelete(roomId);
  };

  const confirmDeletion = () => {
    onDeleteChatroom(chatToDelete);
    setChatToDelete(null);
  };

  const cancelDeletion = () => {
    setChatToDelete(null);
  };

  return (
    <div className="flex-auto max-w-80 bg-green-600 text-white p-5 box-border overflow-y-auto h-full shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
      {showContent && (
        <>
          <div className="flex justify-between">
            <h3 className="mt-[0px] text-3xl font-bold">Chats</h3>
            <MdOutlineAddBox
              size={35}
              className="cursor-pointer"
              onClick={() => setAddNewChat(true)}
            />
          </div>
          <div className="mt-[5px]">
            {chatrooms == null || chatrooms.length === 0
              ? 'No chatrooms to show'
              : chatrooms
                  // Exclude the chatroom that is pending deletion.
                  .filter((room) => room._id !== chatToDelete)
                  .map((room) => (
                    <div key={room._id} className="flex items-center">
                      <Button
                        variant={currChatroom === room ? "selected" : "inverse"}
                        className="flex-1 my-[10px] text-base"
                        onClick={() => {
                          setCurrChatroom(room);
                          setMsgNotifs((prev) => ({ ...prev, [room._id]: false }));
                        }}
                      >
                        {room.name}
                      </Button>
                      <Button
                        variant="destructive"
                        className="ml-2"
                        onClick={() => handleDeleteClick(room._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
          </div>
        </>
      )}
      {chatToDelete && (
        <ConfirmModal
          message="Are you sure you want to delete this chatroom? This will delete all messages for everyone."
          onConfirm={confirmDeletion}
          onCancel={cancelDeletion}
        />
      )}
    </div>
  );
};
