import React, { useState } from "react";
import { MdOutlineAddBox } from "react-icons/md";
import { Button } from "@/Components/ui/button";
import ConfirmModal from "../Chatroom/ConfirmModal";

const Spinner = () => (
  <div className="flex items-center justify-center py-4">
    <svg
      className="animate-spin h-6 w-6 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      ></path>
    </svg>
  </div>
);

export const Sidebar = ({
  username,
  chatrooms,
  loadingChatrooms,
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
  const [chatToDelete, setChatToDelete] = useState(null);

  const handleDeleteClick = (room) => {
    setChatToDelete(room);
  };

  const confirmDeletion = () => {
    if (typeof onDeleteChatroom === "function" && chatToDelete) {
      onDeleteChatroom(chatToDelete.id);
    }
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
            {loadingChatrooms ? (
              <Spinner />
            ) : !chatrooms || chatrooms.length === 0 ? (
              "No chatrooms to show"
            ) : (
              chatrooms.filter(Boolean).map((room, i) => {
                if (!room._id) {
                  console.warn("Skipping a chatroom with no _id:", room);
                  return null;
                }
                return (
                  <div key={room._id} className="flex items-center">
                    <Button
                      variant={currChatroom === room ? "selected" : "inverse"}
                      className="flex-1 my-[10px] text-base"
                      onClick={() => {
                        setCurrChatroom(room);
                        setMsgNotifs((prev) => ({
                          ...prev,
                          [room._id]: false,
                        }));
                      }}
                    >
                      {room.name ?? "Unnamed Chat"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="ml-2"
                      onClick={() =>
                        handleDeleteClick({
                          id: room._id,
                          name: room.name ?? "Unnamed Chat",
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      {chatToDelete && (
        <ConfirmModal
          message={`Are you sure you want to delete the chatroom "${chatToDelete.name}"? This will delete all messages for everyone.`}
          onConfirm={confirmDeletion}
          onCancel={cancelDeletion}
        />
      )}
    </div>
  );
};

