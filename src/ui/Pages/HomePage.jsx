import { Chatroom } from "@/Components/Chatroom/Chatroom"
import { Sidebar } from "@/Components/Sidebar/Sidebar"

export const HomePage = ({ loggedIn, username }) => {
    return(
        <div className="flex flex-row h-screen bg-slate-50 text-neutral-800 relative overflow-hidden">
            <Sidebar username={"john_doe1"} chatrooms={[
            {
                name: "General"
            },
            {
                name: "General 1"
            }
            ]}/>
            <Chatroom />
        </div>
    )
};