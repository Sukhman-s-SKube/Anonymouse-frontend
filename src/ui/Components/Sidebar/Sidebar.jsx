import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/Components/ui/button";

export const Sidebar = ({ username, chatrooms, msgNotifs, setCurrChatroom }) => {

    return(
        <div className="flex-auto max-w-80 bg-green-600 text-white p-5 box-border overflow-y-auto h-full shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
            <h3 className="mt-[0px] text-2xl text-center font-bold">Welcome {username}</h3>
            <div className="mt-[5px]">
                {chatrooms == null || chatrooms.length == 0 ? 'No chatrooms to show' : chatrooms.map((room) => (
                    <Button variant="inverse" className={`w-full my-[10px] ${msgNotifs[room._id] ? 'font-bold bg-yellow-500' : ''}`} key={room._id} onClick={() => {setCurrChatroom(room)}}>{room.name}</Button>
                ))}
            </div>
        </div>
    );
};