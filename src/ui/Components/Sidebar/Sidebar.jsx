import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MdOutlineAddBox } from "react-icons/md";
import { Button } from "@/Components/ui/button";

export const Sidebar = ({
  username,
  chatrooms,
  msgNotifs,
  currChatroom,
  setCurrChatroom,
  setAddNewChat,
}) => {
  return (
    <div className="flex-auto max-w-80 bg-green-600 text-white p-5 box-border overflow-y-auto h-full shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
      <div className="flex justify-between">
        <h3 className="mt-[0px] text-3xl font-bold">Chats</h3>
        <MdOutlineAddBox
          size={35}
          className="cursor-pointer"
          onClick={() => {
            setAddNewChat(true);
          }}
        />
      </div>
      <div className="mt-[5px]">
        {chatrooms == null || chatrooms.length == 0
          ? 'No chatrooms to show'
          : chatrooms.map((room) => (
            <Button
            variant={currChatroom === room ? "selected" : "inverse"}
            className={`w-full my-[10px] ${msgNotifs[room._id] ? "font-bold" : ""}`}
            key={room._id}
            onClick={() => {
                setCurrChatroom(room);
                setMsgNotifs((prev) => {
                return { ...prev, [room._id]: false };
                });
            }}
            >
            {room.name}
            </Button>

            ))}
      </div>
    </div>
  );
};
